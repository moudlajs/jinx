"""Generation pipeline: load sources, generate candidates, gate, render, write."""

import logging
from dataclasses import dataclass
from pathlib import Path

from jinx.errors import EmptyOutputError
from jinx.gate import DEFAULT_MIN_SAMPLE

log = logging.getLogger("jinx.pipeline")


@dataclass(frozen=True)
class Options:
    count: int
    seed: int
    out: Path
    data_dir: Path | None = None
    min_sample: int = DEFAULT_MIN_SAMPLE


def run(opts: Options) -> int:
    stats: list[dict] = []
    if not stats:
        raise EmptyOutputError("no stat passed the quality gate; nothing written")
    log.info("wrote stats", extra={"count": len(stats), "out": str(opts.out)})
    return len(stats)
