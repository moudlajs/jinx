import json

import pytest

from jinx import cli


def test_bad_usage_exits_2(capsys):
    with pytest.raises(SystemExit) as e:
        cli.main(["generate", "--count", "0"])
    assert e.value.code == 2


def test_missing_command_exits_2():
    with pytest.raises(SystemExit) as e:
        cli.main([])
    assert e.value.code == 2


def test_empty_output_exits_1_with_a_json_log_line(tmp_path, capsys):
    code = cli.main(["generate", "--out", str(tmp_path / "stats.json")])
    assert code == 1
    line = json.loads(capsys.readouterr().err.strip().splitlines()[-1])
    assert line["level"] == "error"
    assert line["error"] == "EmptyOutputError"
    assert "nothing written" in line["event"]
    assert not (tmp_path / "stats.json").exists()
