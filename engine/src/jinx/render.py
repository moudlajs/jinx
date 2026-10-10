"""Turns gate picks into schema-shaped Real stats with English text and the SQL that made them."""

import hashlib
import random

import duckdb

from jinx import wording
from jinx.gate import Pick
from jinx.query import Query

# Verb phrases per metric and direction; {n} is the sample, {k} hits/total, {pct} and {avg} values.
PHRASES: dict[str, dict[str, str]] = {
    "record": {"team": "are {record}", "player": "is {record} as a starter"},
    "points-per-game": {
        "team": "average {avg} points per game",
        "player": "averages {avg} points per game",
    },
    "fourth-down": {
        "team": "have converted {just}{k_of} of {n} fourth downs ({pct})",
    },
    "field-goals": {"team": "have made {just}{k_of} of {n} field goals ({pct})"},
    "interceptions": {
        "team": "have thrown {just}{k} {interceptions} in {n} games",
        "player": "has thrown {just}{k} {interceptions} in {n} games",
    },
    "pass-tds": {
        "team": "have thrown {just}{k} touchdown {passes} in {n} games",
        "player": "has thrown {just}{k} touchdown {passes} in {n} games",
    },
}
TEMPLATES = (
    "Since {since}, {subject} {metric} {conditions}.",
    "{Subject} {metric} {conditions} since {since}.",
)


def subject_names(con: duckdb.DuckDBPyConnection) -> dict[tuple[str, str], str]:
    names = {
        ("team", abbr): f"the {nick}"
        for abbr, nick in con.execute("SELECT team_abbr, team_nick FROM teams").fetchall()
    }
    qbs = con.execute(
        "SELECT qb_id, arg_max(qb_name, season) FROM team_games "
        "WHERE qb_id IS NOT NULL AND qb_name IS NOT NULL GROUP BY qb_id"
    ).fetchall()
    names |= {("qb", qb_id): name for qb_id, name in qbs}
    return names


def join_conditions(parts: list[str]) -> str:
    if len(parts) <= 2:
        return " ".join(parts)
    return f"{', '.join(parts[:-1])} and {parts[-1]}"


def display_sql(q: Query) -> str:
    """The query with its bound integers written in, for people to read (never executed)."""
    sql = q.sql
    for name in sorted(q.params, key=len, reverse=True):
        sql = sql.replace(f"${name}", str(int(q.params[name])))
    return sql


def _record(v: dict[str, int]) -> str:
    parts = [v["wins"], v["losses"]] + ([v["ties"]] if v["ties"] else [])
    return "–".join(map(str, parts))


def _pct(x: float) -> str:
    return f"{x:.0f}%" if x == int(x) else f"{x:.1f}%"


def render(pick: Pick, names: dict[tuple[str, str], str], rng: random.Random) -> dict:
    c = pick.candidate
    combo, row = c.combo, c.row
    kind = combo.subject.kind
    name = names.get((combo.subject.id, row.subject), row.subject)
    k = row.values.get("hits", row.values.get("total", 0))
    slots = {
        "record": _record(row.values) if "wins" in row.values else "",
        "avg": f"{c.value:.1f}",
        "pct": _pct(round(c.value, 1)),
        "k": "no" if k == 0 else str(k),
        "k_of": "none" if k == 0 else str(k),
        "n": str(row.sample),
        "just": "just " if pick.direction == "low" and k > 0 else "",
        "interceptions": "interception" if k == 1 else "interceptions",
        "passes": "pass" if k == 1 else "passes",
    }
    metric_text = PHRASES[combo.metric.id][kind].format(**slots)
    conditions = [{"id": f.id, "label": wording.filter_phrase(f.id, kind)} for f in combo.filters]
    text = rng.choice(TEMPLATES).format(
        since=combo.seasons[0],
        subject=name,
        Subject=name[0].upper() + name[1:],
        metric=metric_text,
        conditions=join_conditions([cond["label"] for cond in conditions]),
    )
    numbers: dict = {"sampleSize": row.sample}
    match combo.metric.kind:
        case "record":
            numbers["record"] = {"wins": row.values["wins"], "losses": row.values["losses"]}
            if row.values["ties"]:
                numbers["record"]["ties"] = row.values["ties"]
        case "percentage":
            numbers["percentage"] = round(c.value, 1)
            numbers["count"] = k
        case "rate" if combo.metric.id != "points-per-game":
            numbers["count"] = k
    key = f"{combo.key}|{row.subject}".encode()
    return {
        "id": "real-" + hashlib.sha1(key).hexdigest()[:12],
        "mode": "real",
        "text": text,
        "subject": {"kind": kind, "label": name},
        "conditions": conditions,
        "metric": {"id": combo.metric.id, "label": wording.METRIC_LABELS[combo.metric.id]},
        "numbers": numbers,
        "seasons": {"from": combo.seasons[0], "to": combo.seasons[1]},
        "query": display_sql(c.sql_query),
    }


def render_all(con: duckdb.DuckDBPyConnection, picks: list[Pick], seed: int) -> list[dict]:
    names = subject_names(con)
    rng = random.Random(seed)
    return [render(p, names, rng) for p in picks]
