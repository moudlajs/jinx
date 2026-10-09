# jinx

Cursed NFL stats. A parody of the broadcast-style "insight" that is
technically true and completely useless.

> Kickers wearing #3 have missed 87% of field goals attempted during a
> halftime show with fireworks on Thursdays. **SATIRE**

**Live:** https://moudlajs.github.io/jinx/

## How it works

- **Fejk mode** combines absurd conditions, subjects and numbers from word
  banks in your browser. Every number is made up, and every card says so.
  A stat's seed is in the link, so a shared link shows the same stat.
- **Real mode** (coming in v0.2) runs real queries over public NFL data.

No accounts, no cookies, no trackers.

## Local development

```sh
cd web
npm ci
npm run dev        # http://localhost:5173/jinx/
npm test           # unit tests
npm run test:e2e   # Playwright smoke
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the PR flow.

## Disclaimer

Fejk stats are satire: generated at random, about teams, positions and
archetypes, never about real players. Not affiliated with the NFL or any
team or broadcaster.

MIT licensed.
