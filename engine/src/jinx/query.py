"""Builds one GROUP BY query per (metric, subject, filters, seasons) and reads its rows."""

from dataclasses import dataclass

import duckdb

from jinx.catalog import GRAIN_VIEW, Filter, Metric, Subject


@dataclass(frozen=True)
class Query:
    sql: str
    params: dict[str, int]


@dataclass(frozen=True)
class Row:
    subject: str
    sample: int
    values: dict[str, int]


def build(
    metric: Metric,
    subject: Subject,
    filters: list[Filter],
    seasons: tuple[int, int],
    min_sample: int = 1,
) -> Query:
    if subject.id not in metric.subjects:
        raise ValueError(f"metric {metric.id} does not support subject {subject.id}")
    for f in filters:
        if metric.grain not in f.grains:
            raise ValueError(f"filter {f.id} does not apply at {metric.grain} grain")
    where = ["season BETWEEN $season_from AND $season_to", metric.where]
    if metric.grain == "play":
        where.append(subject.play_where)
    where += [f.sql for f in filters]
    cols = ",\n       ".join(f"{sql} AS {name}" for name, sql in metric.aggregates.items())
    sql = (
        f"SELECT {subject.key} AS subject,\n       {metric.sample} AS sample,\n       {cols}\n"
        f"FROM {GRAIN_VIEW[metric.grain]}\n"
        f"WHERE " + "\n  AND ".join(f"({w})" for w in where) + "\n"
        f"GROUP BY {subject.key}\n"
        f"HAVING {metric.sample} >= $min_sample\n"
        f"ORDER BY {subject.key}"
    )
    params = {"season_from": seasons[0], "season_to": seasons[1], "min_sample": min_sample}
    return Query(sql, params)


def run(con: duckdb.DuckDBPyConnection, q: Query) -> list[Row]:
    cur = con.execute(q.sql, q.params)
    names = [d[0] for d in cur.description]
    rows = []
    for rec in cur.fetchall():
        rec = dict(zip(names, rec, strict=True))
        if rec["subject"] is None:
            continue
        subject, sample = rec.pop("subject"), rec.pop("sample")
        rows.append(Row(subject, int(sample), {k: int(v or 0) for k, v in rec.items()}))
    return rows


def value(metric: Metric, row: Row) -> float:
    """The number the quality gate compares with the metric's thresholds."""
    v = row.values
    match metric.kind:
        case "record":
            return (v["wins"] + 0.5 * v["ties"]) / row.sample
        case "percentage":
            return 100 * v["hits"] / row.sample
        case "rate":
            return v["total"] / row.sample
