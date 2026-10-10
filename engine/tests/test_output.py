import json
from datetime import UTC, datetime

import pytest

from jinx import output
from jinx.errors import EmptyOutputError

STAT = {
    "id": "real-abc",
    "mode": "real",
    "text": "Since 2010, the Bears are 0–9 on Mondays at home.",
    "subject": {"kind": "team", "label": "the Bears"},
    "conditions": [{"id": "monday", "label": "on Mondays"}],
    "metric": {"id": "record", "label": "win-loss record"},
    "numbers": {"sampleSize": 9, "record": {"wins": 0, "losses": 9}},
    "seasons": {"from": 2010, "to": 2025},
    "query": "SELECT 1",
}
NOW = datetime(2026, 10, 13, 6, 0, tzinfo=UTC)


def test_document_and_write(tmp_path):
    doc = output.document([STAT], seed=7, now=NOW)
    assert doc["seasons"] == {"from": 2010, "to": 2025}
    assert doc["generatedAt"] == "2026-10-13T06:00:00+00:00"
    path = tmp_path / "nested" / "stats.json"
    output.write(path, doc)
    assert json.loads(path.read_text()) == doc
    assert list(path.parent.iterdir()) == [path]
    assert path.stat().st_mode & 0o777 == 0o644


def test_empty_document_is_an_error():
    with pytest.raises(EmptyOutputError):
        output.document([], seed=1)


def test_schema_violation_names_the_path(tmp_path):
    doc = output.document([{**STAT, "mode": "fake"}], seed=1, now=NOW)
    with pytest.raises(output.InvalidOutputError, match="stats/0"):
        output.write(tmp_path / "stats.json", doc)
    assert not (tmp_path / "stats.json").exists()


def test_seasons_must_be_ordered():
    doc = output.document([{**STAT, "seasons": {"from": 2025, "to": 2010}}], seed=1, now=NOW)
    with pytest.raises(output.InvalidOutputError, match=r"seasons\.from is after seasons\.to"):
        output.validate(doc)
