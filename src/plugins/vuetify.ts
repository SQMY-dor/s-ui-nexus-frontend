/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles/main.css'

import { fa, en, vi, zhHans, zhHant, ru } from 'vuetify/locale'

// Composables
import { createVuetify } from 'vuetify'

const readStoredTheme = (): 'light' | 'dark' | 'system' => {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // Ignore storage access failures in restricted contexts
  }
  return 'system'
}

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  defaults: {
    VRow: { density: 'compact' },
    VCard: { elevation: 0, border: true, rounded: 'lg' },
    VBtn: { rounded: 'md', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'compact', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'compact', color: 'primary' },
    VCombobox: { variant: 'outlined', density: 'compact', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'compact', color: 'primary' },
    VSwitch: { color: 'primary', inset: true, density: 'compact' },
    VChip: { rounded: 'md', size: 'small' },
    VTabs: { color: 'primary', density: 'comfortable' },
    VAlert: { variant: 'tonal', rounded: 'lg', density: 'comfortable' },
  },
  theme: {
    defaultTheme: readStoredTheme(),
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F4F6F9',
          surface: '#FFFFFF',
          'surface-bright': '#FFFFFF',
          'surface-light': '#F8FAFC',
          'surface-variant': '#E2E8F0',
          'on-background': '#0F172A',
          'on-surface': '#0F172A',
          'on-surface-variant': '#1E293B',
          primary: '#0F766E',
          'primary-darken-1': '#115E59',
          'on-primary': '#FFFFFF',
          secondary: '#475569',
          'on-secondary': '#FFFFFF',
          success: '#15803D',
          'on-success': '#FFFFFF',
          warning: '#B45309',
          'on-warning': '#FFFFFF',
          error: '#DC2626',
          'on-error': '#FFFFFF',
          info: '#0369A1',
          'on-info': '#FFFFFF',
          grey: '#64748B',
          'on-grey': '#FFFFFF',
          upload: '#C2410C',
          download: '#047857',
          outline: '#CBD5E1',
        },
        variables: {
          'border-color': '#0F172A',
          'border-opacity': 0.10,
          'medium-emphasis-opacity': 0.68,
          'hover-opacity': 0.05,
        },
      },
      dark: {
        dark: true,
        colors: {
          background: '#0E141F',
          surface: '#151E2E',
          'surface-bright': '#1C273B',
          'surface-light': '#1B2639',
          'surface-variant': '#243044',
          'on-background': '#E2E8F0',
          'on-surface': '#E2E8F0',
          'on-surface-variant': '#E2E8F0',
          primary: '#2DD4BF',
          'primary-darken-1': '#14B8A6',
          'on-primary': '#042F2E',
          secondary: '#94A3B8',
          'on-secondary': '#0F172A',
          success: '#34D399',
          'on-success': '#052E16',
          warning: '#FBBF24',
          'on-warning': '#451A03',
          error: '#F87171',
          'on-error': '#450A0A',
          info: '#38BDF8',
          'on-info': '#082F49',
          grey: '#94A3B8',
          'on-grey': '#0F172A',
          upload: '#FB923C',
          download: '#34D399',
          outline: '#334155',
        },
        variables: {
          'border-color': '#CBD5E1',
          'border-opacity': 0.12,
          'medium-emphasis-opacity': 0.72,
          'hover-opacity': 0.07,
        },
      },
    },
  },
  locale: {
    locale: localStorage.getItem('locale') ?? 'en',
    fallback: 'en',
    messages: { en, fa, vi, zhHans, zhHant, ru },
  },
})
