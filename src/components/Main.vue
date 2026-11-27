<template>
  <div class="sui-dashboard">
    <LogVue v-model="logModal.visible" :visible="logModal.visible" :control="logModal" />
    <Backup v-model="backupModal.visible" :visible="backupModal.visible" :control="backupModal" />
    <UsageStats v-model:visible="usageStatsModal.visible" />

    <PageHeader
      :title="$t('dashboard.title')"
      :subtitle="$t('dashboard.subtitle')"
    >
      <template #actions>
        <v-chip
          size="small"
          variant="outlined"
          :color="loadFailed ? 'warning' : 'secondary'"
          class="sui-num sui-updated-chip"
        >
          <template #prepend>
            <span
              class="sui-status-dot me-1"
              :class="loadFailed ? 'sui-status-dot--warning' : 'sui-status-dot--success'"
              aria-hidden="true"
            />
          </template>
          {{ updatedAt ? $t('dashboard.updated', { time: updatedAt }) : $t('loading') }}
        </v-chip>
        <v-btn
          icon="mdi-refresh"
          variant="tonal"
          size="small"
          :loading="refreshing"
          :aria-label="$t('actions.update')"
          :title="$t('actions.update')"
          @click="refresh"
        />
      </template>
    </PageHeader>

    <v-alert
      v-if="loadFailed"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4 sui-stale-alert"
    >
      {{ $t('dashboard.stale') }}
    </v-alert>

    <!-- Core Hero + 4 Summary KPI Cards -->
    <v-row class="mb-2">
      <v-col cols="12" lg="5">
        <v-card class="sui-core-card h-100">
          <v-card-text class="d-flex flex-column h-100 pa-4">
            <div class="d-flex align-center ga-3">
              <v-avatar color="primary" variant="tonal" size="42" rounded="md">
                <v-icon icon="mdi-server-network" size="22" />
              </v-avatar>
              <div class="min-w-0 flex-grow-1">
                <div class="text-overline text-medium-emphasis sui-core-overline">SING-BOX</div>
                <div class="text-subtitle-1 font-weight-semibold text-truncate">
                  {{ $t('main.info.sbd') }}
                </div>
              </div>
              <v-chip :color="coreColor" variant="outlined" size="small" class="font-weight-medium">
                <template #prepend>
                  <span
                    class="sui-status-dot me-1"
                    :class="`sui-status-dot--${coreColor}`"
                    aria-hidden="true"
                  />
                </template>
                {{ $t(coreLabel) }}
              </v-chip>
            </div>

            <div class="sui-core-metrics my-4">
              <div class="sui-core-metric">
                <div class="sui-core-metric__label text-medium-emphasis">
                  {{ $t('main.info.uptime') }}
                </div>
                <div class="sui-core-metric__value sui-num" dir="ltr">
                  {{ duration(tilesData.sbd?.stats?.Uptime) }}
                </div>
              </div>
              <div class="sui-core-metric">
                <div class="sui-core-metric__label text-medium-emphasis">
                  {{ $t('main.info.memory') }}
                </div>
                <div class="sui-core-metric__value sui-num" dir="ltr">
                  {{ size(tilesData.sbd?.stats?.Alloc) }}
                </div>
              </div>
              <div class="sui-core-metric">
                <div class="sui-core-metric__label text-medium-emphasis">
                  {{ $t('main.info.threads') }}
                </div>
                <div class="sui-core-metric__value sui-num" dir="ltr">
                  {{ tilesData.sbd?.stats?.NumGoroutine ?? '—' }}
                </div>
              </div>
            </div>

            <div class="d-flex flex-wrap align-center ga-2 mt-auto">
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-restart"
                :loading="restarting"
                :disabled="refreshing || restarting"
                @click="restartSingbox"
              >
                {{ $t('actions.restartSb') }}
              </v-btn>
              <v-btn
                to="/config"
                variant="outlined"
                color="secondary"
                size="small"
                prepend-icon="mdi-tune-vertical"
              >
                {{ $t('pages.config') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="7">
        <v-row class="h-100">
          <v-col
            v-for="summary in summaries"
            :key="summary.title"
            cols="6"
          >
            <v-card
              :to="summary.path"
              class="sui-resource-card sui-kpi-card h-100"
            >
              <v-card-text class="d-flex flex-column h-100 pa-4">
                <div class="d-flex align-center justify-space-between ga-2">
                  <div class="d-flex align-center ga-2 min-w-0">
                    <v-avatar :color="summary.color" variant="tonal" size="34" rounded="md">
                      <v-icon :icon="summary.icon" size="18" />
                    </v-avatar>
                    <span class="text-body-2 font-weight-medium text-medium-emphasis text-truncate">
                      {{ $t(summary.title) }}
                    </span>
                  </div>
                  <v-icon
                    icon="mdi-chevron-right"
                    size="16"
                    class="sui-kpi-chevron sui-flip-rtl text-medium-emphasis flex-shrink-0"
                    aria-hidden="true"
                  />
                </div>
                <div class="sui-kpi-value sui-num my-2">{{ summary.value }}</div>
                <div class="text-caption text-medium-emphasis sui-num text-truncate mt-auto">
                  {{ summary.detail }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Resources & Traffic Telemetry Tiles -->
    <div class="sui-section-header mt-6">
      <span class="d-inline-flex align-center ga-2">
        <v-icon icon="mdi-chart-areaspline" size="16" />
        {{ $t('dashboard.resources') }}
      </span>
      <v-btn
        variant="tonal"
        size="small"
        prepend-icon="mdi-tune"
        @click="menu = true"
      >
        {{ $t('main.tiles') }}
      </v-btn>
    </div>

    <v-row>
      <v-col
        v-for="item in selectedTiles"
        :key="item.value"
        cols="12"
        sm="6"
        :lg="item.value.startsWith('h') ? 6 : 3"
      >
        <v-card class="sui-resource-card sui-tile-card" height="248">
          <div class="sui-tile-card__header">
            <v-icon :icon="item.icon" size="16" color="secondary" />
            <span class="text-subtitle-2 text-truncate">{{ $t(item.title) }}</span>
          </div>
          <v-card-text class="sui-tile-card__body">
            <Gauge v-if="item.value.startsWith('g')" :tiles-data="tilesData" :type="item.value" />
            <History v-else :tiles-data="tilesData" :type="item.value" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Logs + System Info & Quick Actions -->
    <v-row class="mt-4">
      <v-col cols="12" lg="8">
        <v-card class="sui-logs-card">
          <div class="sui-card-bar">
            <div class="d-flex align-center ga-2 min-w-0">
              <v-icon icon="mdi-console-line" size="18" color="secondary" />
              <span class="text-subtitle-2 font-weight-semibold text-truncate">
                {{ $t('dashboard.recentLogs') }}
              </span>
            </div>
            <v-btn
              variant="tonal"
              size="small"
              prepend-icon="mdi-text-box-outline"
              @click="logModal.visible = true"
            >
              {{ $t('dashboard.viewLogs') }}
            </v-btn>
          </div>
          <v-divider />
          <LogLines :lines="logs" />
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="mb-4">
          <div class="sui-card-bar">
            <div class="d-flex align-center ga-2 min-w-0">
              <v-icon icon="mdi-desktop-classic" size="18" color="secondary" />
              <span class="text-subtitle-2 font-weight-semibold text-truncate">
                {{ $t('main.info.sys') }}
              </span>
            </div>
          </div>
          <v-divider />
          <v-card-text class="pa-4">
            <dl class="sui-kv-list sui-sys-kv">
              <div class="sui-kv-row sui-sys-kv__row">
                <dt class="sui-kv-label">{{ $t('main.info.host') }}</dt>
                <dd class="sui-kv-value sui-mono">{{ tilesData.sys?.hostName || '—' }}</dd>
              </div>
              <div class="sui-kv-row sui-sys-kv__row">
                <dt class="sui-kv-label">{{ $t('version') }}</dt>
                <dd class="sui-kv-value sui-mono">S-UI Next {{ tilesData.sys?.appVersion || '—' }}</dd>
              </div>
              <div class="sui-kv-row sui-sys-kv__row">
                <dt class="sui-kv-label">{{ $t('main.info.cpu') }}</dt>
                <dd class="sui-kv-value sui-num" :title="tilesData.sys?.cpuType">
                  {{ tilesData.sys?.cpuCount ?? '—' }} {{ $t('main.info.core') }}
                </dd>
              </div>
              <div class="sui-kv-row sui-sys-kv__row">
                <dt class="sui-kv-label">{{ $t('main.info.uptime') }}</dt>
                <dd class="sui-kv-value sui-num" dir="ltr">
                  {{ tilesData.sys?.bootTime ? duration(Date.now() / 1000 - tilesData.sys.bootTime) : '—' }}
                </dd>
              </div>
            </dl>
          </v-card-text>
        </v-card>

        <v-card>
          <div class="sui-card-bar">
            <div class="d-flex align-center ga-2 min-w-0">
              <v-icon icon="mdi-lightning-bolt-outline" size="18" color="secondary" />
              <span class="text-subtitle-2 font-weight-semibold text-truncate">
                {{ $t('dashboard.quickActions') }}
              </span>
            </div>
          </div>
          <v-divider />
          <v-card-text class="pa-3 d-flex flex-column ga-2">
            <v-btn
              block
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-backup-restore"
              class="sui-quick-btn justify-start"
              @click="backupModal.visible = true"
            >
              <span class="flex-grow-1 text-start">{{ $t('main.backup.title') }}</span>
              <v-icon icon="mdi-chevron-right" size="16" class="sui-flip-rtl" />
            </v-btn>
            <v-btn
              block
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-chart-box-outline"
              class="sui-quick-btn justify-start"
              @click="usageStatsModal.visible = true"
            >
              <span class="flex-grow-1 text-start">{{ $t('main.stats.title') }}</span>
              <v-icon icon="mdi-chevron-right" size="16" class="sui-flip-rtl" />
            </v-btn>
            <v-btn
              block
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-tools"
              class="sui-quick-btn justify-start"
              :to="{ path: '/settings', query: { tab: 'tools' } }"
            >
              <span class="flex-grow-1 text-start">{{ $t('settingsTools.tools') }}</span>
              <v-icon icon="mdi-chevron-right" size="16" class="sui-flip-rtl" />
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tile Selector Dialog -->
    <v-dialog v-model="menu" max-width="520">
      <v-card>
        <div class="sui-modal-header">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-tune" size="20" color="primary" />
            <span class="text-subtitle-1 font-weight-semibold">{{ $t('main.tiles') }}</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="menu = false"
          />
        </div>
        <v-divider />
        <div class="sui-modal-body">
          <div class="sui-section-header">{{ $t('main.gauges') }}</div>
          <v-row class="mb-3">
            <v-col v-for="item in gaugeOptions" :key="item.value" cols="12" sm="6">
              <v-checkbox
                v-model="reloadItems"
                :value="item.value"
                :label="$t(item.title)"
                color="primary"
                hide-details
                density="compact"
              />
            </v-col>
          </v-row>

          <div class="sui-section-header">{{ $t('main.charts') }}</div>
          <v-row>
            <v-col v-for="item in chartOptionsList" :key="item.value" cols="12" sm="6">
              <v-checkbox
                v-model="reloadItems"
                :value="item.value"
                :label="$t(item.title)"
                color="primary"
                hide-details
                density="compact"
              />
            </v-col>
          </v-row>
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn color="primary" variant="flat" @click="menu = false">
            {{ $t('actions.close') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { HumanReadable } from '@/plugins/utils'
import Data from '@/store/modules/data'
import PageHeader from '@/components/ui/PageHeader.vue'
import Gauge from '@/components/tiles/Gauge.vue'
import History from '@/components/tiles/History.vue'
import LogLines from '@/components/LogLines.vue'
import LogVue from '@/layouts/modals/Logs.vue'
import Backup from '@/layouts/modals/Backup.vue'
import UsageStats from '@/layouts/modals/UsageStats.vue'

const store = Data()
const tilesData = ref<any>({})
const logs = ref<string[]>([])
const refreshing = ref(false)
const restarting = ref(false)
const loadFailed = ref(false)
const menu = ref(false)
const updatedAt = ref('')
const logModal = ref({ visible: false })
const backupModal = ref({ visible: false })
const usageStatsModal = ref({ visible: false })

const DEFAULT_TILES = ['g-cpu', 'g-mem', 'g-dsk', 'g-swp', 'h-net', 'h-cpu']

const tileOptions = [
  { title: 'main.gauge.cpu', value: 'g-cpu', icon: 'mdi-chip' },
  { title: 'main.gauge.mem', value: 'g-mem', icon: 'mdi-memory' },
  { title: 'main.gauge.dsk', value: 'g-dsk', icon: 'mdi-harddisk' },
  { title: 'main.gauge.swp', value: 'g-swp', icon: 'mdi-swap-horizontal' },
  { title: 'main.chart.net', value: 'h-net', icon: 'mdi-ethernet' },
  { title: 'main.chart.cpu', value: 'h-cpu', icon: 'mdi-pulse' },
  { title: 'main.chart.mem', value: 'h-mem', icon: 'mdi-chart-areaspline' },
  { title: 'main.chart.pnet', value: 'hp-net', icon: 'mdi-lan' },
  { title: 'main.chart.dio', value: 'h-dio', icon: 'mdi-database-clock-outline' },
]

const validTileValues = new Set(tileOptions.map((item) => item.value))
const gaugeOptions = tileOptions.filter((item) => item.value.startsWith('g'))
const chartOptionsList = tileOptions.filter((item) => item.value.startsWith('h'))

// Safely initialize or recover from corrupt localStorage['reloadItems']
const initReloadItems = () => {
  let raw: string | null
  try {
    raw = localStorage.getItem('reloadItems')
  } catch {
    raw = null
  }
  if (raw === null) {
    store.reloadItems = [...DEFAULT_TILES]
    return
  }
  const current = Array.isArray(store.reloadItems)
    ? store.reloadItems.filter((item) => validTileValues.has(item))
    : []
  if (raw.trim().length > 0 && current.length === 0) {
    store.reloadItems = [...DEFAULT_TILES]
  } else {
    store.reloadItems = current
  }
}
initReloadItems()

const reloadItems = computed({
  get: () => store.reloadItems,
  set: (value: string[]) => {
    const clean = value.filter((item) => validTileValues.has(item))
    store.reloadItems = clean
    try {
      localStorage.setItem('reloadItems', clean.join(','))
    } catch {
      // Ignore storage access failures in restricted contexts
    }
  },
})

const selectedTiles = computed(() =>
  tileOptions.filter((item) => reloadItems.value.includes(item.value)),
)

const coreLabel = computed(() =>
  restarting.value
    ? 'dashboard.restarting'
    : tilesData.value.sbd == null
      ? 'loading'
      : tilesData.value.sbd.running
        ? 'dashboard.running'
        : 'dashboard.stopped',
)

const coreColor = computed(() =>
  restarting.value || tilesData.value.sbd == null
    ? 'secondary'
    : tilesData.value.sbd.running
      ? 'success'
      : 'error',
)

const summaries = computed(() => [
  {
    title: 'pages.clients',
    icon: 'mdi-account-multiple-outline',
    color: 'primary',
    value: store.clients.length,
    detail: i18n.global.t('dashboard.onlineUsers', { count: store.onlines.user?.length ?? 0 }),
    path: '/clients',
  },
  {
    title: 'pages.inbounds',
    icon: 'mdi-login',
    color: 'info',
    value: store.inbounds.length,
    detail: i18n.global.t('navigation.access'),
    path: '/inbounds',
  },
  {
    title: 'pages.outbounds',
    icon: 'mdi-logout-variant',
    color: 'success',
    value: store.outbounds.length,
    detail: i18n.global.t('navigation.network'),
    path: '/outbounds',
  },
  {
    title: 'pages.endpoints',
    icon: 'mdi-vpn',
    color: 'warning',
    value: store.endpoints.length,
    detail: 'WireGuard · WARP · Tailscale',
    path: '/endpoints',
  },
])

const size = (value: number | undefined) =>
  value == null || !Number.isFinite(value) ? '—' : HumanReadable.sizeFormat(value)

const duration = (value: number | undefined) =>
  value == null || !Number.isFinite(value) ? '—' : HumanReadable.formatSecond(Math.max(0, value))

let timer: ReturnType<typeof setTimeout> | undefined
let active = true
let lastLogs = 0

const refresh = async () => {
  if (refreshing.value || !active) return
  refreshing.value = true
  try {
    const fields = new Set(['sbd', ...selectedTiles.value.map((item) => item.value.split('-')[1])])
    if (!tilesData.value.sys) fields.add('sys')
    const response = await HttpUtils.get('api/status', { r: [...fields].join(',') })
    loadFailed.value = !response.success
    if (response.success && active) {
      tilesData.value = { ...tilesData.value, ...response.obj }
      updatedAt.value = new Date().toLocaleTimeString()
    }
    if (Date.now() - lastLogs > 10000) {
      const logResp = await HttpUtils.get('api/logs', { c: 8, l: 'info' })
      if (logResp.success && active) {
        logs.value = Array.isArray(logResp.obj) ? logResp.obj.map(String) : []
        lastLogs = Date.now()
      }
    }
  } finally {
    refreshing.value = false
  }
}

const poll = async () => {
  await refresh()
  if (active) timer = setTimeout(poll, 2000)
}

const restartSingbox = async () => {
  if (restarting.value) return
  restarting.value = true
  try {
    await HttpUtils.post('api/restartSb', {})
    lastLogs = 0
    await refresh()
  } finally {
    restarting.value = false
  }
}

onMounted(poll)
onBeforeUnmount(() => {
  active = false
  clearTimeout(timer)
})
</script>

<style scoped>
.sui-dashboard {
  width: 100%;
  min-width: 0;
}

.sui-stale-alert :deep(.v-alert__content) {
  color: rgb(var(--v-theme-on-surface));
}

.sui-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sui-status-dot--success {
  background-color: rgb(var(--v-theme-success));
}

.sui-status-dot--warning {
  background-color: rgb(var(--v-theme-warning));
}

.sui-status-dot--error {
  background-color: rgb(var(--v-theme-error));
}

.sui-status-dot--secondary {
  background-color: rgb(var(--v-theme-secondary));
}

.sui-core-card {
  background-color: rgb(var(--v-theme-surface));
}

.sui-core-overline {
  line-height: 1.2;
}

.sui-core-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background-color: rgb(var(--v-theme-surface-light));
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-sm);
}

.sui-core-metric {
  padding: 10px 12px;
  min-width: 0;
}

.sui-core-metric + .sui-core-metric {
  border-inline-start: 1px solid var(--sui-hairline);
}

.sui-core-metric__label {
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sui-core-metric__value {
  margin-top: 4px;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sui-kpi-card {
  text-decoration: none;
}

.sui-kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
}

.sui-kpi-chevron {
  transition: transform 160ms ease;
}

.sui-kpi-card:hover .sui-kpi-chevron {
  transform: translateX(2px);
}

.sui-tile-card {
  display: flex;
  flex-direction: column;
}

.sui-tile-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--sui-hairline);
  flex-shrink: 0;
}

.sui-tile-card__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 14px;
}

.sui-card-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}

.sui-logs-card {
  overflow: hidden;
}

.sui-sys-kv__row {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--sui-hairline);
}

.sui-sys-kv__row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.sui-quick-btn :deep(.v-btn__content) {
  width: 100%;
  justify-content: space-between;
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 480px) {
  .sui-core-metrics {
    grid-template-columns: 1fr;
  }

  .sui-core-metric + .sui-core-metric {
    border-inline-start: 0;
    border-top: 1px solid var(--sui-hairline);
  }
}
</style>
