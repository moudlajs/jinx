"""Seeded random combinations of metric, subject, filters and seasons, run as queries."""

import logging
import random
from collections.abc import Iterator
from dataclasses import dataclass

import duckdb

from jinx import query
from jinx.catalog import METRICS, SUBJECTS, Filter, Metric, Subject, compatible_filters

log = logging.getLogger("jinx.generate")

SEASON_STARTS = (1999, 2005, 2010, 2015, 2018, 2020)
FILTER_COUNTS = (2, 2, 3)


@dataclass(frozen=True)
class Combo:
    metric: Metric
    subject: Subject
    filters: tuple[Filter, ...]
    seasons: tuple[int, int]

    @property
    def key(self) -> tuple:
        return (self.metric.id, self.subject.id, tuple(f.id for f in self.filters), self.seasons)


@dataclass(frozen=True)
class Candidate:
    combo: Combo
    row: query.Row
    query: query.Query
    value: float


def random_combo(rng: random.Random, latest: int) -> Combo:
    metric = METRICS[rng.choice(sorted(METRICS))]
    subject = SUBJECTS[rng.choice(sorted(metric.subjects))]
    by_group: dict[str, list[Filter]] = {}
    for f in compatible_filters(metric):
        by_group.setdefault(f.group, []).append(f)
    groups = rng.sample(sorted(by_group), rng.choice(FILTER_COUNTS))
    filters = sorted((rng.choice(by_group[g]) for g in groups), key=lambda f: f.id)
    start = rng.choice([s for s in SEASON_STARTS if s <= latest])
    return Combo(metric, subject, tuple(filters), (start, latest))


def candidates(
    con: duckdb.DuckDBPyConnection, latest: int, seed: int, min_sample: int, max_queries: int
) -> Iterator[Candidate]:
    """Every row of every distinct random combo, in a reproducible order."""
    rng = random.Random(seed)
    seen: set[tuple] = set()
    queries = 0
    for _ in range(max_queries * 10):
        if queries >= max_queries:
            break
        combo = random_combo(rng, latest)
        if combo.key in seen:
            continue
        seen.add(combo.key)
        queries += 1
        q = query.build(combo.metric, combo.subject, list(combo.filters), combo.seasons, min_sample)
        for row in query.run(con, q):
            yield Candidate(combo, row, q, query.value(combo.metric, row))
    log.info("generation done", extra={"queries": queries})
