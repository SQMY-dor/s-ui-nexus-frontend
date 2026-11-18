// Build the Cloudflare Workers bundle: node cloudflare/build.mjs
// Env: WEB_PATH (panel web path, default /app/), ORIGIN (https://panel.example.com),
//      WORKER_NAME (default s-ui-nexus-web), SKIP_VITE=1 to reuse dist/.
// SPDX-License-Identifier: GPL-3.0-only
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '.cf')

export function normalizeWebPath(p) {
  let v = (p || '/app/').trim()
  if (!v.startsWith('/')) v = '/' + v
  if (!v.endsWith('/')) v += '/'
  if (!/^\/[A-Za-z0-9._~\-/]*$/.test(v) || v.includes('//') || v.includes('..')) throw new Error('invalid WEB_PATH: ' + p)
  return v
}

export function wranglerConfig({ webPath, origin, name }) {
  const api = ['api', 'apiv2', 'apiv3'].flatMap(p => [webPath + p, webPath + p + '/*'])
  return {
    $schema: '../node_modules/wrangler/config-schema.json',
    name,
    main: '../cloudflare/worker.js',
    compatibility_date: '2026-11-18',
    assets: {
      directory: './public',
      binding: 'ASSETS',
      not_found_handling: 'single-page-application',
      run_worker_first: api,
    },
    vars: { ORIGIN: origin },
  }
}

function main() {
  const webPath = normalizeWebPath(process.env.WEB_PATH)
  const origin = process.env.ORIGIN || 'https://panel.example.com'
  const name = process.env.WORKER_NAME || 's-ui-nexus-web'
  if (!/^https?:\/\/[^/]+\/?$/.test(origin)) throw new Error('ORIGIN must be scheme://host[:port] with no path')

  if (!process.env.SKIP_VITE) execSync('npx vite build', { cwd: root, stdio: 'inherit' })
  const dist = join(root, 'dist')
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html missing')

  rmSync(out, { recursive: true, force: true })
  const pub = join(out, 'public')
  const appDir = join(pub, webPath.slice(1))
  mkdirSync(appDir, { recursive: true })
  cpSync(dist, appDir, { recursive: true })

  const html = readFileSync(join(dist, 'index.html'), 'utf8').replace('{{ .BASE_URL }}', webPath)
  writeFileSync(join(appDir, 'index.html'), html)
  // SPA fallback serves /index.html; its relative ./assets links only resolve under webPath,
  // so the fallback copy pins <base> to webPath.
  writeFileSync(join(pub, 'index.html'), html.replace('<head>', `<head>\n  <base href="${webPath}">`))
  writeFileSync(join(pub, '_redirects'), `/ ${webPath} 302\n${webPath.slice(0, -1)} ${webPath} 302\n`)
  writeFileSync(join(pub, '_headers'), [
    `${webPath}assets/*`, '  Cache-Control: public, max-age=31536000, immutable', '',
    '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: same-origin', '',
  ].join('\n'))
  writeFileSync(join(out, 'wrangler.jsonc'), JSON.stringify(wranglerConfig({ webPath, origin, name }), null, 2) + '\n')
  console.log(`Cloudflare bundle ready in .cf/ (web path ${webPath}, origin ${origin}).\nDeploy: npx wrangler deploy -c .cf/wrangler.jsonc`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
