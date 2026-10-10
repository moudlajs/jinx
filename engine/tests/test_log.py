import json
import logging

from jinx import log as jinx_log


def test_json_lines_carry_extra_fields(capsys):
    jinx_log.setup()
    logging.getLogger("jinx.test").info("loaded", extra={"source": "games", "rows": 3})
    entry = json.loads(capsys.readouterr().err)
    assert entry["event"] == "loaded"
    assert entry["level"] == "info"
    assert entry["source"] == "games"
    assert entry["rows"] == 3
    assert entry["ts"].endswith("+00:00")


def test_extra_fields_cannot_overwrite_standard_keys(capsys):
    jinx_log.setup()
    logging.getLogger("jinx.test").warning("real", extra={"level": "fake", "event": "fake"})
    entry = json.loads(capsys.readouterr().err)
    assert entry["level"] == "warning"
    assert entry["event"] == "real"
