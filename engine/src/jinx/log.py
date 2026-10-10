"""Structured logging: one JSON object per line on stderr."""

import json
import logging
import sys
from datetime import UTC, datetime

# Extra fields may not shadow LogRecord internals or our own keys.
_RESERVED = set(vars(logging.makeLogRecord({}))) | {"ts", "level", "event", "exc"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "event": record.getMessage(),
        }
        entry |= {k: v for k, v in vars(record).items() if k not in _RESERVED}
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def setup(verbose: bool = False) -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger("jinx")
    root.handlers[:] = [handler]
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.propagate = False
