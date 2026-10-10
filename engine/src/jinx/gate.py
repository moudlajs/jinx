"""Quality gate: keep big-enough, extreme-enough results, one per query, no duplicates."""

import itertools
import logging
import random
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Literal

from jinx.catalog import Metric
from jinx.generate import Candidate

log = logging.getLogger("jinx.gate")

DEFAULT_MIN_SAMPLE = 8


@dataclass(frozen=True)
class Pick:
    candidate: Candidate
    direction: Literal["low", "high"]


def direction(metric: Metric, value: float) -> Literal["low", "high"] | None:
    if metric.low is not None and value <= metric.low:
        return "low"
    if metric.high is not None and value >= metric.high:
        return "high"
    return None


def dedupe_key(c: Candidate) -> tuple:
    """Same metric, subject and filters is the same stat, whatever the season window."""
    combo = c.combo
    return (combo.metric.id, combo.subject.id, c.row.subject, tuple(f.id for f in combo.filters))


def select(
    candidates: Iterable[Candidate], count: int, seed: int, min_sample: int = DEFAULT_MIN_SAMPLE
) -> list[Pick]:
    rng = random.Random(seed)
    picks: list[Pick] = []
    seen: set[tuple] = set()
    considered = 0
    for _, group in itertools.groupby(candidates, key=lambda c: c.combo.key):
        passing = []
        for c in group:
            considered += 1
            d = direction(c.combo.metric, c.value)
            if c.row.sample >= min_sample and d and dedupe_key(c) not in seen:
                passing.append(Pick(c, d))
        if not passing:
            continue
        pick = rng.choice(passing)
        seen.add(dedupe_key(pick.candidate))
        picks.append(pick)
        if len(picks) >= count:
            break
    log.info(
        "quality gate",
        extra={"considered": considered, "kept": len(picks), "wanted": count},
    )
    if len(picks) < count:
        log.warning("fewer stats than requested", extra={"kept": len(picks), "wanted": count})
    return picks
