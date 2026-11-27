<template>
  <v-app-bar flat elevation="0" height="56" class="sui-topbar px-2 px-sm-3">
    <v-btn
      v-if="props.isMobile"
      icon="mdi-menu"
      variant="text"
      size="small"
      :aria-label="$t('ui.expandSidebar')"
      @click="emit('toggleDrawer')"
    />
    <v-btn
      v-else
      :icon="props.rail ? 'mdi-menu' : 'mdi-menu-open'"
      variant="text"
      size="small"
      :class="{ 'sui-flip-rtl': !props.rail }"
      :aria-label="props.rail ? $t('ui.expandSidebar') : $t('ui.collapseSidebar')"
      :title="props.rail ? $t('ui.expandSidebar') : $t('ui.collapseSidebar')"
      @click="emit('toggleRail')"
    />

    <div class="sui-topbar-heading d-flex align-center ms-1">
      <template v-if="navMatch">
        <span class="sui-topbar-group text-body-2 text-medium-emphasis d-none d-sm-inline text-truncate">
          {{ $t(navMatch.groupTitle) }}
        </span>
        <v-icon
          :icon="isRtl ? 'mdi-chevron-left' : 'mdi-chevron-right'"
          size="16"
          class="mx-1 text-medium-emphasis d-none d-sm-inline-flex flex-shrink-0"
          aria-hidden="true"
        />
      </template>
      <span class="sui-topbar-title text-truncate">{{ pageTitle }}</span>
    </div>

    <v-spacer />

    <div class="d-flex align-center ga-1 flex-shrink-0">
      <v-menu location="bottom end">
        <template #activator="{ props: activatorProps }">
          <v-btn
            icon
            variant="text"
            size="small"
            v-bind="activatorProps"
            :aria-label="currentLangTitle"
            :title="currentLangTitle"
          >
            <v-icon icon="mdi-translate" size="20" />
          </v-btn>
        </template>
        <v-list density="compact" nav min-width="160">
          <v-list-item
            v-for="lang in languages"
            :key="lang.value"
            :active="isActiveLocale(lang.value)"
            color="primary"
            rounded="md"
            @click="changeLocale(lang.value)"
          >
            <v-list-item-title>{{ lang.title }}</v-list-item-title>
            <template v-if="isActiveLocale(lang.value)" #append>
              <v-icon icon="mdi-check" size="16" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu location="bottom end">
        <template #activator="{ props: activatorProps }">
          <v-btn
            icon
            variant="text"
            size="small"
            v-bind="activatorProps"
            :aria-label="$t(`theme.${selectedTheme}`)"
            :title="$t(`theme.${selectedTheme}`)"
          >
            <v-icon :icon="currentThemeIcon" size="20" />
          </v-btn>
        </template>
        <v-list density="compact" nav min-width="160">
          <v-list-item
            v-for="th in themes"
            :key="th.value"
            :prepend-icon="th.icon"
            :active="selectedTheme === th.value"
            color="primary"
            rounded="md"
            @click="changeTheme(th.value)"
          >
            <v-list-item-title>{{ $t(`theme.${th.value}`) }}</v-list-item-title>
            <template v-if="selectedTheme === th.value" #append>
              <v-icon icon="mdi-check" size="16" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useLocale, useRtl, useTheme } from 'vuetify'
import { languages } from '@/locales'
import { findNavMatch } from './navigation'

const props = defineProps<{
  isMobile: boolean
  rail: boolean
}>()

const emit = defineEmits<{
  toggleDrawer: []
  toggleRail: []
}>()

const route = useRoute()
const { locale: i18nLocale, t } = useI18n()
const vuetifyLocale = useLocale()
const { isRtl } = useRtl()
const theme = useTheme()

const navMatch = computed(() => findNavMatch(route.path))
const pageTitle = computed(() => {
  if (route.name) return t(String(route.name))
  if (navMatch.value) return t(navMatch.value.itemTitle)
  return ''
})

const currentLangTitle = computed(() => {
  const match = languages.find((lang) => lang.value === i18nLocale.value)
  return match?.title ?? 'Language'
})

const changeLocale = (l: string) => {
  if (i18nLocale.value === l) return
  i18nLocale.value = l
  vuetifyLocale.current.value = l
  localStorage.setItem('locale', l)
  window.location.reload()
}

const isActiveLocale = (l: string) => i18nLocale.value === l

const themes = [
  { value: 'light', icon: 'mdi-white-balance-sunny' },
  { value: 'dark', icon: 'mdi-moon-waning-crescent' },
  { value: 'system', icon: 'mdi-laptop' },
] as const

const selectedTheme = computed<'light' | 'dark' | 'system'>(() => {
  if (theme.isSystem.value) return 'system'
  return theme.name.value === 'dark' ? 'dark' : 'light'
})

const currentThemeIcon = computed(() => {
  if (selectedTheme.value === 'light') return 'mdi-white-balance-sunny'
  if (selectedTheme.value === 'dark') return 'mdi-moon-waning-crescent'
  return 'mdi-theme-light-dark'
})

const changeTheme = (th: 'light' | 'dark' | 'system') => {
  theme.change(th)
  localStorage.setItem('theme', th)
}
</script>

<style scoped>
.sui-topbar.v-app-bar.v-toolbar {
  background: var(--sui-topbar-bg);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--sui-hairline);
  box-shadow: none;
}

.sui-topbar-heading {
  gap: 2px;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
}

.sui-topbar-group {
  font-size: 0.875rem;
  font-weight: 400;
}

.sui-topbar-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.005em;
}
</style>
