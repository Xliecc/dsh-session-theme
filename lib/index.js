/**
 * dsh-session-theme — 会话主题直显（host-side warmer）.
 *
 * Problem: the DSH sidebar's session list shows a session's theme (title)
 * only after that session has been opened. Root cause: `session.list` serves
 * cold (never-opened-this-process) sessions from the projection cache's
 * zero-I/O rows (`cachedSnapshot`); a session whose title projection was never
 * checkpointed arrives WITHOUT a title, so the sidebar falls back to the
 * workspace folder name until the session is opened (which runs the full
 * cold-read ladder and recovers the title).
 *
 * Fix: at startup this plugin runs the projection cache's cold-read ladder
 * (`coldSnapshot`) for every persisted session, folding its `title` projection
 * from the stored log and durably writing it back. Afterwards `session.list`
 * rows carry the `title` projection and the sidebar shows every session's
 * theme immediately — no click needed. Live sessions are skipped (their list
 * rows already come from the live projection snapshot).
 *
 * Fail-soft per session and globally: a broken log never blocks anything.
 */

export const name = 'dsh-session-theme'

export const inject = ['sessionProjectionCache', 'sessionPersistence', 'sessions']

/** Whether a cached projection cut already carries a usable title. */
function hasUsableTitle(snap) {
	if (snap === void 0 || snap.values === void 0) return false
	const title = snap.values.title
	return typeof title === 'string' && title !== ''
}

/**
 * Warm the projection cache for every cold session. Fire-and-forget; the web
 * client's first `session.list` pull (after browser boot) then carries titles.
 */
export function apply(ctx) {
	const cache = ctx.sessionProjectionCache
	const persistence = ctx.sessionPersistence
	if (cache === void 0 || persistence === void 0) return

	const task = (async () => {
		const started = Date.now()
		let warmed = 0
		let skipped = 0
		try {
			const live = new Set(ctx.sessions.list().map((session) => session.id))
			const metas = await persistence.list()
			for (const meta of metas) {
				if (meta === null || typeof meta !== 'object') continue
				if (typeof meta.id !== 'string' || meta.id === '') continue
				if (live.has(meta.id)) continue
				if (meta.cwd === void 0 || meta.cwd === '') continue
				try {
					const cached = cache.cachedSnapshot(meta)
					if (hasUsableTitle(cached)) {
						skipped += 1
						continue
					}
					await cache.coldSnapshot(meta.id)
					warmed += 1
				} catch (error) {
					ctx.logger?.warn?.(
						`dsh-session-theme: warm failed for "${meta.id}": ${String(error)}`)
				}
			}
		} catch (error) {
			ctx.logger?.warn?.(`dsh-session-theme: warm pass failed: ${String(error)}`)
			return
		}
		ctx.logger?.info?.(
			`dsh-session-theme: projection cache warmed (${warmed} sessions, ${skipped} already titled) in ${Date.now() - started}ms`)
	})()

	ctx.on('dispose', () => {
		task.catch(() => {})
	})
}