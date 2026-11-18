// S-UI Nexus edge front end for Cloudflare Workers.
// Static assets are served by Workers Static Assets; only API paths reach this
// script (see run_worker_first in the generated wrangler.jsonc) and are proxied
// to the panel origin so the browser stays same-origin (cookies keep working).
// SPDX-License-Identifier: GPL-3.0-only

const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer']

export function buildOriginRequest(request, env) {
  if (!env.ORIGIN) throw new Error('ORIGIN is not configured')
  const origin = new URL(env.ORIGIN)
  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, origin)

  const headers = new Headers(request.headers)
  for (const h of HOP_BY_HOP) headers.delete(h)
  headers.delete('host')
  headers.set('X-Forwarded-Proto', 'https')
  headers.set('X-Forwarded-Host', incoming.host)
  const ip = request.headers.get('CF-Connecting-IP')
  if (ip) headers.set('X-Forwarded-For', ip)
  if (env.ORIGIN_SECRET) headers.set('X-Nexus-Edge-Secret', env.ORIGIN_SECRET)

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  return new Request(target.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
    ...(hasBody ? { duplex: 'half' } : {}),
  })
}

export function rewriteResponse(response, request, env) {
  const location = response.headers.get('Location')
  if (!location) return response
  const origin = new URL(env.ORIGIN)
  const loc = new URL(location, origin)
  if (loc.host !== origin.host) return response
  const incoming = new URL(request.url)
  loc.protocol = incoming.protocol
  loc.host = incoming.host
  const headers = new Headers(response.headers)
  headers.set('Location', loc.toString())
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    try {
      const upstream = await fetch(buildOriginRequest(request, env))
      return rewriteResponse(upstream, request, env)
    } catch (err) {
      return new Response(JSON.stringify({ success: false, msg: 'edge: origin unreachable: ' + (err && err.message) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}
