#!/usr/bin/env node
/**
 * Release script for dsh-session-theme (Node ESM, zero deps).
 *
 * Usage: node scripts/release.mjs [patch|minor|major|--version=X.Y.Z]
 *
 * Steps:
 *   1. bump version in package.json + dsh.plugin.json
 *   2. npm test
 *   3. npm pack
 *   4. commit + tag + push
 *   5. npm publish
 *   6. gh release create with the tarball
 *
 * Requires: gh CLI authenticated + npm authenticated (registry.npmjs.org).
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const bump = process.argv[2] ?? 'patch'
const pkgPath = new URL('../package.json', import.meta.url)
const manifestPath = new URL('../dsh.plugin.json', import.meta.url)

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const next = bump.startsWith('--version=')
	? bump.slice('--version='.length)
	: bumpVersion(pkg.version, bump)

pkg.version = next
manifest.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

run('npm test')

// npm pack prints the tarball filename as the last line of stdout
const packOut = run('npm pack --silent', { stdio: ['pipe', 'pipe', 'inherit'] })
const tarball = packOut.split(/\r?\n/).filter(Boolean).pop() ?? 'dsh-session-theme.tgz'
console.log(`tarball: ${tarball}`)

run('git add package.json dsh.plugin.json')
run(`git commit -m "release: v${next}" || true`)
run(`git tag v${next}`)
run('git push origin main --tags')

run('npm publish --registry=https://registry.npmjs.org')
run(`gh release create v${next} ${tarball} --title "v${next}" --notes "Release v${next} of dsh-session-theme."`)

console.log(`\nReleased v${next} 🎉`)

function bumpVersion(current, kind) {
	const [maj, min, pat] = current.split('.').map(Number)
	if (kind === 'major') return `${maj + 1}.0.0`
	if (kind === 'minor') return `${maj}.${min + 1}.0`
	return `${maj}.${min}.${pat + 1}`
}

function run(cmd, opts = {}) {
	try {
		return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], ...opts })
	} catch (err) {
		if (!cmd.includes('|| true')) {
			console.error(`command failed: ${cmd}\n${err.stdout ?? ''}${err.stderr ?? ''}`)
			process.exit(1)
		}
		return ''
	}
}