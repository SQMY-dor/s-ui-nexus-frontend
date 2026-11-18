// Vite plugin: ship only the woff2 build of the Material Design Icons font.
//
// @mdi/font's CSS lists eot + woff2 + woff + ttf, so Vite copies all four
// (~3.6 MB) into dist/assets. Every browser the panel targets supports woff2,
// so the @font-face is rewritten to reference woff2 alone and the other
// formats are never emitted. Icons still use the same font and class names.
// SPDX-License-Identifier: GPL-3.0-only

const MDI_CSS = /[\\/]@mdi[\\/]font[\\/]css[\\/]materialdesignicons(\.min)?\.css$/

/** Rewrite the @font-face src of materialdesignicons.css to woff2 only. */
export function mdiWoff2Only(css) {
  return css.replace(/@font-face\s*\{[^}]*\}/g, (block) => {
    if (!/Material Design Icons/.test(block)) return block
    const woff2 = block.match(/url\(\s*["']?([^"')]*materialdesignicons-webfont\.woff2[^"')]*)["']?\s*\)/)
    if (!woff2) throw new Error('mdi-woff2: woff2 source not found in @font-face')
    const body = block
      .replace(/\s*src\s*:[^;}]*;?/g, '')
      .replace(/\{/, `{\n  src: url("${woff2[1]}") format("woff2");`)
    return body
  })
}

export default function mdiWoff2() {
  return {
    name: 's-ui:mdi-woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!MDI_CSS.test(id.split('?')[0])) return null
      return { code: mdiWoff2Only(code), map: null }
    },
  }
}
