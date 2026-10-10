"""Generation pipeline: load sources, generate candidates, gate, render, write."""

import logging
from dataclasses import dataclass
from pathlib import Path

import duckdb

from jinx import gate, generate, output, render, sources, views
from jinx.gate import DEFAULT_MIN_SAMPLE

log = logging.getLogger("jinx.pipeline")

QUERIES_PER_STAT = 20


@dataclass(frozen=True)
class Options:
    count: int
    seed: int
    out: Path
    data_dir: Path | None = None
    min_sample: int = DEFAULT_MIN_SAMPLE


def run(opts: Options) -> int:
    con = duckdb.connect()
    seasons = sources.load_all(con, sources.load_config(), opts.data_dir)
    views.create(con)
    cands = generate.candidates(
        con, seasons[-1], opts.seed, opts.min_sample, opts.count * QUERIES_PER_STAT
    )
    picks = gate.select(cands, opts.count, opts.seed, opts.min_sample)
    doc = output.document(render.render_all(con, picks, opts.seed), opts.seed)
    output.write(opts.out, doc)
    log.info("wrote stats", extra={"count": len(doc["stats"]), "out": str(opts.out)})
    return len(doc["stats"])
