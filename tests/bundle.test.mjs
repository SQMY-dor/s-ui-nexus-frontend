// Bundle regressions for s-ui-nexus#26.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { mdiWoff2Only } from '../scripts/vite-mdi-woff2.mjs'

const require = createRequire(import.meta.url)

test('MDI @font-face keeps only the woff2 source', () => {
  const css = readFileSync(require.resolve('@mdi/font/css/materialdesignicons.css'), 'utf8')
  const out = mdiWoff2Only(css)
  const face = out.match(/@font-face\s*\{[^}]*\}/)[0]
  assert.match(face, /materialdesignicons-webfont\.woff2[^"]*"\) format\("woff2"\)/)
  assert.doesNotMatch(out, /webfont\.(eot|ttf|woff)\b(?!2)/)
  assert.match(face, /font-family: "Material Design Icons"/)
  // icon classes untouched
  assert.equal(out.length > css.length - 600, true)
  assert.match(out, /\.mdi-abacus::before/)
})

test('other @font-face blocks are left alone', () => {
  const css = '@font-face { font-family: "X"; src: url(a.ttf) format("truetype"); }'
  assert.equal(mdiWoff2Only(css), css)
})

test('missing woff2 source fails loudly', () => {
  assert.throws(() => mdiWoff2Only('@font-face { font-family: "Material Design Icons"; src: url(a.ttf); }'))
})
