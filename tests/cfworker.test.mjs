import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOriginRequest, rewriteResponse } from '../cloudflare/worker.js'
import { normalizeWebPath, wranglerConfig } from '../cloudflare/build.mjs'

const env = { ORIGIN: 'https://panel.example.com', ORIGIN_SECRET: 's3' }

test('proxies API to origin with forwarded headers', () => {
  const req = new Request('https://edge.example.com/app/api/load?lu=1', {
    headers: { 'CF-Connecting-IP': '203.0.113.9', Cookie: 's=1', Connection: 'keep-alive', 'X-Forwarded-For': '1.1.1.1' },
  })
  const out = buildOriginRequest(req, env)
  assert.equal(out.url, 'https://panel.example.com/app/api/load?lu=1')
  assert.equal(out.headers.get('x-forwarded-proto'), 'https')
  assert.equal(out.headers.get('x-forwarded-host'), 'edge.example.com')
  assert.equal(out.headers.get('x-forwarded-for'), '203.0.113.9')
  assert.equal(out.headers.get('cookie'), 's=1')
  assert.equal(out.headers.get('x-nexus-edge-secret'), 's3')
  assert.equal(out.headers.get('connection'), null)
})

test('keeps POST body', async () => {
  const req = new Request('https://edge.example.com/app/api/save', { method: 'POST', body: 'a=1' })
  assert.equal(await buildOriginRequest(req, env).text(), 'a=1')
})

test('rewrites origin redirects to edge host only', () => {
  const req = new Request('https://edge.example.com/app/api/x')
  const r1 = rewriteResponse(new Response(null, { status: 302, headers: { Location: 'https://panel.example.com/app/login' } }), req, env)
  assert.equal(r1.headers.get('location'), 'https://edge.example.com/app/login')
  const r2 = rewriteResponse(new Response(null, { status: 302, headers: { Location: 'https://idp.example.org/auth' } }), req, env)
  assert.equal(r2.headers.get('location'), 'https://idp.example.org/auth')
})

test('missing ORIGIN fails closed', () => {
  assert.throws(() => buildOriginRequest(new Request('https://e/app/api'), {}))
})

test('web path normalization and config', () => {
  assert.equal(normalizeWebPath('panel'), '/panel/')
  assert.equal(normalizeWebPath(undefined), '/app/')
  assert.throws(() => normalizeWebPath('/a/../b/'))
  const c = wranglerConfig({ webPath: '/app/', origin: 'https://p', name: 'n' })
  assert.deepEqual(c.assets.run_worker_first, ['/app/api', '/app/api/*', '/app/apiv2', '/app/apiv2/*', '/app/apiv3', '/app/apiv3/*'])
  assert.equal(c.assets.not_found_handling, 'single-page-application')
})
