// Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus.
// Tests for the cluster Nodes and Domains & Certificates helpers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nodeCardState, nodeStateColor, nodeStateKey, memPercent, cpuPercent, relativeParts,
  displayBaseUrl, validateNode, nodePayload, isNodeLinkRemark, replicaNodeName, defaultNode,
} from '../src/plugins/cluster.ts'
import {
  certStatusOf, certStatusColor, daysLeft, isValidDomain, isValidCertDomain, isValidEmail,
  isAbsolutePath, targetsField, domainCovers, canDelete, panelURL, isLoopbackListen, formBool,
} from '../src/plugins/certs.ts'
import { nexusMessages, nexusEnglish, deepMerge, withNexus } from '../src/locales/nexus.ts'

const st = (state, extra = {}) => ({ state, latency: 12, cpu: 3.4, mem: { current: 1, total: 4 }, appVersion: 'v1', coreVersion: 'v1.13', checkedAt: 1, lastOnline: 1, ...extra })

test('node card state: disabled wins, missing snapshot is pending, unknown is offline', () => {
  assert.equal(nodeCardState({ enable: false }, st('online')), 'disabled')
  assert.equal(nodeCardState({ enable: true }, undefined), 'pending')
  assert.equal(nodeCardState({ enable: true }, null), 'pending')
  assert.equal(nodeCardState({ enable: true }, st('online')), 'online')
  assert.equal(nodeCardState({ enable: true }, st('core-stopped')), 'core-stopped')
  assert.equal(nodeCardState({ enable: true }, st('offline')), 'offline')
  assert.equal(nodeCardState({ enable: true }, st('weird')), 'offline')
  assert.equal(nodeStateColor('online'), 'success')
  assert.equal(nodeStateColor('core-stopped'), 'warning')
  assert.equal(nodeStateColor('offline'), 'error')
  assert.equal(nodeStateColor('pending'), 'grey')
  assert.equal(nodeStateKey('core-stopped'), 'node.status.coreStopped')
  assert.equal(nodeStateKey('online'), 'node.status.online')
  assert.equal(nodeStateKey('disabled'), 'node.status.disabled')
})

test('cpu / memory percentages are clamped and safe on bad input', () => {
  assert.equal(memPercent({ current: 1, total: 4 }), 25)
  assert.equal(memPercent({ current: 5, total: 4 }), 100)
  assert.equal(memPercent({ current: 1, total: 0 }), 0)
  assert.equal(memPercent(undefined), 0)
  assert.equal(cpuPercent(12.6), 13)
  assert.equal(cpuPercent(NaN), 0)
  assert.equal(cpuPercent(-1), 0)
  assert.equal(cpuPercent(250), 100)
})

test('relative time picks the right unit and treats 0 as never', () => {
  assert.equal(relativeParts(0, 1000), null)
  assert.deepEqual(relativeParts(990, 1000), { value: -10, unit: 'second' })
  assert.deepEqual(relativeParts(1000 - 125, 1000), { value: -2, unit: 'minute' })
  assert.deepEqual(relativeParts(10000 - 7200, 10000), { value: -2, unit: 'hour' })
  assert.deepEqual(relativeParts(1, 1 + 3 * 86400), { value: -3, unit: 'day' })
  assert.equal(displayBaseUrl('https://1.2.3.4:2095'), '1.2.3.4:2095')
})

test('node form validation mirrors the backend rules', () => {
  const ok = { ...defaultNode(), name: 'jp-1', baseUrl: 'https://n.example.com:2095', token: 'abc' }
  assert.deepEqual(validateNode(ok, true), [])
  assert.ok(validateNode({ ...ok, name: ' ' }, true).includes('node.err.nameRequired'))
  assert.ok(validateNode({ ...ok, name: 'a[b]' }, true).includes('node.err.nameBrackets'))
  // a legacy bracketed name stays editable as long as it is not changed
  assert.deepEqual(validateNode({ ...ok, name: 'a[b]', tokenSet: true, token: '' }, false, 'a[b]'), [])
  assert.ok(validateNode({ ...ok, baseUrl: 'n.example.com' }, true).includes('node.err.baseUrl'))
  assert.ok(validateNode({ ...ok, baseUrl: 'ftp://x' }, true).includes('node.err.baseUrl'))
  assert.ok(validateNode({ ...ok, baseUrl: 'https://n.example.com/app/' }, true).includes('node.err.baseUrlPath'))
  assert.deepEqual(validateNode({ ...ok, baseUrl: 'https://n.example.com/' }, true), [])
  // empty token: required on new, "keep" on edit when one is stored
  assert.ok(validateNode({ ...ok, token: '' }, true).includes('node.err.tokenRequired'))
  assert.deepEqual(validateNode({ ...ok, token: '', tokenSet: true }, false, 'jp-1'), [])
  assert.ok(validateNode({ ...ok, token: '', tokenSet: false }, false, 'jp-1').includes('node.err.tokenRequired'))
  assert.ok(validateNode({ ...ok, certPin: 'abc' }, true).includes('node.err.certPin'))
  const pin = 'AB:'.repeat(31) + 'AB'
  assert.deepEqual(validateNode({ ...ok, certPin: pin }, true), [])
})

