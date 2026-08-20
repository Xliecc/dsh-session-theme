/**
 * dsh-session-theme — pure logic helpers (unit-testable).
 *
 * These functions contain no I/O and no context access: everything an effectful
 * caller needs is passed in. The host plugin (lib/index.js) wires them to the
 * real sessionProjectionCache / sessionPersistence services.
 */

/**
 * Whether a cached projection cut already carries a usable title.
 * @param {{ values?: { title?: unknown } } | undefined | null} snap
 * @returns {boolean}
 */
export function hasUsableTitle(snap) {
	if (snap === void 0 || snap === null || snap.values === void 0) return false
	const title = snap.values.title
	return typeof title === 'string' && title !== ''
}

/**
 * Whether a persisted session meta should be considered for warming.
 *
 * @param {unknown} meta - a row from `sessionPersistence.list()`.
 * @param {Set<string>} liveIds - ids of sessions attached in this process.
 * @returns {boolean}
 */
export function shouldWarm(meta, liveIds) {
	if (meta === null || typeof meta !== 'object') return false
	if (typeof meta.id !== 'string' || meta.id === '') return false
	if (liveIds.has(meta.id)) return false
	if (meta.cwd === void 0 || meta.cwd === '') return false
	return true
}

/**
 * Build the work plan for a warm pass without running it.
 *
 * @param {Array<unknown>} metas - rows from `sessionPersistence.list()`.
 * @param {Set<string>} liveIds
 * @param {(meta: unknown) => unknown} cachedSnapshot - returns the cached
 *   projection cut for a meta (or undefined).
 * @returns {{ toWarm: Array<{ id: string, meta: object }> }}
 */
export function plan(metas, liveIds, cachedSnapshot) {
	const toWarm = []
	for (const meta of metas) {
		if (!shouldWarm(meta, liveIds)) continue
		const id = meta.id
		if (hasUsableTitle(cachedSnapshot(meta))) continue
		toWarm.push({ id, meta })
	}
	return { toWarm }
}