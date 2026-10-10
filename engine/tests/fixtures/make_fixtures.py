"""Writes the fixture CSVs: a tiny made-up league with real nflverse column names.

Run `uv run python tests/fixtures/make_fixtures.py` from engine/ after changing it.
Patterns are planted on purpose so tests can assert on them: CHI loses every
Monday game, GB wins every home game below freezing, CHI throws 3 INTs in
every Thursday game. OAK (2019) and LV (2022+) are the same franchise.
"""

import csv
import itertools
from pathlib import Path

OUT = Path(__file__).parent
SEASONS = [2019, 2022, 2023]
QBS = {  # team: (gsis_id, name, jersey)
    "CHI": ("00-0000001", "Alpha Passer", 9),
    "GB": ("00-0000002", "Bravo Passer", 12),
    "DET": ("00-0000003", "Charlie Passer", 7),
    "MIN": ("00-0000004", "Delta Passer", 8),
    "LV": ("00-0000005", "Echo Passer", 4),
}
DOME = {"DET", "MIN"}
NORTH = {"CHI", "GB", "DET", "MIN"}
WEEKDAYS = ["Sunday", "Sunday", "Monday", "Sunday", "Thursday", "Sunday", "Saturday"]
TIMES = {"Monday": "20:15", "Thursday": "20:15", "Saturday": "16:30"}
SUNDAY_TIMES = ["13:00", "16:25", "20:20"]


def abbr(team: str, season: int) -> str:
    return "OAK" if team == "LV" and season < 2020 else team


def roof(home: str, season: int) -> str:
    return "dome" if home in DOME or (home == "LV" and season >= 2020) else "outdoors"


def games():
    rows, n = [], 0
    for season in SEASONS:
        pairs = list(itertools.permutations(QBS, 2))
        for week, (home, away) in enumerate(pairs, start=1):
            weekday = WEEKDAYS[n % len(WEEKDAYS)]
            gametime = TIMES.get(weekday, SUNDAY_TIMES[n % 3])
            r = roof(home, season)
            temp = None if r == "dome" else [22, 28, 35, 48, 61, 75][n % 6]
            wind = None if r == "dome" else [3, 8, 12, 16, 21][n % 5]
            home_score, away_score = 20 + (n * 7) % 15, 17 + (n * 5) % 17
            if weekday == "Monday" and "CHI" in (home, away):
                home_score, away_score = (10, 27) if home == "CHI" else (27, 10)
            if home == "GB" and temp is not None and temp < 32:
                home_score, away_score = 31, 6
            if home_score == away_score:
                home_score += 3
            rows.append(
                {
                    "game_id": f"{season}_{week:02d}_{abbr(away, season)}_{abbr(home, season)}",
                    "season": season,
                    "game_type": "REG",
                    "week": week,
                    "gameday": f"{season}-{9 + week // 5:02d}-{1 + (week * 3) % 28:02d}",
                    "weekday": weekday,
                    "gametime": gametime,
                    "away_team": abbr(away, season),
                    "home_team": abbr(home, season),
                    "away_score": away_score,
                    "home_score": home_score,
                    "result": home_score - away_score,
                    "div_game": int(home in NORTH and away in NORTH),
                    "roof": r,
                    "surface": "grass" if r == "outdoors" else "fieldturf",
                    "temp": temp,
                    "wind": wind,
                    "away_qb_id": QBS[away][0],
                    "home_qb_id": QBS[home][0],
                    "away_qb_name": QBS[away][1],
                    "home_qb_name": QBS[home][1],
                }
            )
            n += 1
    # One unplayed game: completed_seasons and every metric must ignore it.
    future = dict(
        rows[-1],
        game_id="2024_01_GB_CHI",
        season=2024,
        week=1,
        away_score=None,
        home_score=None,
        result=None,
    )
    return [*rows, future]


def plays(game_rows):
    rows = []
    for g in game_rows:
        if g["result"] is None:
            continue
        for side, team in (("home", g["home_team"]), ("away", g["away_team"])):
            opp = g["away_team"] if side == "home" else g["home_team"]
            ints = 3 if team == "CHI" and g["weekday"] == "Thursday" else 0
            seq = [
                ("pass", 1, 1, None),
                ("run", 1, 2, None),
                ("pass", 2, 1, None),
                ("run", 3, 3, None),
                ("pass", 4, 4, "conv"),
                ("run", 4, 4, "fail"),
                ("field_goal", 4, 2, "made"),
                ("field_goal", 4, 4, "missed"),
                ("pass", 1, 4, "td"),
            ]
            seq += [("pass", 2, 3, "int")] * ints
            for i, (ptype, down, qtr, tag) in enumerate(seq):
                rows.append(
                    {
                        "game_id": g["game_id"],
                        "season": g["season"],
                        "posteam": team,
                        "defteam": opp,
                        "qtr": qtr,
                        "down": down,
                        "play_type": ptype,
                        "fourth_down_converted": int(tag == "conv") if down == 4 else 0,
                        "fourth_down_failed": int(tag == "fail") if down == 4 else 0,
                        "interception": int(tag == "int"),
                        "pass_touchdown": int(tag == "td"),
                        "rush_touchdown": 0,
                        "field_goal_result": tag if ptype == "field_goal" else None,
                        "passer_player_id": g[f"{side}_qb_id"] if ptype == "pass" else None,
                        "play_id": i,
                    }
                )
    for r in rows:
        del r["play_id"]
    return rows


def rosters():
    rows = []
    for season, (team, (gsis, name, jersey)) in itertools.product(SEASONS, QBS.items()):
        rows.append(
            {
                "season": season,
                "gsis_id": gsis,
                "jersey_number": jersey,
                "position": "QB",
                "full_name": name,
            }
        )
        rows.append(
            {
                "season": season,
                "gsis_id": f"00-01{len(rows):05d}",
                "jersey_number": 3,
                "position": "K",
                "full_name": f"{team} Kicker",
            }
        )
    return rows


TEAMS = [
    ("CHI", "Chicago Bears", "Bears"),
    ("GB", "Green Bay Packers", "Packers"),
    ("DET", "Detroit Lions", "Lions"),
    ("MIN", "Minnesota Vikings", "Vikings"),
    ("LV", "Las Vegas Raiders", "Raiders"),
    ("OAK", "Oakland Raiders", "Raiders"),
]


def write(name, rows):
    with open(OUT / f"{name}.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    g = games()
    write("games", g)
    write("pbp", plays(g))
    write("rosters", rosters())
    write(
        "teams", [dict(zip(["team_abbr", "team_name", "team_nick"], t, strict=True)) for t in TEAMS]
    )