test('node payload trims, drops server-only fields and keeps empty token for "keep"', () => {
  const p = nodePayload({ ...defaultNode(), id: 3, name: ' n1 ', baseUrl: ' https://h:1/// ', webPath: '', token: '', tokenSet: true, status: st('online') })
  assert.equal(p.name, 'n1')
  assert.equal(p.baseUrl, 'https://h:1')
  assert.equal(p.webPath, '/app/')
  assert.equal(p.token, '')
  assert.equal('status' in p, false)
  assert.equal('tokenSet' in p, false)
  assert.equal(p.id, 3)
})

test('node link remarks are recognised only for known node names', () => {
  const names = ['jp', 'us-west']
  assert.equal(isNodeLinkRemark('[jp] vless-in', names), true)
  assert.equal(isNodeLinkRemark('[us-west] trojan', names), true)
  assert.equal(isNodeLinkRemark('[jpx] vless-in', names), false)
  assert.equal(isNodeLinkRemark('[jp]vless-in', names), false)
  assert.equal(isNodeLinkRemark('my link', names), false)
  assert.equal(isNodeLinkRemark(undefined, names), false)
  assert.equal(isNodeLinkRemark('[] x', ['']), false)
  const nodes = [{ id: 1, name: 'jp' }]
  assert.equal(replicaNodeName({ node_id: 1 }, nodes), 'jp')
  assert.equal(replicaNodeName({ node_id: 9 }, nodes), '#9')
  assert.equal(replicaNodeName({}, nodes), '')
  assert.equal(replicaNodeName({ node_id: null }, nodes), '')
})

test('certificate status and colors match the server classification', () => {
  const now = 1_700_000_000
  assert.equal(certStatusOf({ notAfter: 0 }, now), 'missing')
  assert.equal(certStatusOf({ notAfter: now - 1 }, now), 'expired')
  assert.equal(certStatusOf({ notAfter: now }, now), 'expired')
  assert.equal(certStatusOf({ notAfter: now + 29 * 86400 }, now), 'expiring')
  assert.equal(certStatusOf({ notAfter: now + 31 * 86400 }, now), 'valid')
  // the server-provided status wins
  assert.equal(certStatusOf({ notAfter: now + 31 * 86400, status: 'expiring' }, now), 'expiring')
  assert.equal(certStatusColor('valid'), 'success')
  assert.equal(certStatusColor('expiring'), 'warning')
  assert.equal(certStatusColor('expired'), 'error')
  assert.equal(certStatusColor('missing'), 'grey')
  assert.equal(daysLeft(now + 10 * 86400 + 5, now), 10)
  assert.equal(daysLeft(now - 1, now), -1)
})

test('domain / email / path validation rejects injection and IPs', () => {
  for (const d of ['a.com', 'panel.example.com', 'x-1.y.co']) assert.equal(isValidDomain(d), true, d)
  for (const d of ['', 'localhost', '1.2.3.4', '::1', 'a.com;id', 'a..com', '-a.com', 'a-.com', 'a.com/x', 'a com.x', '$(id).a.com', '*.a.com', 'a'.repeat(64) + '.com'])
    assert.equal(isValidDomain(d), false, d)
  assert.equal(isValidCertDomain('*.a.com'), true)
  assert.equal(isValidCertDomain('*.com'), false)
  assert.equal(isValidEmail(''), true)
  assert.equal(isValidEmail('me@example.com'), true)
  for (const e of ['me', 'me@', 'a;b@x.com', 'a b@x.com', 'a@x', '$(id)@x.com']) assert.equal(isValidEmail(e), false, e)
  assert.equal(isAbsolutePath('/etc/ssl/a.pem'), true)
  assert.equal(isAbsolutePath('C:\\certs\\a.pem'), true)
  assert.equal(isAbsolutePath('certs/a.pem'), false)
  assert.equal(isAbsolutePath(''), false)
})

