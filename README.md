# jinx

Cursed NFL stats. A parody of the broadcast-style "insight" that is
technically true and completely useless.

> Kickers wearing #3 have missed 87% of field goals attempted during a
> halftime show with fireworks on Thursdays. **SATIRE**

**Live:** https://moudlajs.github.io/jinx/

<img src="docs/screenshot.png" alt="jinx on a phone: a Satire-labelled card with a big 27 and a made-up stat about fullbacks fumbling" width="320">

## How it works

- **Fake mode** combines absurd conditions, subjects and numbers from word
  banks in your browser. Every number is made up, and every card says so.
  A stat's seed is in the link, so a shared link shows the same stat.
  Copy and Share always include the satire label.
- **Real mode** shows stats from real queries over public NFL data
  (1999 to today), regenerated every week. Each card can show its
  filters, sample size and the exact SQL. See [docs/engine.md](docs/engine.md).
- **Play** has three games on the same cards:
  - **Daily Five:** five face-down cards, the same five for everyone
    today. Call each one Fake or Real, then share your row.
  - **Fake or Real:** the same call, endless, with a streak.
  - **Over / Under:** a real stat with its number hidden and a line to
    beat. No money, no odds.

  A card's label stays hidden only until you answer.

No accounts, no cookies, no ads. Play scores stay in your browser. Page
views are counted anonymously with Cloudflare Web Analytics.

## Local development

```sh
cd web
npm ci
npm run dev        # http://localhost:5173/jinx/
npm test           # unit tests
npm run test:e2e   # Playwright smoke
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the PR flow.

## Data

Real-mode numbers come from [nflverse](https://github.com/nflverse)
(play-by-play, schedules and rosters), CC-BY 4.0. Thank you.

## Disclaimer

Fake stats are satire: generated at random, about teams, positions and
archetypes, never about real players. Not affiliated with the NFL or any
team or broadcaster.

MIT licensed.
