"""`jinx generate`: exit 0 on success, 1 on a data/runtime error, 2 on bad usage."""

import argparse
import logging
import sys
from pathlib import Path

from jinx import log as jinx_log
from jinx import pipeline
from jinx.errors import JinxError

log = logging.getLogger("jinx.cli")


def positive_int(value: str) -> int:
    n = int(value)
    if n < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return n


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="jinx", description="Generate Real-mode jinx stats.")
    p.add_argument("-v", "--verbose", action="store_true", help="debug logging")
    sub = p.add_subparsers(dest="command", required=True)
    gen = sub.add_parser("generate", help="generate stats.json")
    gen.add_argument("--count", type=positive_int, default=500, help="stats to generate")
    gen.add_argument("--seed", type=int, default=0, help="seed for a reproducible run")
    gen.add_argument("--out", type=Path, default=Path("dist/stats.json"), help="output path")
    gen.add_argument(
        "--data-dir", type=Path, help="read <source>.parquet|csv from here instead of nflverse"
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    jinx_log.setup(args.verbose)
    opts = pipeline.Options(args.count, args.seed, args.out, args.data_dir)
    try:
        pipeline.run(opts)
    except JinxError as e:
        log.error(str(e), extra={"error": type(e).__name__})
        return 1
    except Exception:
        log.exception("unexpected failure")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
