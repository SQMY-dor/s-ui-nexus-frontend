<template>
  <Drawer
    :is-mobile="isMobile"
    :open="displayDrawer"
    :rail="isRail"
    @update:open="setDrawerOpen"
  />
  <AppBar
    :is-mobile="isMobile"
    :rail="isRail"
    @toggle-drawer="toggleMobileDrawer"
    @toggle-rail="toggleRail"
  />
  <DefaultView />
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import AppBar from './AppBar.vue'
import Drawer from './Drawer.vue'
import DefaultView from './View.vue'

const RAIL_KEY = 'sui-drawer-rail'

const readStoredRail = (): boolean => {
  try {
    return localStorage.getItem(RAIL_KEY) === 'true'
  } catch {
    return false
  }
}

const { width } = useDisplay()
const isMobile = computed(() => width.value < 960)

const displayDrawer = ref(!isMobile.value)
const rail = ref(readStoredRail())
const isRail = computed(() => !isMobile.value && rail.value)

const setDrawerOpen = (open: boolean) => {
  displayDrawer.value = open
}

const toggleMobileDrawer = () => {
  displayDrawer.value = !displayDrawer.value
}

const toggleRail = () => {
  rail.value = !rail.value
  try {
    localStorage.setItem(RAIL_KEY, String(rail.value))
  } catch {
    // Ignore storage write failures in restricted contexts
  }
}

watch(
  isMobile,
  (mobile) => {
    displayDrawer.value = !mobile
  },
  { immediate: true },
)
</script>
