"""English wording for catalog entries, keyed by id. Subjects: "team" (plural), "player"."""

FILTERS: dict[str, dict[str, str]] = {
    "sub-freezing": {"any": "in sub-freezing games"},
    "hot": {"any": "in games above 85°F"},
    "windy": {"any": "with wind of 15+ mph"},
    "indoors": {"any": "indoors"},
    "outdoors": {"any": "outdoors"},
    "monday": {"any": "on Mondays"},
    "thursday": {"any": "on Thursdays"},
    "saturday": {"any": "on Saturdays"},
    "sunday": {"any": "on Sundays"},
    "primetime": {"any": "in prime time"},
    "early": {"any": "in early kickoffs"},
    "home": {"any": "at home"},
    "away": {"any": "on the road"},
    "division": {"any": "against division rivals"},
    "non-division": {"any": "outside the division"},
    "jersey-prime": {
        "team": "when their starting QB wears a prime number",
        "player": "while wearing a prime number",
    },
    "jersey-even": {
        "team": "when their starting QB wears an even number",
        "player": "while wearing an even number",
    },
    "jersey-odd": {
        "team": "when their starting QB wears an odd number",
        "player": "while wearing an odd number",
    },
    "jersey-double-digits": {
        "team": "when their starting QB wears a double-digit number",
        "player": "while wearing a double-digit number",
    },
    "playoffs": {"any": "in the playoffs"},
    "fourth-quarter": {"any": "in the fourth quarter"},
    "first-quarter": {"any": "in the first quarter"},
}

METRIC_LABELS: dict[str, str] = {
    "record": "win-loss record",
    "points-per-game": "points per game",
    "fourth-down": "4th-down conversion rate",
    "field-goals": "field goal percentage",
    "interceptions": "interceptions per game",
    "pass-tds": "passing touchdowns per game",
}


def filter_phrase(filter_id: str, subject_kind: str) -> str:
    entry = FILTERS[filter_id]
    return entry.get(subject_kind, entry.get("any", ""))
