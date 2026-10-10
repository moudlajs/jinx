import itertools
import random

from jinx import generate
from jinx.catalog import FILTERS

LATEST = 2023


def first(con, seed, n=30, min_sample=1):
    return list(itertools.islice(generate.candidates(con, LATEST, seed, min_sample, 200), n))


def test_same_seed_same_candidates(con):
    a = [(c.combo.key, c.row) for c in first(con, 42)]
    b = [(c.combo.key, c.row) for c in first(con, 42)]
    assert a == b
    assert a


def test_different_seeds_differ(con):
    assert [c.combo.key for c in first(con, 1)] != [c.combo.key for c in first(con, 2)]


def test_combos_are_well_formed():
    rng = random.Random(7)
    for _ in range(2000):
        combo = generate.random_combo(rng, LATEST)
        groups = [f.group for f in combo.filters]
        assert len(groups) in (2, 3)
        assert len(set(groups)) == len(groups)
        assert all(combo.metric.grain in f.grains for f in combo.filters)
        assert combo.subject.id in combo.metric.subjects
        assert combo.seasons[1] == LATEST
        assert combo.seasons[0] in generate.SEASON_STARTS


def test_season_starts_never_pass_the_latest_season():
    rng = random.Random(3)
    assert all(generate.random_combo(rng, 2004).seasons == (1999, 2004) for _ in range(200))


def test_no_combo_is_queried_twice(con):
    keys = [c.combo.key for c in generate.candidates(con, LATEST, 5, 1, 150)]
    # Rows of one combo are contiguous, so a key that comes back means a repeated query.
    runs = [k for k, _ in itertools.groupby(keys)]
    assert len(runs) == len(set(runs))


def test_max_queries_bounds_the_run(con, caplog):
    caplog.set_level("INFO", logger="jinx.generate")
    list(generate.candidates(con, LATEST, 9, 1, 25))
    assert caplog.records[-1].queries <= 25


def test_min_sample_is_respected(con):
    assert all(c.row.sample >= 6 for c in first(con, 11, n=50, min_sample=6))


def test_play_only_filters_appear_with_play_metrics():
    rng = random.Random(1)
    seen = set()
    for _ in range(3000):
        combo = generate.random_combo(rng, LATEST)
        seen.update(f.id for f in combo.filters)
    assert seen == set(FILTERS)
