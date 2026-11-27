/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Composables
import { createApp, defineAsyncComponent, ref } from 'vue'

// Components
import App from './App.vue'

// Use router
import router from './router'

// Store
import store from './store'

// Plugins
import { registerPlugins } from '@/plugins'

// Locale
import { i18n } from '@/locales'
import JsonObjectEditor from '@/components/JsonObjectEditor.vue'

// Notivue
import { createNotivue } from 'notivue'
import 'notivue/notification.css'
import 'notivue/animations.css'
import '@/styles/design-system.scss'
const notivue = createNotivue({
  position: 'bottom-center',
  limit: 4,
  enqueue: false,
  avoidDuplicates: true,
  notifications: {
    global: {
      duration: 3000
    }
  },
})

// The date picker pulls in moment + moment-jalaali; load it only when a page
// actually renders one so it stays out of the login bundle.
const DatePicker = defineAsyncComponent(() => import('vue3-persian-datetime-picker'))

const loading = ref(false)

const app = createApp(App)
app.provide('loading', loading)

registerPlugins(app)

app
  .use(router)
  .use(store)
  .use(i18n)
  .use(notivue)
  .component('DatePicker', DatePicker)
  .component('JsonObjectEditor', JsonObjectEditor)
  .mount('#app')
