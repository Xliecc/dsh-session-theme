# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security-related problems.

Use GitHub's private security advisory flow instead:

**https://github.com/Xliecc/dsh-session-theme/security/advisories/new**

Include as much context as you can: the version affected, how to reproduce,
and a proof of concept if available.

## What this plugin does with your data

`dsh-session-theme` is a small host-side plugin for DeepSeek Harness. At
startup it:

- Reads persisted session metadata (`sessionPersistence.list`)
- For cold sessions lacking a cached title, reads their event-log tail
  (`sessionProjectionCache.coldSnapshot`) to fold the `title` projection
- Writes the folded title back into the local projection cache

**It performs no network calls.** It does not exfiltrate, upload, or share any
session content. All reads and writes stay within the local DSH data stores.

The browser-side bundle is an intentional no-op stub.

## Supply chain

- Published to npm and GitHub from this repository only.
- Release tarballs are built locally via `npm pack` (see
  [CONTRIBUTING.md](CONTRIBUTING.md)).
- The CI workflow (`npm audit --omit=dev --audit-level=high`) checks the
  dependency tree for known vulnerabilities on every push and PR.

## Plugin trust model (upstream disclaimer)

Installing ANY DSH plugin runs third-party code with your own permissions.
This project's security policy does not change that; review the source before
installing anything, and only install what you trust.