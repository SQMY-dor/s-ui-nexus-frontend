// Plugins
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import mdiWoff2 from './scripts/vite-mdi-woff2.mjs'

// Vendor groups for code splitting. A group chunk is only loaded by the chunks
// that use it, so chart/qr/yaml/date-picker code stays off the login page.
const vendorGroups = [
  { name: 'vendor-vue', test: /[\\/]node_modules[\\/](@vue|vue|vue-router|pinia|vue-i18n|@intlify)[\\/]/, priority: 30 },
  { name: 'vendor-vuetify', test: /[\\/]node_modules[\\/](@vuetify|vuetify)[\\/]/, priority: 25 },
  { name: 'vendor-chart', test: /[\\/]node_modules[\\/](chart\.js|vue-chartjs|@kurkle)[\\/]/, priority: 20 },
  { name: 'vendor-qr', test: /[\\/]node_modules[\\/](qrcode\.vue|qrcode)[\\/]/, priority: 20 },
  { name: 'vendor-datepicker', test: /[\\/]node_modules[\\/](vue3-persian-datetime-picker|moment|moment-jalaali|jalaali-js)[\\/]/, priority: 20 },
  { name: 'vendor-yaml', test: /[\\/]node_modules[\\/]yaml[\\/]/, priority: 20 },
]

// The Go backend embeds dist/ with `//go:embed *`, which skips files whose
// names start with '.' or '_' (e.g. Vite's `_plugin-vue_export-helper`).
// Strip such prefixes so every chunk actually ships.
const embedSafe = (name: string) => name.replace(/^[._]+/, '') || 'chunk'
const jsFileName = (chunk: { name: string }) => 'assets/' + embedSafe(chunk.name) + '-[hash].js'

export default defineConfig({
  base: '',
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    mdiWoff2(),
    vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    })
  ],
  build: {
    manifest: false,
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: { groups: vendorGroups },
        // Content hashes: assets/ is served with immutable caching, so a
        // file name must change whenever its content does.
        entryFileNames: jsFileName,
        chunkFileNames: jsFileName,
        assetFileNames: (assetInfo) => {
          const rawName = assetInfo.names.find(name => name.endsWith('.css')) ?? assetInfo.names[0] ?? 'asset'
          const dotIdx = rawName.lastIndexOf('.')
          const base = dotIdx > 0 ? rawName.slice(0, dotIdx) : rawName
          const ext = dotIdx > 0 ? rawName.slice(dotIdx) : ''
          return 'assets/' + embedSafe(base) + '-[hash]' + ext
        },
      },
    }
  },
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  server: {
    port: 3000,
    proxy: {
      '/app/api': {
        target: 'http://localhost:2095',
        changeOrigin: true,
      },
    },
  }
})
