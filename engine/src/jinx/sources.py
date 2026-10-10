"""Loads nflverse sources into DuckDB tables, checking the columns we rely on."""

import logging
import time
import tomllib
from dataclasses import dataclass
from importlib import resources
from pathlib import Path

import duckdb

from jinx.errors import SchemaMismatchError, SourceError

log = logging.getLogger("jinx.sources")


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    columns: tuple[str, ...]
    per_season: bool = False


@dataclass(frozen=True)
class Config:
    base: str
    first_season: int
    sources: dict[str, Source]


def load_config(text: str | None = None) -> Config:
    if text is None:
        text = resources.files("jinx").joinpath("sources.toml").read_text()
    raw = tomllib.loads(text)
    sources = {
        name: Source(name, s["url"], tuple(s["columns"]), s.get("per_season", False))
        for name, s in raw["sources"].items()
    }
    return Config(raw["base"], raw["first_season"], sources)


def urls(cfg: Config, src: Source, seasons: list[int]) -> list[str]:
    if not src.per_season:
        return [src.url.format(base=cfg.base)]
    return [src.url.format(base=cfg.base, season=s) for s in seasons]


def _reader(paths: list[str]) -> str:
    """Table function over the bound parameter $paths, so paths are never spliced into SQL."""
    if all(p.endswith(".csv") for p in paths):
        return "read_csv($paths, union_by_name=true, header=true)"
    return "read_parquet($paths, union_by_name=true)"


def _local(data_dir: Path, name: str) -> list[str]:
    for ext in ("parquet", "csv"):
        path = data_dir / f"{name}.{ext}"
        if path.exists():
            return [str(path)]
    raise SourceError(f"source {name}: no {name}.parquet or {name}.csv in {data_dir}")


def load_source(con: duckdb.DuckDBPyConnection, src: Source, paths: list[str]) -> int:
    start = time.monotonic()
    reader = _reader(paths)
    try:
        params = {"paths": paths}
        described = con.execute(f"DESCRIBE SELECT * FROM {reader}", params).fetchall()
        available = {row[0] for row in described}
        missing = [c for c in src.columns if c not in available]
        if missing:
            raise SchemaMismatchError(f"source {src.name} is missing columns: {', '.join(missing)}")
        cols = ", ".join(f'"{c}"' for c in src.columns)
        con.execute(f"CREATE OR REPLACE TABLE {src.name} AS SELECT {cols} FROM {reader}", params)
    except duckdb.Error as e:
        where = paths[0] if len(paths) == 1 else f"{paths[0]} … {paths[-1]} ({len(paths)} files)"
        raise SourceError(f"source {src.name}: could not read {where}: {e}") from e
    (rows,) = con.execute(f"SELECT count(*) FROM {src.name}").fetchone()
    log.info(
        "loaded source",
        extra={
            "source": src.name,
            "rows": rows,
            "files": len(paths),
            "seconds": round(time.monotonic() - start, 2),
        },
    )
    return rows


def completed_seasons(con: duckdb.DuckDBPyConnection, first: int) -> list[int]:
    rows = con.execute(
        "SELECT DISTINCT season FROM games WHERE result IS NOT NULL AND season >= ? ORDER BY 1",
        [first],
    ).fetchall()
    return [r[0] for r in rows]


def load_all(
    con: duckdb.DuckDBPyConnection, cfg: Config, data_dir: Path | None = None
) -> list[int]:
    """Loads every source; returns the seasons with completed games."""
    # The progress bar writes to stderr, which carries the JSON log lines.
    con.execute("SET enable_progress_bar = false")
    if data_dir is None:
        con.execute("INSTALL httpfs; LOAD httpfs;")

    def paths(src: Source, seasons: list[int]) -> list[str]:
        return _local(data_dir, src.name) if data_dir else urls(cfg, src, seasons)

    load_source(con, cfg.sources["games"], paths(cfg.sources["games"], []))
    seasons = completed_seasons(con, cfg.first_season)
    if not seasons:
        raise SourceError(f"source games has no completed games since {cfg.first_season}")
    for src in cfg.sources.values():
        if src.name != "games":
            load_source(con, src, paths(src, seasons))
    return seasons
