"""Errors that end a run with exit code 1 and a clear message."""


class JinxError(Exception):
    """Base for expected failures: bad data, bad source, nothing to write."""


class SourceError(JinxError):
    """A source could not be downloaded or read."""


class SchemaMismatchError(JinxError):
    """A source is missing columns the engine relies on."""


class EmptyOutputError(JinxError):
    """No stat survived the quality gate."""
