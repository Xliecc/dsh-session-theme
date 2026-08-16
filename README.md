# dsh-session-theme

> **English** | [简体中文](./README.zh-CN.md)

DSH web plugin: the left sidebar shows **every session's theme right on page load** — no need to click into a conversation first.

## The problem

In the DSH sidebar, sessions you haven't opened yet show **no theme** — just the workspace folder name (or a placeholder id). The theme only appears after you click into the session.

**Root cause:** for "cold" sessions (never opened in this process), `session.list` only reads the projection cache's zero-I/O rows (`cachedSnapshot`). If a session's `title` projection was never checkpointed, its list row has no `title`, so the sidebar falls back to the folder name. Only opening the session (which triggers the full cold-read ladder) recovers the title.

## How it works

At **startup** the plugin runs the projection cache's cold-read ladder (`coldSnapshot`) for every persisted session: it refolds the `title` projection from the stored log and **durably writes it back to the cache**. After that, every row returned by `session.list` carries a `title` projection → the sidebar natively shows each session's real theme, no click required.

- Only "cold" sessions are processed (not opened in this process); sessions that are already loaded already carry live projections in their list rows.
- Fail-soft per session: a corrupted log never affects other sessions and never blocks startup.
- Idempotent write-back: the next boot hits the cache fast path instantly.

## Install

Link install, zero external dependencies (host side uses only standard services):

```sh
dsh plugin --profile web add link:/path/to/dsh-session-theme
```

Or clone from GitHub:

```sh
git clone https://github.com/Xliecc/dsh-session-theme.git
dsh plugin --profile web add link:./dsh-session-theme
```

Or install from npm:

```sh
dsh plugin add dsh-session-theme
```

After installing, **hard-refresh the browser** (Ctrl/Cmd+Shift+R) so the client re-pulls `session.list`.

## Files

- `lib/index.js` — host side: warms the projection cache at startup (all behavior)
- `lib/client.js` — browser-side stub (no-op, keeps the registered manifest consistent)

## License

MIT
