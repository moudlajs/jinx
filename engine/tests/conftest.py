from pathlib import Path

import duckdb
import pytest

from jinx import sources

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def fixture_db() -> duckdb.DuckDBPyConnection:
    """Fixture data loaded through the real loader, shared and read-only by convention."""
    con = duckdb.connect()
    sources.load_all(con, sources.load_config(), data_dir=FIXTURES)
    return con


@pytest.fixture
def con(fixture_db):
    """A cursor on the shared fixture DB, so tests can't leak temp state into each other."""
    return fixture_db.cursor()
