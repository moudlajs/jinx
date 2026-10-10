import random

from jinx import gate, generate, query, render
from jinx.catalog import FILTERS, METRICS, SUBJECTS


def pick(con, metric, subject, filters, subject_key, seasons=(2019, 2023), direction="low"):
    combo = generate.Combo(
        METRICS[metric], SUBJECTS[subject], tuple(FILTERS[f] for f in filters), seasons
    )
    q = query.build(combo.metric, combo.subject, list(combo.filters), seasons)
    row = next(r for r in query.run(con, q) if r.subject == subject_key)
    cand = generate.Candidate(combo, row, q, query.value(combo.metric, row))
    return gate.Pick(cand, direction)


def text_of(con, p, seed=0):
    return render.render(p, render.subject_names(con), random.Random(seed))


def test_team_record_text(con):
    stat = text_of(con, pick(con, "record", "team", ["monday", "home"], "CHI"))
    assert stat["subject"] == {"kind": "team", "label": "the Bears"}
    n = stat["numbers"]["sampleSize"]
    assert stat["numbers"]["record"] == {"wins": 0, "losses": n}
    assert f"the Bears are 0–{n} on Mondays at home" in stat["text"].replace("The", "the")
    assert "2019" in stat["text"]


def test_player_text_uses_the_name_and_singular_verbs(con):
    stat = text_of(
        con, pick(con, "interceptions", "qb", ["thursday"], "00-0000001", direction="high")
    )
    assert stat["subject"] == {"kind": "player", "label": "Alpha Passer"}
    assert "Alpha Passer has thrown" in stat["text"]
    assert "just" not in stat["text"]


def test_low_percentages_say_just(con):
    stat = text_of(con, pick(con, "fourth-down", "team", ["home"], "GB"))
    assert "have converted just" in stat["text"]
    assert stat["numbers"]["percentage"] == 50


def test_jersey_wording_depends_on_subject(con):
    team = text_of(con, pick(con, "record", "team", ["jersey-prime"], "DET"))
    qb = text_of(con, pick(con, "record", "qb", ["jersey-prime"], "00-0000003"))
    assert "when their starting QB wears a prime number" in team["text"]
    assert "while wearing a prime number" in qb["text"]


def test_relocated_team_uses_the_current_nickname(con):
    stat = text_of(con, pick(con, "record", "team", ["home"], "LV", seasons=(1999, 2023)))
    assert stat["subject"]["label"] == "the Raiders"


def test_display_sql_inlines_the_bound_values(con):
    stat = text_of(con, pick(con, "record", "team", ["monday", "home"], "CHI"))
    assert "$" not in stat["query"]
    assert "BETWEEN 2019 AND 2023" in stat["query"]


def test_ids_are_stable_and_distinct(con):
    a = text_of(con, pick(con, "record", "team", ["monday", "home"], "CHI"))
    b = text_of(con, pick(con, "record", "team", ["monday", "home"], "CHI"), seed=5)
    c = text_of(con, pick(con, "record", "team", ["monday", "away"], "CHI"))
    assert a["id"] == b["id"] != c["id"]


def test_join_conditions():
    assert render.join_conditions(["a", "b"]) == "a b"
    assert render.join_conditions(["a", "b", "c"]) == "a, b and c"


def test_zero_counts_read_naturally(con):
    stat = text_of(con, pick(con, "interceptions", "team", ["monday"], "GB"))
    assert "have thrown no interceptions in" in stat["text"]
    assert "just" not in stat["text"]


def test_zero_of_n_reads_naturally(con):
    p = pick(con, "field-goals", "team", ["home"], "GB")
    row = query.Row("GB", 8, {"hits": 0})
    zero = gate.Pick(generate.Candidate(p.candidate.combo, row, p.candidate.sql_query, 0.0), "low")
    stat = text_of(con, zero)
    assert "have made none of 8 field goals (0%)" in stat["text"]


def test_points_per_game_has_no_event_count(con):
    stat = text_of(con, pick(con, "points-per-game", "team", ["home"], "GB"))
    assert "count" not in stat["numbers"]
    assert "points per game" in stat["text"]