test('apply helpers: targets order, wildcard coverage, delete guard, booleans', () => {
  assert.equal(targetsField(['sub', 'web']), 'web,sub')
  assert.equal(targetsField(['sub']), 'sub')
  assert.equal(targetsField([]), '')
  assert.equal(domainCovers('a.com', 'A.com'), true)
  assert.equal(domainCovers('*.a.com', 'x.a.com'), true)
  assert.equal(domainCovers('*.a.com', 'y.x.a.com'), false)
  assert.equal(domainCovers('*.a.com', 'a.com'), false)
  assert.equal(domainCovers('b.com', 'a.com'), false)
  assert.equal(canDelete({}), true)
  assert.equal(canDelete({ usedBy: [] }), true)
  assert.equal(canDelete({ usedBy: ['web'] }), false)
  assert.equal(formBool(true), 'true')
  assert.equal(formBool(false), 'false')
})

test('panel URL after restart follows TLS / nginx / port rules', () => {
  const base = { domain: 'p.example.com', port: '2095', path: '/app/', tls: true, behindNginx: false, fallbackHost: '1.2.3.4', page: 'domains' }
  assert.equal(panelURL(base), 'https://p.example.com:2095/app/domains')
  assert.equal(panelURL({ ...base, tls: false }), 'http://p.example.com:2095/app/domains')
  assert.equal(panelURL({ ...base, port: '443' }), 'https://p.example.com/app/domains')
  assert.equal(panelURL({ ...base, behindNginx: true }), 'https://p.example.com/app/domains')
  assert.equal(panelURL({ ...base, domain: '', tls: false, path: 'app' }), 'http://1.2.3.4:2095/app/domains')
  assert.equal(isLoopbackListen('127.0.0.1'), true)
  assert.equal(isLoopbackListen('::1'), true)
  assert.equal(isLoopbackListen(''), false)
  assert.equal(isLoopbackListen('0.0.0.0'), false)
})

const keysOf = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' ? keysOf(v, prefix + k + '.') : [prefix + k]).sort()

test('nexus locale strings: every translation has exactly the English keys and is vue-i18n safe', () => {
  const enKeys = keysOf(nexusEnglish)
  for (const [code, messages] of Object.entries(nexusMessages)) {
    assert.deepEqual(keysOf(messages), enKeys, code)
    for (const key of keysOf(messages)) {
      const value = key.split('.').reduce((o, k) => o[k], messages)
      assert.equal(typeof value, 'string', code + ':' + key)
      assert.ok(!/[@|]/.test(value), `${code}:${key} contains @ or |`)
      // placeholders only of the form {name}
      assert.ok(!/\{[^a-zA-Z}]|\{[a-zA-Z]+[^a-zA-Z}]/.test(value), `${code}:${key} has a malformed placeholder`)
      const placeholders = (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort()
      const enValue = key.split('.').reduce((o, k) => o[k], nexusEnglish)
      assert.deepEqual(placeholders, (enValue.match(/\{[a-zA-Z]+\}/g) ?? []).sort(), `${code}:${key} placeholders differ from English`)
    }
  }
})

test('locale merge keeps upstream keys and falls back to English for untranslated locales', () => {
  const upstream = { pages: { home: 'Home' }, actions: { add: 'Add' } }
  const merged = withNexus('fa', upstream)
  assert.equal(merged.pages.home, 'Home')
  assert.equal(merged.pages.nodes, nexusEnglish.pages.nodes)
  assert.equal(merged.actions.add, 'Add')
  assert.equal(merged.node.status.online, 'Online')
  assert.equal(upstream.pages.nodes, undefined, 'input must not be mutated')
  assert.equal(withNexus('zhHans', upstream).pages.nodes, '节点')
  assert.deepEqual(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3 } }), { a: { b: 1, c: 3 } })
})
