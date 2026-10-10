import csv

from conftest import FIXTURES

from jinx import sources


def test_fixture_columns_match_the_bundled_config():
    for src in sources.load_config().sources.values():
        with open(FIXTURES / f"{src.name}.csv") as f:
            header = next(csv.reader(f))
        assert sorted(header) == sorted(src.columns), src.name


def test_fixtures_stay_small():
    assert sum(p.stat().st_size for p in FIXTURES.glob("*.csv")) < 500_000


def test_planted_chi_loses_every_monday_game(con):
    rows = con.execute("""
        SELECT (home_team = 'CHI' AND result > 0) OR (away_team = 'CHI' AND result < 0)
        FROM games WHERE weekday = 'Monday' AND 'CHI' IN (home_team, away_team)
    """).fetchall()
    assert rows
    assert not any(won for (won,) in rows)


def test_planted_gb_wins_home_games_below_freezing(con):
    rows = con.execute("SELECT result FROM games WHERE home_team = 'GB' AND temp < 32").fetchall()
    assert rows
    assert all(r > 0 for (r,) in rows)


def test_planted_chi_throws_three_ints_on_thursdays(con):
    rows = con.execute("""
        SELECT g.game_id, sum(p.interception) FROM games g JOIN pbp p USING (game_id)
        WHERE g.weekday = 'Thursday' AND p.posteam = 'CHI' GROUP BY 1
    """).fetchall()
    assert rows
    assert all(n == 3 for _, n in rows)


def test_unplayed_game_is_not_a_completed_season(con):
    assert sources.completed_seasons(con, 1999) == [2019, 2022, 2023]


def test_gamedays_are_real_dates(con):
    (bad,) = con.execute(
        "SELECT count(*) FROM games WHERE TRY_CAST(gameday AS DATE) IS NULL"
    ).fetchone()
    assert bad == 0
