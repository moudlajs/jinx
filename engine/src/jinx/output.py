"""Validates stats against schema/ and writes stats.json atomically."""

import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from jinx.errors import EmptyOutputError, JinxError

SCHEMA_DIR = Path(__file__).resolve().parents[3] / "schema"
ATTRIBUTION = "Data: nflverse (github.com/nflverse), CC-BY 4.0"


class InvalidOutputError(JinxError):
    """A generated stat does not match the schema."""


def validator() -> Draft202012Validator:
    schemas = {}
    for name in ("stat.schema.json", "stats.schema.json"):
        path = SCHEMA_DIR / name
        if not path.exists():
            raise JinxError(f"schema not found: {path}")
        schemas[name] = json.loads(path.read_text())
    registry = Registry().with_resources(
        (s["$id"], Resource.from_contents(s)) for s in schemas.values()
    )
    return Draft202012Validator(schemas["stats.schema.json"], registry=registry)


def document(stats: list[dict], seed: int, now: datetime | None = None) -> dict:
    if not stats:
        raise EmptyOutputError("no stat passed the quality gate; nothing written")
    return {
        "version": 1,
        "generatedAt": (now or datetime.now(UTC)).isoformat(timespec="seconds"),
        "seed": seed,
        "seasons": {
            "from": min(s["seasons"]["from"] for s in stats),
            "to": max(s["seasons"]["to"] for s in stats),
        },
        "attribution": ATTRIBUTION,
        "stats": stats,
    }


def validate(doc: dict) -> None:
    errors = sorted(validator().iter_errors(doc), key=lambda e: list(map(str, e.absolute_path)))
    if errors:
        e = errors[0]
        where = "/".join(map(str, e.absolute_path)) or "(root)"
        raise InvalidOutputError(f"stats.json fails the schema at {where}: {e.message}")
    for i, s in enumerate(doc["stats"]):
        if s["seasons"]["from"] > s["seasons"]["to"]:
            raise InvalidOutputError(f"stats/{i}: seasons.from is after seasons.to")


def write(path: Path, doc: dict) -> None:
    validate(doc)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", dir=path.parent, delete=False, suffix=".tmp", encoding="utf-8"
    ) as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(f.name, path)
