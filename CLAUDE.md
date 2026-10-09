# Notes for Claude

Read `CONTRIBUTING.md` first. The draft → ready → review → merge flow applies
to you too.

## What this repository is

`jinx`: cursed NFL stats, a parody of broadcast-style insights, for the
Czech/Slovak NFL community (nfl.cz Discord). A toy, not a competition: no
accounts, logins, scores, cookies or trackers on the web.

```
web/      Vite + TypeScript, no framework. Static, deployed to GitHub Pages.
  src/fejk/        seeded RNG + Fejk generator (pure, no DOM)
  src/data/fejk/   word banks (JSON)
  src/i18n/        UI strings by key (en first; cs/sk later)
schema/   stat.schema.json: the contract between engine and web
engine/   (v0.2) Python 3.12 + uv + DuckDB over nflverse data → stats.json
```

## The rules

1. **Satire is labelled.** Every Fejk stat carries the satire badge on the
   card and in copied/shared text.
2. **No real players in Fejk.** Teams, positions, archetypes only.
3. **Real numbers never come from an LLM or randomness** (v0.2).
4. **Small.** No framework, no runtime dependencies without asking, no
   abstractions with one caller. Comments are sparse: a short file header,
   one line only where something is tricky.
5. **Safe DOM.** Render text with `textContent`; never put the URL hash or
   data into `innerHTML`.
6. **Strings by key.** UI text lives in `src/i18n/`, not inline.
7. **No attribution lines** in commits (branch commits too), PR bodies or
   review comments.

## Things that have already bitten (in sibling repos)

- **A skipped required check counts as passing.** The review workflow skips
  a draft only when both the event payload and the live API say draft;
  never move that back into the job-level `if`. release-please PRs are the
  one deliberate skip.
- **claude-code-action can exit green without reviewing**, e.g. on a PR that
  changes its own workflow. The last step fails unless `claude[bot]` posted
  a `## Claude review of <head sha>` summary.
- **PRs that change `claude-review.yml` cannot be reviewed by the action.**
  Keep them to that file plus top-level `*.md`. Before merging, run an
  independent review with a fresh subagent, post it with `gh pr comment`
  with the first line exactly `## Independent review (manual - <full head sha>)`,
  address it, then re-run the `review` job.
- **Release PRs opened with GITHUB_TOKEN get no CI.** Set the
  `RELEASE_PLEASE_TOKEN` secret, or push an empty commit to the release
  branch with your own credentials to trigger the checks.

## Dependencies

No Dependabot version updates; bump by hand in maintenance passes, picking
versions at least two weeks old. Actions are pinned to commit SHAs with the
version in a comment.

## Commands

```sh
cd web
npm run dev | build | typecheck | lint | test | test:e2e
```

Resolve review threads:

```sh
gh api graphql -f query='{ repository(owner:"moudlajs", name:"jinx") {
  pullRequest(number:N) { reviewThreads(first:50) {
    nodes { id isResolved path line comments(first:1){nodes{body}} } } } } }'
gh api graphql -f query='mutation { resolveReviewThread(
  input:{threadId:"ID"}) { thread { isResolved } } }'
```
