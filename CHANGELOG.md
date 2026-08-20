# Changelog

All notable changes to **dsh-session-theme** are documented here.

## [0.2.1] - 2026-08-16

### Changed
- Bilingual README: `README.md` (English, primary) + `README.zh-CN.md` (Chinese).
- Plugin manifest (`dsh.plugin.json`) description translated to English.
- Added `README.zh-CN.md` to published package files.

### Published
- npm: `dsh-session-theme@0.2.1`
- GitHub Release: [v0.2.1](https://github.com/Xliecc/dsh-session-theme/releases/tag/v0.2.1)

## [0.2.0] - 2026-08-16

### Added
- Host-side projection-cache warmer: at startup, run the cold-read ladder
  (`coldSnapshot`) for every persisted session so `session.list` rows carry a
  `title` projection.
- The DSH Web left sidebar shows every conversation's theme immediately on
  page load — no click needed.
- Pure logic layer (`lib/logic.js`) for testability.

### Published
- npm: `dsh-session-theme@0.2.0`
- GitHub Release: [v0.2.0](https://github.com/Xliecc/dsh-session-theme/releases/tag/v0.2.0)

[0.2.1]: https://github.com/Xliecc/dsh-session-theme/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Xliecc/dsh-session-theme/releases/tag/v0.2.0