import random

import pytest

from jinx import gate, generate, query
from jinx.catalog import FILTERS, METRICS, SUBJECTS

RECORD = METRICS["record"]


def cand(subject="CHI", sample=10, wins=0, filters=("monday", "home"), seasons=(1999, 2023)):
    combo = generate.Combo(RECORD, SUBJECTS["team"], tuple(FILTERS[f] for f in filters), seasons)
    row = query.Row(subject, sample, {"wins": wins, "losses": sample - wins, "ties": 0})
    q = query.Query("select 1", {})
    return generate.Candidate(combo, row, q, query.value(RECORD, row))


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0.0, "low"),
        (0.2, "low"),
        (0.21, None),
        (0.5, None),
        (0.79, None),
        (0.8, "high"),
        (1, "high"),
    ],
)
def test_direction_boundaries(value, expected):
    assert gate.direction(RECORD, value) == expected


def test_min_sample_boundary():
    assert gate.select([cand(sample=8)], 5, seed=1, min_sample=8)
    assert gate.select([cand(sample=7)], 5, seed=1, min_sample=8) == []


def test_unremarkable_values_are_dropped():
    assert gate.select([cand(wins=5)], 5, seed=1) == []


def test_one_pick_per_combo():
    picks = gate.select([cand("CHI"), cand("GB"), cand("DET")], 5, seed=1)
    assert len(picks) == 1


def test_duplicates_across_season_windows_are_dropped():
    a = cand(seasons=(1999, 2023))
    b = cand(seasons=(2010, 2023))
    assert len(gate.select([a, b], 5, seed=1)) == 1


def test_filter_order_does_not_make_a_new_stat():
    # Combos sort their filters, so the same set always has the same key.
    combo = generate.random_combo(random.Random(4), 2023)
    assert [f.id for f in combo.filters] == sorted(f.id for f in combo.filters)


def test_stops_at_count():
    cands = [cand(subject=s, filters=f) for s in ("CHI", "GB") for f in (("monday",), ("home",))]
    assert len(gate.select(cands, 2, seed=1)) == 2


def test_selection_is_seeded():
    cands = [cand("CHI"), cand("GB"), cand("DET"), cand("MIN")]
    picks = [gate.select(cands, 1, seed=s)[0].candidate.row.subject for s in range(20)]
    assert picks == [gate.select(cands, 1, seed=s)[0].candidate.row.subject for s in range(20)]
    assert len(set(picks)) > 1


def test_fixture_run_finds_the_planted_patterns(con):
    cands = generate.candidates(con, 2023, seed=3, min_sample=1, max_queries=2000)
    picks = gate.select(cands, 500, seed=3, min_sample=4)
    assert picks
    for p in picks:
        assert p.candidate.row.sample >= 4
        assert gate.direction(p.candidate.combo.metric, p.candidate.value) == p.direction
    assert len({gate.dedupe_key(p.candidate) for p in picks}) == len(picks)


def test_no_subject_fills_more_than_its_share():
    filters = [("monday",), ("home",), ("away",), ("sunday",), ("thursday",)]
    cands = [cand("CHI", filters=f) for f in filters]
    assert len(gate.select(cands, 10, seed=1)) == 3  # cap is max(3, 4% of 10)
