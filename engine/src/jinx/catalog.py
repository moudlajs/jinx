"""Declarative filters, metrics and subjects. SQL here is constant; only seasons are bound."""

from dataclasses import dataclass
from typing import Literal

Grain = Literal["game", "play"]
GRAIN_VIEW: dict[Grain, str] = {"game": "team_games", "play": "plays"}
GRAIN_SOURCES: dict[Grain, tuple[str, ...]] = {
    "game": ("games", "rosters"),
    "play": ("games", "rosters", "pbp"),
}

PRIMES = "(2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, \
83, 89, 97)"


@dataclass(frozen=True)
class Subject:
    id: str
    kind: Literal["team", "player"]
    key: str
    play_where: str = "true"


@dataclass(frozen=True)
class Filter:
    id: str
    group: str
    sql: str
    grains: frozenset[Grain] = frozenset({"game", "play"})


@dataclass(frozen=True)
class Metric:
    id: str
    kind: Literal["record", "percentage", "rate"]
    grain: Grain
    subjects: frozenset[str]
    aggregates: dict[str, str]
    sample: str
    where: str = "true"
    low: float | None = None
    high: float | None = None

    @property
    def sources(self) -> tuple[str, ...]:
        return GRAIN_SOURCES[self.grain]


SUBJECTS = {
    "team": Subject("team", "team", "team"),
    # A QB's plays are his own passes in games he started.
    "qb": Subject("qb", "player", "qb_id", play_where="passer_player_id = qb_id"),
}

FILTERS = {
    f.id: f
    for f in [
        Filter("sub-freezing", "weather", "temp <= 32"),
        Filter("hot", "weather", "temp >= 85"),
        Filter("windy", "weather", "wind >= 15"),
        Filter("indoors", "roof", "roof IN ('dome', 'closed')"),
        Filter("outdoors", "roof", "roof = 'outdoors'"),
        Filter("monday", "day", "weekday = 'Monday'"),
        Filter("thursday", "day", "weekday = 'Thursday'"),
        Filter("saturday", "day", "weekday = 'Saturday'"),
        Filter("sunday", "day", "weekday = 'Sunday'"),
        Filter("primetime", "kickoff", "gametime >= '20:00'"),
        Filter("early", "kickoff", "gametime < '14:00'"),
        Filter("home", "venue", "is_home"),
        Filter("away", "venue", "NOT is_home"),
        Filter("division", "opponent", "div_game = 1"),
        Filter("non-division", "opponent", "div_game = 0"),
        Filter("jersey-prime", "jersey", f"qb_jersey IN {PRIMES}"),
        Filter("jersey-even", "jersey", "qb_jersey % 2 = 0"),
        Filter("jersey-odd", "jersey", "qb_jersey % 2 = 1"),
        Filter("jersey-double-digits", "jersey", "qb_jersey >= 10"),
        Filter("playoffs", "season-type", "game_type <> 'REG'"),
        Filter("fourth-quarter", "quarter", "qtr = 4", frozenset({"play"})),
        Filter("first-quarter", "quarter", "qtr = 1", frozenset({"play"})),
    ]
}

METRICS = {
    m.id: m
    for m in [
        Metric(
            "record",
            "record",
            "game",
            frozenset({"team", "qb"}),
            {
                "wins": "count(*) FILTER (WHERE points > opp_points)",
                "losses": "count(*) FILTER (WHERE points < opp_points)",
                "ties": "count(*) FILTER (WHERE points = opp_points)",
            },
            sample="count(*)",
            low=0.2,
            high=0.8,
        ),
        Metric(
            "points-per-game",
            "rate",
            "game",
            frozenset({"team", "qb"}),
            {"total": "sum(points)"},
            sample="count(*)",
            low=13,
            high=31,
        ),
        Metric(
            "fourth-down",
            "percentage",
            "play",
            frozenset({"team"}),
            {"hits": "sum(fourth_down_converted)"},
            sample="count(*)",
            where="down = 4 AND play_type IN ('pass', 'run')",
            low=25,
            high=75,
        ),
        Metric(
            "field-goals",
            "percentage",
            "play",
            frozenset({"team"}),
            {"hits": "count(*) FILTER (WHERE field_goal_result = 'made')"},
            sample="count(*)",
            where="play_type = 'field_goal'",
            low=65,
            high=100,
        ),
        Metric(
            "interceptions",
            "rate",
            "play",
            frozenset({"team", "qb"}),
            {"total": "sum(interception)"},
            sample="count(DISTINCT game_id)",
            where="play_type = 'pass'",
            low=0.15,
            high=2.0,
        ),
        Metric(
            "pass-tds",
            "rate",
            "play",
            frozenset({"team", "qb"}),
            {"total": "sum(pass_touchdown)"},
            sample="count(DISTINCT game_id)",
            where="play_type = 'pass'",
            low=0.4,
            high=2.8,
        ),
    ]
}


def compatible_filters(metric: Metric) -> list[Filter]:
    return [f for f in FILTERS.values() if metric.grain in f.grains]
