import duckdb
import pytest

from jinx import sources
from jinx.errors import SchemaMismatchError, SourceError

CFG = sources.load_config(
    """
base = "https://example.test/dl"
first_season = 2000

[sources.games]
url = "{base}/games.parquet"
columns = ["game_id", "season", "result"]

[sources.pbp]
url = "{base}/pbp_{season}.parquet"
per_season = true
columns = ["game_id", "posteam"]
"""
)


def write(path, text):
    path.write_text(text.strip() + "\n")
    return path


def test_bundled_config_parses_and_names_every_source():
    cfg = sources.load_config()
    assert set(cfg.sources) == {"games", "rosters", "pbp", "teams"}
    assert cfg.base.startswith("https://github.com/nflverse/nflverse-data/releases/download")
    assert all(src.columns for src in cfg.sources.values())


def test_urls_expand_per_season():
    assert sources.urls(CFG, CFG.sources["games"], [2000, 2001]) == [
        "https://example.test/dl/games.parquet"
    ]
    assert sources.urls(CFG, CFG.sources["pbp"], [2000, 2001]) == [
        "https://example.test/dl/pbp_2000.parquet",
        "https://example.test/dl/pbp_2001.parquet",
    ]


def test_load_all_from_a_data_dir_keeps_only_declared_columns(tmp_path):
    write(
        tmp_path / "games.csv",
        "game_id,season,result,extra\ng1,1999,3,x\ng2,2000,-7,y\ng3,2001,,z",
    )
    write(tmp_path / "pbp.csv", "game_id,posteam,junk\ng2,CHI,1")
    con = duckdb.connect()
    seasons = sources.load_all(con, CFG, data_dir=tmp_path)
    assert seasons == [2000]  # 1999 is before first_season, 2001 has no result yet
    cols = [r[0] for r in con.execute("DESCRIBE games").fetchall()]
    assert cols == ["game_id", "season", "result"]


def test_missing_columns_fail_with_their_names(tmp_path):
    write(tmp_path / "games.csv", "game_id,season\ng1,2000")
    with pytest.raises(SchemaMismatchError, match="games is missing columns: result"):
        sources.load_all(duckdb.connect(), CFG, data_dir=tmp_path)


def test_missing_file_names_the_source(tmp_path):
    write(tmp_path / "games.csv", "game_id,season,result\ng1,2000,3")
    with pytest.raises(SourceError, match=r"source pbp: no pbp\.parquet or pbp\.csv"):
        sources.load_all(duckdb.connect(), CFG, data_dir=tmp_path)


def test_unreadable_file_is_a_source_error(tmp_path):
    (tmp_path / "games.parquet").write_bytes(b"not parquet")
    with pytest.raises(SourceError, match="source games: could not read"):
        sources.load_all(duckdb.connect(), CFG, data_dir=tmp_path)


def test_no_completed_games_is_a_source_error(tmp_path):
    write(tmp_path / "games.csv", "game_id,season,result\ng1,2000,")
    with pytest.raises(SourceError, match="no completed games"):
        sources.load_all(duckdb.connect(), CFG, data_dir=tmp_path)
