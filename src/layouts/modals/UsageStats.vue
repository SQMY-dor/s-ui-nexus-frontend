<template>
  <v-dialog
    :model-value="visible"
    transition="dialog-bottom-transition"
    width="100%"
    max-width="460"
    @update:model-value="$emit('update:visible', $event)"
  >
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-chart-box-outline" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('main.stats.title') }}
          </div>
        </div>
        <div class="d-flex align-center ga-1 flex-shrink-0">
          <v-btn
            icon="mdi-refresh"
            variant="text"
            size="small"
            :loading="loading"
            :aria-label="$t('actions.update')"
            @click="refresh"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="$emit('update:visible', false)"
          />
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <div class="sui-section-header">
          <span>{{ $t('count') }}</span>
        </div>
        <div class="sui-stats-panel mb-4">
          <dl class="sui-kv-list">
            <div v-for="row in countRows" :key="row.key" class="sui-kv-row">
              <dt class="sui-kv-label d-inline-flex align-center ga-2">
                <v-icon :icon="row.icon" size="16" />
                <span>{{ row.label }}</span>
              </dt>
              <dd class="sui-kv-value sui-num" dir="ltr">{{ row.value }}</dd>
            </div>
          </dl>
        </div>

        <div class="sui-section-header">
          <span>{{ $t('stats.usage') }}</span>
        </div>
        <div class="sui-stats-panel">
          <dl class="sui-kv-list">
            <div v-for="row in usageRows" :key="row.key" class="sui-kv-row">
              <dt class="sui-kv-label d-inline-flex align-center ga-2">
                <v-icon :icon="row.icon" size="16" :color="row.color" />
                <span>{{ row.label }}</span>
              </dt>
              <dd
                class="sui-kv-value sui-num font-weight-semibold"
                :class="row.color ? `text-${row.color}` : ''"
                dir="ltr"
              >
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="$emit('update:visible', false)">
          {{ $t('actions.close') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { computed, ref, watch } from 'vue'
import HttpUtils from '@/plugins/httputil'
import { HumanReadable } from '@/plugins/utils'
import { i18n } from '@/locales'

export default {
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible'],
  setup(props) {
    const loading = ref(false)
    const info = ref<{
      clients?: number
      inbounds?: number
      outbounds?: number
      services?: number
      endpoints?: number
      clientUp?: number
      clientDown?: number
    }>({})

    const clientUp = computed(() => HumanReadable.sizeFormat(info.value.clientUp ?? 0))
    const clientDown = computed(() => HumanReadable.sizeFormat(info.value.clientDown ?? 0))
    const totalUsage = computed(() => {
      const up = info.value.clientUp ?? 0
      const down = info.value.clientDown ?? 0
      return HumanReadable.sizeFormat(up + down)
    })

    const countRows = computed(() => {
      const t = (key: string) => i18n.global.t(key)
      return [
        { key: 'clients', icon: 'mdi-account-multiple-outline', label: t('pages.clients'), value: info.value.clients ?? 0 },
        { key: 'inbounds', icon: 'mdi-import', label: t('pages.inbounds'), value: info.value.inbounds ?? 0 },
        { key: 'outbounds', icon: 'mdi-export', label: t('pages.outbounds'), value: info.value.outbounds ?? 0 },
        { key: 'services', icon: 'mdi-cog-outline', label: t('pages.services'), value: info.value.services ?? 0 },
        { key: 'endpoints', icon: 'mdi-vpn', label: t('pages.endpoints'), value: info.value.endpoints ?? 0 },
      ]
    })

    const usageRows = computed(() => {
      const t = (key: string) => i18n.global.t(key)
      return [
        { key: 'clientUp', icon: 'mdi-arrow-up', label: t('stats.upload'), value: clientUp.value, color: 'upload' },
        { key: 'clientDown', icon: 'mdi-arrow-down', label: t('stats.download'), value: clientDown.value, color: 'download' },
        { key: 'totalUsage', icon: 'mdi-chart-box-outline', label: t('main.stats.totalUsage'), value: totalUsage.value, color: 'primary' },
      ]
    })

    const tableRows = computed(() => [
      ...countRows.value.map(r => ({ ...r, color: undefined })),
      ...usageRows.value,
    ])

    const refresh = async () => {
      loading.value = true
      const data = await HttpUtils.get('api/status', { r: 'db' })
      if (data.success && data.obj) {
        info.value = data.obj.db ?? data.obj
      }
      loading.value = false
    }

    watch(() => props.visible, (v) => {
      if (v) refresh()
    })

    return {
      loading,
      info,
      clientUp,
      clientDown,
      totalUsage,
      countRows,
      usageRows,
      tableRows,
      refresh,
    }
  },
}
</script>

<style scoped>
.sui-stats-panel {
  padding: 12px 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}
</style>
