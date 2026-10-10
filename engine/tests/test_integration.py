import json

import pytest

from jinx import output, pipeline


@pytest.mark.slow
def test_real_nflverse_run(tmp_path):
    out = tmp_path / "stats.json"
    n = pipeline.run(pipeline.Options(count=60, seed=1, out=out))
    doc = json.loads(out.read_text())
    output.validate(doc)
    assert n == len(doc["stats"]) >= 50
    assert doc["seasons"]["from"] == 1999
    assert doc["seasons"]["to"] >= 2025
    assert {s["metric"]["id"] for s in doc["stats"]} >= {"record", "fourth-down"}
    assert {s["subject"]["kind"] for s in doc["stats"]} == {"team", "player"}
