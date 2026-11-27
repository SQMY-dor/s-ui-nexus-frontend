<template>
  <div class="sui-settings-tools-page">
    <PageHeader :title="$t('pages.settings')" />

    <div class="sui-luci-tabs-bar mb-4">
      <v-tabs v-model="tab" color="primary" density="comfortable" show-arrows>
        <v-tab value="settings" prepend-icon="mdi-cog-outline">
          {{ $t('settingsTools.settings') }}
        </v-tab>
        <v-tab value="tools" prepend-icon="mdi-wrench-outline">
          {{ $t('settingsTools.tools') }}
        </v-tab>
      </v-tabs>
    </div>

    <v-window v-model="tab" :touch="false">
      <v-window-item value="settings">
        <Settings />
      </v-window-item>
      <v-window-item value="tools">
        <Tools />
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import Settings from './Settings.vue'
import Tools from './Tools.vue'

const route = useRoute()
const router = useRouter()

const tab = computed({
  get: () => (route.query.tab === 'tools' ? 'tools' : 'settings'),
  set: (value) => {
    router.replace({ query: { ...route.query, tab: value } })
  },
})
</script>

<style scoped>
.sui-luci-tabs-bar {
  border-bottom: 1px solid var(--sui-hairline);
}
</style>
