// CI gate for `npm audit`: fail on high/critical advisories, except ones listed in
// audit-allowlist.json (advisories with no patched release that only affect build tooling).
// An allowlist entry fails the gate once its package publishes a version above `maxAffected`,
// so it gets removed as soon as a fix exists.
// SPDX-License-Identifier: GPL-3.0-only
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const LEVELS = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
const threshold = LEVELS[process.env.AUDIT_LEVEL || 'high']
const allow = JSON.parse(readFileSync(new URL('../audit-allowlist.json', import.meta.url), 'utf8'))

let raw
try { raw = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }) }
catch (e) { raw = e.stdout }
const report = JSON.parse(raw)
const vulns = report.vulnerabilities || {}

const ghsa = url => (url || '').split('/').pop()
const leaves = new Map()
for (const v of Object.values(vulns)) {
  for (const via of v.via) if (typeof via === 'object') leaves.set(ghsa(via.url), via)
}

const failures = []
const allowed = []
for (const [id, adv] of leaves) {
  if (LEVELS[adv.severity] < threshold) continue
  const entry = allow.find(a => a.id === id)
  if (entry) allowed.push(`${id} ${adv.name} (${entry.reason})`)
  else failures.push(`${id} ${adv.severity} ${adv.name} ${adv.range}: ${adv.title}`)
}

for (const entry of allow) {
  const latest = execSync(`npm view ${entry.package} version`, { encoding: 'utf8' }).trim()
  const cmp = latest.localeCompare(entry.maxAffected, undefined, { numeric: true })
  if (cmp > 0) failures.push(`${entry.id}: ${entry.package}@${latest} is newer than ${entry.maxAffected}; upgrade and drop the allowlist entry`)
}

for (const a of allowed) console.log('allowed:', a)
if (failures.length) {
  console.error('npm audit gate failed:\n  ' + failures.join('\n  '))
  process.exit(1)
}
console.log(`npm audit gate passed (${Object.keys(vulns).length} packages flagged, none above threshold outside the allowlist).`)
