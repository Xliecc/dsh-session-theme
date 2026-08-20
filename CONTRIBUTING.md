# Contributing

Thanks for your interest in dsh-session-theme!

This is a small, focused DSH plugin: it shows every session's theme in the left
sidebar on page load by warming the session projection cache at startup.

## Development

Requirements:

- Node.js >= 20
- A DSH install (`dsh` on PATH) for live testing

### Setup

```sh
git clone https://github.com/Xliecc/dsh-session-theme.git
cd dsh-session-theme
npm ci
```

### Commands

```sh
npm test          # run unit tests (node:test, zero deps)
npm pack          # build the installable tarball
```

### Architecture

- `lib/logic.js` — pure, dependency-free decision helpers (`hasUsableTitle`,
  `shouldWarm`, `plan`). No I/O, no `ctx` — unit-testable.
- `lib/index.js` — the cordis plugin entry: injects the standard services
  (`sessionProjectionCache`, `sessionPersistence`, `sessions`) and runs the
  warm pass at startup, fail-soft per session.
- `lib/client.js` — browser-side no-op stub (keeps the registered bundle valid).
- `test/` — Node built-in test runner unit tests for the pure layer.

### How the warm pass works

`sessions.list` serves cold (never-opened-this-process) sessions from the
projection cache's zero-I/O rows. A session whose `title` projection was never
checkpointed arrives without a title, so the sidebar falls back to the
workspace folder name. This plugin runs the cold-read ladder (`coldSnapshot`)
for every persisted session at startup, folding `title` from the stored log and
writing it back durably. Afterwards `session.list` carries the `title`
projection and the sidebar shows every theme immediately.

## Publishing a new version

1. Bump `version` in `package.json` and `dsh.plugin.json`.
2. Update `CHANGELOG.md`.
3. `npm test` and `npm pack`.
4. Commit, tag (`vX.Y.Z`), push.
5. `npm publish` and `gh release create vX.Y.Z <tarball>`.

## License

MIT — see [LICENSE](LICENSE).