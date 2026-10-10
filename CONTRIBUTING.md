# Contributing

Small project, one maintainer. The conventions exist so that quality is
checked by something other than the author, not to add ceremony.

## The flow

1. **Issue first**, with acceptance criteria, a `type:` and `area:` label
   and a milestone. Typo fixes are exempt.
2. **Branch** `<type>/<short-description>`, lowercase: `feat/fake-generator`,
   `fix/copy-button`. CI rejects other names.
3. **Open a draft PR** as soon as there is something to push:
   `gh pr create --draft`. CI runs on every push; the reviewer does not.
4. **Mark it ready when it is actually done:** `gh pr ready <n>`. This
   triggers the automated Claude review, an independent instance that did
   not write the code. Later pushes are re-reviewed, so do not open a PR
   non-draft.
5. **Answer every review comment and resolve the thread**: fixed (say
   how), not fixing (say why), or later (open an issue and link it). The
   ruleset requires all conversations resolved.
6. **Squash merge** once `check`, `conventions` and `review` are green. The
   PR title becomes the commit subject on `main`; release-please reads it.

## Commits and PR titles

[Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<scope>): <subject>`, with the *why* in the body.

| Type | For |
|---|---|
| `feat` | new capability (minor bump) |
| `fix` | corrected behaviour (patch bump) |
| `test` | tests only |
| `docs` | README, docs/, CLAUDE.md |
| `ci` | workflows |
| `refactor` | no behaviour change |
| `chore` | deps, repo plumbing |

Scopes: `web`, `fake`, `schema`, `engine`, `ci`, `bot`.

No attribution trailers or "Generated with" footers, in branch commits
too: a squash merge copies branch-commit trailers into `main`.

## Content rules

- Fake stats are satire and must always say so, on the card and in any
  copied text.
- Word banks use teams, positions and archetypes ("a backup kicker"),
  never named players.
- Quotes on the landing page are short, well known and attributed.

## Testing

```sh
cd web
npm run typecheck && npm run lint && npm test && npm run test:e2e
```

```sh
cd engine
uv run ruff check && uv run ruff format --check && uv run pytest
```

If you fix a bug, add the test that would have caught it.

## Releases

release-please keeps a release PR open on `main`. Merging it tags
`vX.Y.Z`, writes `CHANGELOG.md` and publishes a GitHub Release. Every
push to `main` deploys the site to GitHub Pages; a failed build never
deploys, so the previous version stays live.
