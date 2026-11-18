import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeResponse } from '../src/plugins/response.ts'
import { parseLogLine, logLevelColor } from '../src/plugins/logs.ts'
import { writeClipboard } from '../src/plugins/clipboard.ts'

test('success without optional fields is accepted; malformed responses are not successes', () => {
  assert.equal(normalizeResponse({ success: true, msg: 'restartSb' }).success, true)
  assert.equal(normalizeResponse({ success: true }).obj, null)
  assert.equal(normalizeResponse({ success: true, warning: 'savedButRefreshFailed' }).warning, 'savedButRefreshFailed')
  for (const value of [null, '', '<html>secret</html>', { success: 'false' }, []]) {
    assert.equal(normalizeResponse(value).success, false)
    assert.ok(!normalizeResponse(value).msg.includes('secret'))
  }
  assert.equal(normalizeResponse({ success: false, msg: 'apply failed' }).msg, 'apply failed')
})

test('log levels and ANSI colors never turn INFO into an error', () => {
  assert.equal(logLevelColor('warn'), 'warning')
  assert.equal(logLevelColor('ERROR'), 'error')
  const line = parseLogLine('\x1b[32m2026/10/02 15:30:00 INFO - closing sing-box\x1b[0m')
  assert.equal(line.level, 'INFO')
  assert.equal(logLevelColor(line.level), 'info')
  assert.equal(line.message, 'closing sing-box')
  assert.equal(parseLogLine('plain text with no level').level, '')
  const multiline = parseLogLine('2026/10/03 08:30:00 WARNING - first line\nsecond line')
  assert.equal(multiline.level, 'WARNING')
  assert.equal(multiline.message, 'first line\nsecond line')
})

test('copy handles HTTPS, denied permission and plain HTTP inside a dialog', async () => {
  let copied = '', restored = false, removed = false
  const container = { appendChild: field => { assert.equal(field.value, 'test-key'); } }
  const active = { closest: () => container, focus: () => { restored = true } }
  const field = { value: '', style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() { removed = true } }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true, getSelection: () => null } })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: active, body: {}, createElement: () => field, execCommand: () => { copied = field.value; return true } } })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => { copied = text } } } })
  assert.equal(await writeClipboard('test-key'), true)
  assert.equal(copied, 'test-key')
  navigator.clipboard.writeText = async () => { throw new Error('NotAllowedError') }
  assert.equal(await writeClipboard('test-key'), true)
  assert.equal(restored && removed, true)
  window.isSecureContext = false
  navigator.clipboard = undefined
  assert.equal(await writeClipboard('test-key'), true)
  document.execCommand = () => false
  assert.equal(await writeClipboard('test-key'), false)
  assert.equal(await writeClipboard(''), false)
})

test('HTTP 401 and the legacy 200 "Invalid login" body are both an invalid login (s-ui-nexus#24)', async () => {
  const { errorToMsg, isInvalidLogin, INVALID_LOGIN } = await import('../src/plugins/response.ts')
  // Current backend: 401 JSON, with or without a body.
  const unauthorized = errorToMsg({ response: { status: 401, data: { success: false, msg: INVALID_LOGIN } }, toString: () => 'AxiosError: Request failed with status code 401' })
  assert.equal(isInvalidLogin(unauthorized), true)
  assert.equal(isInvalidLogin(errorToMsg({ response: { status: 401, data: '' } })), true)
  assert.equal(isInvalidLogin(errorToMsg({ response: { status: 401, data: { success: false, msg: 'invalid token' } } })), true)
  // Legacy backend: 200 body.
  assert.equal(isInvalidLogin(normalizeResponse({ success: false, msg: 'Invalid login' })), true)
  // Not a login problem.
  assert.equal(isInvalidLogin(normalizeResponse({ success: true, msg: 'Invalid login' })), false)
  assert.equal(isInvalidLogin(normalizeResponse({ success: false, msg: 'apply failed' })), false)
  const notFound = errorToMsg({ response: { status: 404, data: { success: false, msg: 'subscription not found' } } })
  assert.equal(notFound.msg, 'subscription not found')
  assert.equal(isInvalidLogin(notFound), false)
  const html = errorToMsg({ response: { status: 502, data: '<html>secret</html>' }, toString: () => 'AxiosError: Request failed with status code 502' })
  assert.ok(!html.msg.includes('secret'))
  assert.equal(errorToMsg(new Error('Network Error')).msg, 'Error: Network Error')
})

test('panel HTTP clients route 401 to the login handler', async () => {
  const { readFileSync } = await import('node:fs')
  const httputil = readFileSync(new URL('../src/plugins/httputil.ts', import.meta.url), 'utf8')
  assert.match(httputil, /msg = errorToMsg\(e\)/)
  assert.doesNotMatch(httputil, /msg: e\.toString\(\)/)
  assert.match(httputil, /isInvalidLogin\(msg\)/)
  const webauthn = readFileSync(new URL('../src/plugins/webauthn.ts', import.meta.url), 'utf8')
  assert.match(webauthn, /errorToMsg\(e\)/)
  assert.doesNotMatch(webauthn, /unwrap\(await api\./)
})
