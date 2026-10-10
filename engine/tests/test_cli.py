import json

import pytest
from conftest import FIXTURES

from jinx import cli


def generate(tmp_path, *extra):
    out = tmp_path / "stats.json"
    args = ["generate", "--data-dir", str(FIXTURES), "--out", str(out), "--min-sample", "4"]
    return cli.main([*args, *extra]), out


def test_bad_usage_exits_2():
    with pytest.raises(SystemExit) as e:
        cli.main(["generate", "--count", "0"])
    assert e.value.code == 2


def test_missing_command_exits_2():
    with pytest.raises(SystemExit) as e:
        cli.main([])
    assert e.value.code == 2


def test_generate_writes_a_valid_reproducible_file(tmp_path):
    code, out = generate(tmp_path, "--count", "20", "--seed", "42")
    assert code == 0
    first = json.loads(out.read_text())
    assert 0 < len(first["stats"]) <= 20
    assert all(s["mode"] == "real" and s["query"] for s in first["stats"])

    code, out = generate(tmp_path, "--count", "20", "--seed", "42")
    second = json.loads(out.read_text())
    assert first["stats"] == second["stats"]


def test_empty_output_exits_1_and_writes_nothing(tmp_path, capsys):
    code, out = generate(tmp_path, "--min-sample", "9999", "--count", "5")
    assert code == 1
    line = json.loads(capsys.readouterr().err.strip().splitlines()[-1])
    assert line["level"] == "error"
    assert line["error"] == "EmptyOutputError"
    assert not out.exists()


def test_missing_data_dir_exits_1(tmp_path, capsys):
    code = cli.main(
        ["generate", "--data-dir", str(tmp_path / "nope"), "--out", str(tmp_path / "o")]
    )
    assert code == 1
    assert "SourceError" in capsys.readouterr().err
