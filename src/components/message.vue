<template>
  <Notivue v-slot="item">
    <NotivueSwipe :item="item">
      <Notification
        :item="item"
        :theme="theme"
        :dir="direction"
        :icons="outlinedIcons"
        :hideClose="true"
        @click="item.clear"
      />
    </NotivueSwipe>
  </Notivue>
</template>

<script lang="ts" setup>
import {
  Notivue,
  Notification,
  NotivueSwipe,
  outlinedIcons,
  lightTheme,
  darkTheme,
  type NotivueTheme,
} from 'notivue'
import { computed } from 'vue'
import { useRtl, useTheme } from 'vuetify'

const Theme = useTheme()
const { isRtl } = useRtl()

const suiLightToast: NotivueTheme = {
  ...lightTheme,
  '--nv-global-bg': '#FFFFFF',
  '--nv-global-fg': '#0F172A',
  '--nv-global-border': '#CBD5E1',
  '--nv-global-accent': '#0F766E',
  '--nv-success-accent': '#15803D',
  '--nv-error-accent': '#DC2626',
  '--nv-warning-accent': '#B45309',
  '--nv-info-accent': '#0369A1',
  '--nv-promise-accent': '#0F766E',
  '--nv-tip-width': '3px',
  '--nv-border-width': '1px',
  '--nv-radius': '10px',
  '--nv-width': 'min(420px, calc(100vw - 24px))',
  '--nv-shadow': '0 10px 30px -10px rgba(15, 23, 42, 0.14), 0 4px 12px -4px rgba(15, 23, 42, 0.08)',
}

const suiDarkToast: NotivueTheme = {
  ...darkTheme,
  '--nv-global-bg': '#151E2E',
  '--nv-global-fg': '#E2E8F0',
  '--nv-global-border': '#334155',
  '--nv-global-accent': '#2DD4BF',
  '--nv-success-accent': '#34D399',
  '--nv-error-accent': '#F87171',
  '--nv-warning-accent': '#FBBF24',
  '--nv-info-accent': '#38BDF8',
  '--nv-promise-accent': '#2DD4BF',
  '--nv-tip-width': '3px',
  '--nv-border-width': '1px',
  '--nv-radius': '10px',
  '--nv-width': 'min(420px, calc(100vw - 24px))',
  '--nv-shadow': '0 14px 36px -10px rgba(0, 0, 0, 0.55), 0 4px 14px -4px rgba(0, 0, 0, 0.35)',
}

const theme = computed<NotivueTheme>(() =>
  Theme.global.current.value.dark ? suiDarkToast : suiLightToast
)

const direction = computed<'rtl' | 'ltr'>(() => (isRtl.value ? 'rtl' : 'ltr'))
</script>

<style>
:root {
  --nv-z: 10020;
}
</style>