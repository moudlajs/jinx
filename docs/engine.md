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

## Failures

| What | Exit | Message names |
|---|---|---|
| download or read error | 1 | the source and URL |
| a declared column is missing | 1 | the source and columns |
| no stat passes the quality gate | 1 | — |
| bad flags | 2 | the flag |

Logs are JSON lines on stderr.

## Data attribution

Data from [nflverse](https://github.com/nflverse), CC-BY 4.0 for
play-by-play and schedules.
