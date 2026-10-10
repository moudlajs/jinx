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
