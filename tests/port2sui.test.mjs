// Tests for the shenaba/2s-ui v2.1.0 ports (GPL-3.0): ECH drawer helpers,
// inbound enable switch / traffic cap, adopt-time client assignment.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asLines, echHasConfig, echQueryLocked, splitEchPems } from '../src/plugins/ech.ts'
import {
  inboundEnabled, inboundDepleted, inboundUsagePercent, gbToBytes, bytesToGb,
  inboundPickerTitle, bindableClients, resolveInitUsers, initUsersIncomplete,
} from '../src/plugins/inbounds.ts'
import { nexusMessages, nexusEnglish } from '../src/locales/nexus.ts'

test('ECH: stored key/config read as lines whatever their shape', () => {
  assert.deepEqual(asLines(['a', 'b']), ['a', 'b'])
  assert.deepEqual(asLines('a\nb'), ['a', 'b'])
  assert.deepEqual(asLines(''), [])
  assert.deepEqual(asLines(undefined), [])
  assert.deepEqual(asLines([1, 'x']), ['x'])
  assert.equal(echHasConfig(['', '  ']), false)
  assert.equal(echHasConfig('-----BEGIN ECH CONFIGS-----'), true)
})

test('ECH: the query name is locked only while empty next to a config', () => {
  assert.equal(echQueryLocked(undefined), false)
  assert.equal(echQueryLocked({ config: [] }), false)
  assert.equal(echQueryLocked({ config: ['x'] }), true)
  assert.equal(echQueryLocked({ config: ['x'], query_server_name: 'q.example.com' }), false)
  assert.equal(echQueryLocked({ query_server_name: '' }), false)
})

test('ECH: generator output splits into its config and key blocks', () => {
  const out = [
    '-----BEGIN ECH CONFIGS-----', 'AAAA', '-----END ECH CONFIGS-----', '',
    '-----BEGIN ECH KEYS-----', 'BBBB', 'CCCC', '-----END ECH KEYS-----', '',
  ]
  const { config, key } = splitEchPems(out)
  assert.deepEqual(config, ['-----BEGIN ECH CONFIGS-----', 'AAAA', '-----END ECH CONFIGS-----'])
  assert.deepEqual(key, ['-----BEGIN ECH KEYS-----', 'BBBB', 'CCCC', '-----END ECH KEYS-----'])
  assert.deepEqual(splitEchPems(['junk']), { config: [], key: [] })
})

test('inbound switch: absent enable is on; the cap compares like a client quota', () => {
  assert.equal(inboundEnabled({}), true)
  assert.equal(inboundEnabled({ enable: true }), true)
  assert.equal(inboundEnabled({ enable: false }), false)
  assert.equal(inboundEnabled(null), false)
  assert.equal(inboundDepleted({ volume: 0, up: 5, down: 5 }), false)
  assert.equal(inboundDepleted({ volume: 10, up: 5, down: 5 }), false)
  assert.equal(inboundDepleted({ volume: 10, up: 6, down: 5 }), true)
  assert.equal(inboundUsagePercent({ volume: 0, up: 1 }), 0)
  assert.equal(inboundUsagePercent({ volume: 200, up: 50, down: 50 }), 50)
  assert.equal(inboundUsagePercent({ volume: 10, up: 50 }), 100)
})

test('inbound cap: GiB form value round-trips, junk is unlimited', () => {
  assert.equal(gbToBytes(1), 1073741824)
  assert.equal(gbToBytes('1.5'), 1610612736)
  assert.equal(gbToBytes(''), 0)
  assert.equal(gbToBytes(-3), 0)
  assert.equal(gbToBytes('abc'), 0)
  assert.equal(bytesToGb(1610612736), 1.5)
  assert.equal(bytesToGb(0), 0)
  assert.equal(bytesToGb(undefined), 0)
})

test('client pickers mark a switched-off inbound and keep the node prefix', () => {
  assert.equal(inboundPickerTitle({ id: 1, tag: 'vless' }, '', 'off'), 'vless')
  assert.equal(inboundPickerTitle({ id: 1, tag: 'vless', enable: false }, '', 'off'), 'vless (off)')
  assert.equal(inboundPickerTitle({ id: 1, tag: 'vless', enable: false }, 'jp', 'off'), '[jp] vless (off)')
})

test('adopt-time assignment resolves the Users picker like the inbound drawer', () => {
  const clients = [
    { id: 1, group: 'a' }, { id: 2, group: 'b' }, { id: 3, group: '@cluster' }, { id: 4, group: null },
  ]
  assert.deepEqual(bindableClients(clients).map(c => c.id), [1, 2, 4])
  assert.deepEqual(resolveInitUsers('none', [], clients), [])
  assert.deepEqual(resolveInitUsers('all', [], clients), [1, 2, 4])
  assert.deepEqual(resolveInitUsers('group', ['a'], clients), [1])
  assert.deepEqual(resolveInitUsers('client', [2, 3], clients), [2])
  assert.equal(initUsersIncomplete('none', []), false)
  assert.equal(initUsersIncomplete('all', []), false)
  assert.equal(initUsersIncomplete('group', []), true)
  assert.equal(initUsersIncomplete('client', [1]), false)
})

test('new strings exist in every nexus locale', () => {
  for (const [code, msgs] of Object.entries(nexusMessages)) {
    for (const k of ['echPublicName', 'echPublicNameAbout', 'echQueryAbout', 'echQueryDisabled']) {
      assert.ok(msgs.tls[k], `${code}: tls.${k}`)
    }
    for (const k of Object.keys(nexusEnglish.inbound)) {
      assert.ok(msgs.inbound[k], `${code}: inbound.${k}`)
    }
    assert.ok(msgs.actions.resetTraffic, `${code}: actions.resetTraffic`)
    assert.ok(msgs.node.pickClients && msgs.node.noUsers, `${code}: node.pickClients/noUsers`)
  }
})
