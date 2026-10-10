"""Views the catalog queries: one row per team per game, and one row per play with game context."""

import duckdb

# Relocated franchises count as one team; pbp also uses LAR in places.
FRANCHISE = "CASE {col} WHEN 'OAK' THEN 'LV' WHEN 'SD' THEN 'LAC' WHEN 'STL' THEN 'LA' \
WHEN 'LAR' THEN 'LA' ELSE {col} END"

TEAM_GAMES = f"""
CREATE OR REPLACE VIEW team_games AS
WITH done AS (SELECT * FROM games WHERE result IS NOT NULL),
sides AS (
    SELECT game_id, season, game_type, week, weekday, gametime, roof, surface, temp, wind,
           div_game, home_team AS team_abbr, true AS is_home,
           home_score AS points, away_score AS opp_points, home_qb_id AS qb_id,
           home_qb_name AS qb_name
    FROM done
    UNION ALL
    SELECT game_id, season, game_type, week, weekday, gametime, roof, surface, temp, wind,
           div_game, away_team, false, away_score, home_score, away_qb_id, away_qb_name
    FROM done
),
jerseys AS (
    SELECT season, gsis_id, min(TRY_CAST(jersey_number AS INTEGER)) AS jersey
    FROM rosters GROUP BY ALL
)
SELECT s.*, {FRANCHISE.format(col="s.team_abbr")} AS team, j.jersey AS qb_jersey
FROM sides s LEFT JOIN jerseys j ON j.season = s.season AND j.gsis_id = s.qb_id
"""

PLAYS = f"""
CREATE OR REPLACE VIEW plays AS
SELECT tg.*, p.qtr, p.down, p.play_type, p.fourth_down_converted, p.fourth_down_failed,
       p.interception, p.pass_touchdown, p.rush_touchdown, p.field_goal_result,
       p.passer_player_id
FROM pbp p
JOIN team_games tg ON tg.game_id = p.game_id
    AND tg.team = {FRANCHISE.format(col="p.posteam")}
"""


def create(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(TEAM_GAMES)
    con.execute(PLAYS)
