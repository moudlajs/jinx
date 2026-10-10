# Engine

`engine/` generates Real-mode stats: it combines random filters over public
NFL data, keeps only results with a decent sample and an extreme value, and
writes `stats.json` for the web.

## Data sources

All from [nflverse-data releases](https://github.com/nflverse/nflverse-data/releases),
configured in one file, `engine/src/jinx/sources.toml`:

| Source | Release asset | Used for |
|---|---|---|
| `games` | `schedules/games.parquet` | results, weekday, kickoff time, roof, temperature, wind, starting QBs |
| `rosters` | `rosters/roster_{season}.parquet` | jersey numbers by season |
| `pbp` | `pbp/play_by_play_{season}.parquet` | 4th downs, field goals, interceptions, touchdowns, quarters |
| `teams` | `teams/teams_colors_logos.parquet` | team nicknames |

Verified 2026-10-10: the assets above exist for 1999–2026 (`stats_player`
weekly files exist too but aren't needed yet). DuckDB reads them straight
from the release URLs, selecting only the declared columns; a full load
takes about 16 s.

Seasons are those with at least one completed game in `games`, from
`first_season` (1999, the first play-by-play season) on. Per-season files
are fetched only for those seasons.

## How a stat is made

1. **Load** the sources into DuckDB, then build two tables: `team_games`
   (one row per team per game; relocated franchises merged; starting QB and
   his jersey from that season's roster) and `plays` (play-by-play with the
   same game context).
2. **Combine** at random, from `--seed`: a metric (record, points per game,
   4th-down %, FG %, INTs or TD passes per game), a subject it supports (a
   team or a starting QB), 2–3 filters from different groups (weather, roof,
   weekday, kickoff, home/away, division, QB jersey, playoffs, quarter) and
   a season window. Catalog: `engine/src/jinx/catalog.py`.
3. **Query** each combination once, as one `GROUP BY` over every subject.
   SQL comes only from catalog fragments; seasons and the minimum sample are
   bound parameters.
4. **Gate**: keep a row if its sample is at least `--min-sample` (default 8)
   and its value is at or past the metric's low/high threshold. One row per
   query, no repeats of the same metric/subject/filters, and no subject
   above 4% of the file.
5. **Render** English text, validate against `schema/stats.schema.json`
   and write `stats.json` atomically. Each stat carries its numbers,
   filters, seasons and the exact SQL.

```sh
cd engine
uv run jinx generate --count 500 --seed 42 --out dist/stats.json
uv run jinx generate --data-dir tests/fixtures --min-sample 4   # offline
```

A real run takes about 20 s, almost all of it downloading.

## Failures

| What | Exit | Message names |
|---|---|---|
| download or read error | 1 | the source and URL |
| a declared column is missing | 1 | the source and columns |
| no stat passes the quality gate | 1 | — |
| output fails the schema | 1 | the JSON path |
| bad flags | 2 | the flag |

Logs are JSON lines on stderr.

## Data attribution

Data from [nflverse](https://github.com/nflverse), CC-BY 4.0 for
play-by-play and schedules.
