# Architecture

This document explains how `dsh-session-theme` works and why it exists.

## Why this plugin exists

The DSH Web UI's sidebar lists conversations. Each row shows the session's
title — **but only after you have opened that session at least once in the
current process.**

Before you click in, the row shows the workspace folder name instead of the
conversation theme. That is confusing when you have many sessions.

## Why the title is missing

Sessions are stored as JSONL event logs in the session persistence store.
A summary of each session is produced by **projecting** events (things like
`session/title`) into flat rows. The projection system uses two paths:

1. **Live sessions** (attached to the process): the list RPC computes the
   projection from the in-memory session object directly — this always includes
   the current title.
2. **Cold sessions** (never opened in this process): the list RPC consults the
   projection cache's zero-I/O rows (`cachedSnapshot`). If that session's
   `title` projection was never checkpointed, the row has no title and the
   sidebar shows the folder-name fallback.

A title is only checkpointed when the session is actually opened and events
flow through the cache write-behind path. Sessions created in an earlier
process and never opened since then have no cached title row.

## The fix

At startup, this plugin runs the **cold-read ladder** for every persisted
session: if the cached snapshot has no usable title, it calls
`coldSnapshot(id)`, which reads the session's event log from the persistence
store, refolds the projections (including `title`) from the log, and durably
writes the result back into the cache.

From then on, `session.list` returns the `title` projection for every session —
so the sidebar natively shows each conversation's theme on page load. No click
needed.

## Design principles

- **Zero client changes.** The fix is entirely host-side; the client-side
  bundle is a no-op stub that keeps the registered manifest valid.
- **Fast startup.** The warm pass reads logs only for sessions whose cached
  rows lack a title; sessions already titled are skipped (cache hit).
- **Fail-soft.** A broken log for one session logs a warning and never blocks
  the next session or the rest of startup.
- **Idempotent.** Running the warm pass repeatedly converges to the same
  checkpointed state; there is no double-publishing of events.

## Implementation map

| File | Role |
| --- | --- |
| `lib/logic.js` | Pure decision helpers: `hasUsableTitle`, `shouldWarm`, `plan`. No I/O, no service access — fully unit-testable. |
| `lib/index.js` | The cordis plugin entry: injects `sessionProjectionCache`, `sessionPersistence`, `sessions` and runs the warm pass at startup. |
| `lib/client.js` | Browser-side no-op stub. |
| `test/index.test.js` | Unit + integration tests (Node's built-in test runner, zero dependencies). |
| `cordis.patch.yml` | Declares the plugin bundle for `dsh plugin add`. |

## Data flow

```
startup
  └─ apply()
      ├─ list persisted sessions        (sessionPersistence.list)
      ├─ live ids from in-memory store  (sessions.list)
      ├─ plan: cold sessions lacking title  (cache.cachedSnapshot)
      └─ for each: warm            (cache.coldSnapshot → read log → fold → write back)
            ├─ success → title appears in subsequent session.list
            └─ failure  → log warning, continue with next session
```

## Related DSH internals

- `dsh-session-projection-cache` — provides `cachedSnapshot`/`coldSnapshot`.
- `dsh-session-persistence-jsonl` — provides the JSONL event-log store.
- `dsh-session-title` — registers the `title` projection (`session/title`).

All of these ship with the standard DSH distribution; this plugin only wires
them together at the right moment.