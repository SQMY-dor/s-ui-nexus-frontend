<template>
  <v-navigation-drawer
    :model-value="props.open"
    :mobile="props.isMobile"
    :temporary="props.isMobile"
    :permanent="!props.isMobile"
    :rail="props.rail"
    width="248"
    rail-width="68"
    class="sui-drawer"
    @update:model-value="emit('update:open', $event)"
  >
    <template #prepend>
      <div class="sui-drawer-header" :class="{ 'sui-drawer-header--rail': props.rail }">
        <router-link
          to="/"
          class="sui-drawer-brand-link"
          aria-label="S-UI Nexus"
          @click="onNavItemClick"
        >
          <BrandLogo :size="28" />
          <span v-if="!props.rail" class="sui-drawer-brand text-truncate">S-UI Nexus</span>
        </router-link>
        <v-btn
          v-if="props.isMobile"
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="emit('update:open', false)"
        />
      </div>
      <v-divider />
    </template>

    <v-list density="compact" nav class="sui-nav-list py-2">
      <template v-for="(group, idx) in NAV_GROUPS" :key="group.title">
        <v-list-subheader
          v-if="!props.rail"
          class="sui-nav-group-header"
          :class="{ 'mt-2': idx > 0 }"
        >
          {{ $t(group.title) }}
        </v-list-subheader>
        <v-divider v-else-if="idx > 0" class="my-2 mx-3" />

        <v-tooltip
          v-for="item in group.items"
          :key="item.path"
          :text="$t(item.title)"
          location="end"
          :disabled="!props.rail"
        >
          <template #activator="{ props: tooltipProps }">
            <v-list-item
              v-bind="tooltipProps"
              :to="item.path"
              :prepend-icon="item.icon"
              :title="props.rail ? undefined : $t(item.title)"
              :aria-label="$t(item.title)"
              :active="route.path === item.path"
              color="primary"
              rounded="md"
              class="sui-nav-item"
              @click="onNavItemClick"
            />
          </template>
        </v-tooltip>
      </template>
    </v-list>

    <template #append>
      <v-divider />
      <v-list density="compact" nav class="py-2">
        <v-tooltip
          :text="$t('menu.logout')"
          location="end"
          :disabled="!props.rail"
        >
          <template #activator="{ props: tooltipProps }">
            <v-list-item
              v-bind="tooltipProps"
              role="button"
              tabindex="0"
              prepend-icon="mdi-logout"
              :title="props.rail ? undefined : $t('menu.logout')"
              :aria-label="$t('menu.logout')"
              rounded="md"
              class="sui-nav-item sui-logout-item"
              @click="logout"
              @keydown.enter.prevent="logout"
              @keydown.space.prevent="logout"
            />
          </template>
        </v-tooltip>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import { logout } from '@/plugins/httputil'
import { NAV_GROUPS } from './navigation'

const props = defineProps<{
  isMobile: boolean
  open: boolean
  rail: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const route = useRoute()

const onNavItemClick = () => {
  if (props.isMobile) {
    emit('update:open', false)
  }
}
</script>

<style scoped>
.sui-drawer {
  border-inline-end-color: var(--sui-hairline);
}

.sui-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: var(--sui-topbar-height, 56px);
  padding-inline: 16px;
}

.sui-drawer-header--rail {
  padding-inline: 0;
  justify-content: center;
}

.sui-drawer-brand-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}

.sui-drawer-brand {
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.sui-nav-group-header {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  min-height: 28px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding-inline: 12px;
}

.sui-nav-item {
  position: relative;
  min-height: 38px;
  --v-list-prepend-gap: 12px;
  transition: background-color 140ms ease, color 140ms ease;
}

.sui-nav-item.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.12);
  font-weight: 600;
}

.sui-nav-item.v-list-item--active > :deep(.v-list-item__overlay) {
  opacity: 0;
}

.sui-nav-item.v-list-item--active:hover > :deep(.v-list-item__overlay) {
  opacity: 0.05;
}

.sui-nav-item.v-list-item--active::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-start-end-radius: 3px;
  border-end-end-radius: 3px;
  background-color: rgb(var(--v-theme-primary));
}

.sui-drawer.v-navigation-drawer--rail .sui-nav-item {
  grid-template-areas: 'prepend';
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}

.sui-drawer.v-navigation-drawer--rail .sui-nav-item :deep(.v-list-item__spacer),
.sui-drawer.v-navigation-drawer--rail .sui-nav-item :deep(.v-list-item__content),
.sui-drawer.v-navigation-drawer--rail .sui-nav-item :deep(.v-list-item__append) {
  display: none;
}

.sui-logout-item:hover {
  color: rgb(var(--v-theme-error));
}
</style>
