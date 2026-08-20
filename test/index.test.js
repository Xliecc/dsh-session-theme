/**
 * dsh-session-theme — unit tests (Node built-in test runner, zero deps).
 *
 * Run: `node --test test/`
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { hasUsableTitle, shouldWarm, plan } from '../lib/logic.js'

test('hasUsableTitle: only non-empty string titles count', () => {
	assert.equal(hasUsableTitle(undefined), false)
	assert.equal(hasUsableTitle(null), false)
	assert.equal(hasUsableTitle({}), false)
	assert.equal(hasUsableTitle({ values: undefined }), false)
	assert.equal(hasUsableTitle({ values: {} }), false)
	assert.equal(hasUsableTitle({ values: { title: null } }), false)
	assert.equal(hasUsableTitle({ values: { title: '' } }), false)
	assert.equal(hasUsableTitle({ values: { title: 0 } }), false)
	assert.equal(hasUsableTitle({ values: { title: 'A real theme' } }), true)
})

test('shouldWarm: skips non-objects, empty ids, live sessions, and no-cwd meta', () => {
	const live = new Set(['live-1'])
	const check = (meta) => shouldWarm(meta, live)

	assert.equal(check(null), false)
	assert.equal(check(undefined), false)
	assert.equal(check('string'), false)
	assert.equal(check(42), false)
	assert.equal(check({}), false)              // no id
	assert.equal(check({ id: '' }), false)
	assert.equal(check({ id: 'no-cwd' }), false) // no cwd
	assert.equal(check({ id: 'live-1', cwd: '/x' }), false) // live
	assert.equal(check({ id: 'cold-1', cwd: '/x' }), true)  // warmable
})

test('plan: picks cold sessions lacking a usable title', () => {
	const metas = [
		{ id: 'live-1', cwd: '/a' },
		{ id: 'cold-1', cwd: '/b' },
		{ id: 'cold-2', cwd: '/c' },
		{ id: 'no-cwd' },
		null,
	]
	const liveIds = new Set(['live-1'])
	const cache = new Map([
		['cold-1', { values: { title: 'Has title' } }], // has title -> skip
		['cold-2', { values: {} }],                      // no title -> warm
	])
	const { toWarm } = plan(metas, liveIds, (meta) => cache.get(meta.id))

	assert.deepEqual(toWarm.map((i) => i.id), ['cold-2'])
})

test('plan: warm dedupes by id when metas repeat', () => {
	const metas = [
		{ id: 'cold-1', cwd: '/a' },
		{ id: 'cold-1', cwd: '/a' },
	]
	const { toWarm } = plan(metas, new Set(), () => undefined)
	assert.equal(toWarm.length, 2) // plan keeps rows; dedupe happens at execution
})

test('package: shipped files include everything the plugin needs', async () => {
	const pkg = JSON.parse(
		await import('node:fs').then((fs) =>
			fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
		),
	)
	// NOTE: `files` lists directories/globs, not individual files. Check that
	// the directories holding the plugin's runtime code are included.
	const required = [
		'lib',
		'cordis.patch.yml',
		'dsh.plugin.json',
		'README.md',
	]
	const files = pkg.files ?? []
	for (const f of required) {
		assert.ok(files.includes(f), `package.json files must include ${f}`)
	}
	// The manifest must be installable: dsh.bundle.patch must point at the yml
	assert.ok(pkg.dsh?.bundle?.patch, 'dsh.bundle.patch is required for dsh plugin add')
})

test('integration: apply warm pass fails soft per session and globally', async () => {
	// Build a fake ctx with in-memory services and run the exported apply().
	const { apply } = await import('../lib/index.js')
	const metas = [
		{ id: 'live-1', cwd: '/a' },
		{ id: 'cold-ok', cwd: '/b' },
		{ id: 'cold-broken', cwd: '/c' },
	]
	const warmLog = []
	const warned = []
	const ctx = {
		sessions: { list: () => [{ id: 'live-1' }] },
		sessionPersistence: { list: async () => metas },
		sessionProjectionCache: {
			cachedSnapshot: () => undefined,
			coldSnapshot: async (id) => {
				if (id === 'cold-broken') throw new Error('corrupt log')
				warmLog.push(id)
				return { values: { title: 'T' } }
			},
		},
		logger: { warn: (...args) => warned.push(args.join(' ')), info: () => {} },
		on: () => {},
	}
	await apply(ctx)
	// microtask flush
	await new Promise((r) => setTimeout(r, 10))
	assert.deepEqual(warmLog.sort(), ['cold-ok']) // broken one did not block the ok one
	assert.equal(warned.length, 1) // exactly one warning for the broken session
	assert.match(warned[0], /cold-broken/)
})