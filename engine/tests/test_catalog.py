import itertools

import pytest

from jinx import catalog, query, wording
from jinx.catalog import FILTERS, METRICS, SUBJECTS

ALL = (1999, 2030)


def rows_by_subject(con, metric, subject, filters, seasons=ALL):
    q = query.build(METRICS[metric], SUBJECTS[subject], [FILTERS[f] for f in filters], seasons)
    return {r.subject: r for r in query.run(con, q)}


def test_team_games_has_two_rows_per_completed_game(con):
    (games,) = con.execute("SELECT count(*) FROM games WHERE result IS NOT NULL").fetchone()
    (rows,) = con.execute("SELECT count(*) FROM team_games").fetchone()
    assert rows == 2 * games


def test_relocated_franchise_is_one_team(con):
    teams = {t for (t,) in con.execute("SELECT DISTINCT team FROM team_games").fetchall()}
    assert teams == {"CHI", "GB", "DET", "MIN", "LV"}
    (oak,) = con.execute("SELECT count(*) FROM team_games WHERE team_abbr = 'OAK'").fetchone()
    assert oak > 0


def test_every_play_joins_its_team_game(con):
    (pbp,) = con.execute("SELECT count(*) FROM pbp").fetchone()
    (plays,) = con.execute("SELECT count(*) FROM plays").fetchone()
    assert plays == pbp


def test_qb_jersey_comes_from_the_roster(con):
    jerseys = con.execute("SELECT DISTINCT qb_jersey FROM team_games WHERE team = 'DET'").fetchall()
    assert jerseys == [(7,)]


def test_every_filter_metric_and_subject_combination_runs(con):
    for metric in METRICS.values():
        for f, subject in itertools.product(catalog.compatible_filters(metric), metric.subjects):
            q = query.build(metric, SUBJECTS[subject], [f], ALL)
            for row in query.run(con, q):
                assert row.sample >= 1
                assert query.value(metric, row) >= 0


def test_planted_chi_monday_record(con):
    chi = rows_by_subject(con, "record", "team", ["monday"])["CHI"]
    assert chi.values["wins"] == 0
    assert chi.values["losses"] == chi.sample
    assert query.value(METRICS["record"], chi) == 0


def test_planted_gb_home_freezing_record(con):
    gb = rows_by_subject(con, "record", "team", ["home", "sub-freezing"])["GB"]
    assert gb.values["wins"] == gb.sample


def test_planted_chi_thursday_interceptions_for_team_and_qb(con):
    team = rows_by_subject(con, "interceptions", "team", ["thursday"])["CHI"]
    qb = rows_by_subject(con, "interceptions", "qb", ["thursday"])["00-0000001"]
    assert query.value(METRICS["interceptions"], team) == 3
    assert query.value(METRICS["interceptions"], qb) == 3


def test_percentage_metrics(con):
    fourth = rows_by_subject(con, "fourth-down", "team", [])["GB"]
    fg = rows_by_subject(con, "field-goals", "team", [])["GB"]
    assert query.value(METRICS["fourth-down"], fourth) == 50
    assert query.value(METRICS["field-goals"], fg) == 50


def test_jersey_filter(con):
    prime = rows_by_subject(con, "record", "team", ["jersey-prime"])
    assert set(prime) == {"DET"}


def test_seasons_are_bound(con):
    rows = rows_by_subject(con, "record", "team", [], seasons=(2023, 2023))
    assert sum(r.sample for r in rows.values()) == 40


def test_min_sample_drops_small_groups(con):
    q = query.build(METRICS["record"], SUBJECTS["team"], [FILTERS["monday"]], ALL, min_sample=99)
    assert query.run(con, q) == []


def test_play_only_filter_is_rejected_for_game_metrics():
    with pytest.raises(ValueError, match="fourth-quarter"):
        query.build(METRICS["record"], SUBJECTS["team"], [FILTERS["fourth-quarter"]], ALL)


def test_unsupported_subject_is_rejected():
    with pytest.raises(ValueError, match="does not support subject qb"):
        query.build(METRICS["fourth-down"], SUBJECTS["qb"], [], ALL)


def test_every_entry_has_wording():
    assert set(wording.FILTERS) == set(FILTERS)
    assert set(wording.METRIC_LABELS) == set(METRICS)
    for f in FILTERS:
        for kind in ("team", "player"):
            assert wording.filter_phrase(f, kind)


def test_every_metric_declares_its_sources():
    for m in METRICS.values():
        assert "games" in m.sources
        assert ("pbp" in m.sources) == (m.grain == "play")
