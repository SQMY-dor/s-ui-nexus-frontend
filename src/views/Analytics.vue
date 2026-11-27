<template>
  <div class="sui-analytics">
    <PageHeader :title="$t('pages.analytics')">
      <template #actions>
        <v-btn
          icon="mdi-refresh"
          variant="tonal"
          size="small"
          :loading="loading"
          :aria-label="$t('actions.update')"
          :title="$t('actions.update')"
          @click="load"
        />
      </template>
    </PageHeader>

    <v-card class="mb-4">
      <v-tabs v-model="tab" color="primary" show-arrows class="sui-analytics-tabs">
        <v-tab value="usage" prepend-icon="mdi-account-arrow-up-outline">
          {{ $t('analytics.userUsage') }}
        </v-tab>
        <v-tab value="stats" prepend-icon="mdi-chart-line">
          {{ $t('analytics.trafficTrends') }}
        </v-tab>
        <v-tab value="connections" prepend-icon="mdi-lan-connect">
          {{ $t('analytics.connections') }}
        </v-tab>
        <v-tab value="logs" prepend-icon="mdi-text-box-outline">
          {{ $t('logsView.title') }}
        </v-tab>
      </v-tabs>
      <v-divider />
      <v-card-text class="pa-3 pa-sm-4">
        <v-row density="compact" align="center">
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="search"
              :label="$t('analytics.search')"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
              @keyup.enter="load"
            />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-text-field
              v-model="tag"
              :label="tagLabel"
              hide-details
              clearable
              @keyup.enter="load"
            />
          </v-col>
          <v-col v-if="tab === 'stats' || tab === 'connections'" cols="12" sm="6" md="2">
            <v-select
              v-model="resource"
              :label="$t('analytics.resource')"
              :items="resources"
              hide-details
            />
          </v-col>
          <v-col v-if="tab === 'logs'" cols="12" sm="6" md="2">
            <v-select
              v-model="logLevel"
              :label="$t('logsView.level')"
              :items="levels"
              hide-details
              @update:model-value="load"
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field
              v-model="start"
              :label="$t('analytics.from')"
              type="date"
              hide-details
            />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field
              v-model="end"
              :label="$t('analytics.to')"
              type="date"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4" md="1">
            <v-btn block color="primary" variant="flat" :loading="loading" @click="load">
              {{ $t('analytics.apply') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-progress-linear v-if="loading" indeterminate color="primary" height="2" />
    </v-card>

    <v-window v-model="tab" class="sui-analytics-window">
      <!-- User Usage Tab -->
      <v-window-item value="usage">
        <v-row class="mb-4">
          <v-col v-for="summary in summaries" :key="summary.label" cols="12" sm="4">
            <v-card class="sui-resource-card">
              <v-card-text class="d-flex align-center ga-3 pa-4">
                <v-avatar :color="summary.tone" variant="tonal" size="40" rounded="md">
                  <v-icon :icon="summary.icon" size="20" />
                </v-avatar>
                <div class="min-w-0">
                  <div class="text-caption text-medium-emphasis">{{ summary.label }}</div>
                  <div class="sui-kpi-num sui-num" :class="summary.valueClass" dir="ltr">
                    {{ bytes(summary.value) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <EmptyState
          v-if="!loading && usageItems.length === 0"
          icon="mdi-account-off-outline"
          :title="$t('analytics.noTraffic')"
        />
        <v-card v-else>
          <div class="sui-table-wrap">
            <v-table density="comfortable" hover class="sui-data-table usage-table">
              <thead>
                <tr>
                  <th>{{ $t('analytics.user') }}</th>
                  <th>{{ $t('analytics.group') }}</th>
                  <th class="text-end">{{ $t('analytics.upload') }}</th>
                  <th class="text-end">{{ $t('analytics.download') }}</th>
                  <th class="text-end">{{ $t('analytics.total') }}</th>
                  <th class="text-end">{{ $t('analytics.quota') }}</th>
                  <th class="text-center">{{ $t('analytics.online') }}</th>
                  <th class="text-end">{{ $t('actions.action') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in usageItems" :key="item.user">
                  <td class="connection-break font-weight-medium">{{ item.user }}</td>
                  <td class="connection-break text-medium-emphasis">{{ item.group || '—' }}</td>
                  <td class="text-end sui-num sui-val-upload" dir="ltr">{{ bytes(item.upload) }}</td>
                  <td class="text-end sui-num sui-val-download" dir="ltr">{{ bytes(item.download) }}</td>
                  <td class="text-end sui-num font-weight-medium" dir="ltr">{{ bytes(item.total) }}</td>
                  <td class="text-end sui-num text-medium-emphasis" dir="ltr">{{ bytes(item.quota) }}</td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      variant="tonal"
                      :color="item.online ? 'success' : 'secondary'"
                      class="sui-online-chip"
                    >
                      <v-icon
                        :icon="item.online ? 'mdi-circle' : 'mdi-circle-outline'"
                        size="8"
                      />
                    </v-chip>
                  </td>
                  <td class="text-end">
                    <v-btn
                      size="small"
                      variant="text"
                      color="primary"
                      prepend-icon="mdi-text-search"
                      @click="openConnections('user', item.user)"
                    >
                      {{ $t('analytics.details') }}
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-window-item>

      <!-- Traffic Trends Tab -->
      <v-window-item value="stats">
        <v-card>
          <v-card-text class="pa-4">
            <div v-if="chartData.labels?.length" class="sui-chart-stage">
              <Line :data="chartData" :options="chartOptions" />
            </div>
            <EmptyState
              v-else
              icon="mdi-chart-line"
              :title="$t('analytics.noTraffic')"
            />
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- Connections Tab -->
      <v-window-item value="connections">
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <span class="sui-num">{{ $t('analytics.scannedLogs', { count: connectionData.scanned ?? 0 }) }}</span>
        </v-alert>

        <v-row class="mb-4">
          <v-col v-for="group in connectionGroups" :key="group.key" cols="12" md="6">
            <v-card class="sui-resource-card h-100">
              <div class="sui-card-bar">
                <span class="text-subtitle-2 font-weight-semibold">{{ group.title }}</span>
                <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num">
                  {{ group.items.length }}
                </v-chip>
              </div>
              <v-divider />
              <div class="sui-table-wrap">
                <v-table density="compact" hover class="sui-data-table connection-group-table">
                  <thead>
                    <tr>
                      <th>{{ $t('analytics.tag') }}</th>
                      <th class="text-end">{{ $t('analytics.count') }}</th>
                      <th>{{ $t('analytics.lastSeen') }}</th>
                      <th class="text-end">{{ $t('actions.action') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in group.items" :key="`${group.key}-${item.tag}`">
                      <td class="connection-break sui-mono">{{ item.tag }}</td>
                      <td class="text-end sui-num">{{ item.count }}</td>
                      <td class="text-no-wrap sui-mono text-caption text-medium-emphasis" dir="ltr">
                        {{ formatTime(item.lastSeen) }}
                      </td>
                      <td class="text-end">
                        <v-btn
                          size="small"
                          variant="text"
                          color="primary"
                          @click="openConnections(item.resource || group.resource, item.tag)"
                        >
                          {{ $t('analytics.details') }}
                        </v-btn>
                      </td>
                    </tr>
                    <tr v-if="!group.items.length">
                      <td colspan="4" class="text-center text-medium-emphasis py-4">
                        {{ $t('analytics.noConnections') }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <EmptyState
          v-if="!loading && connectionItems.length === 0"
          icon="mdi-lan-disconnect"
          :title="$t('analytics.noConnections')"
        />
        <v-card v-else>
          <div class="sui-table-wrap">
            <v-table density="compact" hover class="sui-data-table connection-list-table">
              <colgroup>
                <col class="connection-list-time" />
                <col class="connection-list-resource" />
                <col class="connection-list-user" />
                <col class="connection-list-destination" />
                <col class="connection-list-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>{{ $t('logsView.time') }}</th>
                  <th>{{ $t('analytics.resource') }}</th>
                  <th>{{ $t('analytics.user') }}</th>
                  <th>{{ $t('analytics.destination') }}</th>
                  <th class="text-end">{{ $t('analytics.event') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in connectionItems" :key="`${item.timestamp}-${index}`">
                  <td class="text-no-wrap sui-mono text-caption text-medium-emphasis" dir="ltr">
                    {{ item.time || formatTime(item.timestamp) }}
                  </td>
                  <td class="connection-break sui-mono text-caption">
                    {{ item.resource }}/{{ item.protocol }}[{{ item.tag }}]
                  </td>
                  <td class="connection-break">{{ item.user || '—' }}</td>
                  <td class="connection-break">
                    <div class="sui-mono text-caption">{{ item.destination || item.source || '—' }}</div>
                    <div v-if="connectionMeta(item)" class="text-caption text-medium-emphasis">
                      {{ connectionMeta(item) }}
                    </div>
                  </td>
                  <td class="text-end">
                    <v-btn size="small" variant="text" color="primary" @click="openConnectionLog(item)">
                      {{ $t('analytics.viewLog') }}
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-window-item>

      <!-- Structured Logs Tab -->
      <v-window-item value="logs">
        <EmptyState
          v-if="!loading && logItems.length === 0"
          icon="mdi-text-box-outline"
          :title="$t('logsView.noLogs')"
          :description="$t('logsView.subtitle')"
        />
        <v-card v-else>
          <div class="sui-table-wrap">
            <v-table
              density="compact"
              hover
              fixed-header
              height="calc(100vh - 360px)"
              class="sui-data-table logs-table"
            >
              <colgroup>
                <col class="logs-col-time" />
                <col class="logs-col-level" />
                <col class="logs-col-user" />
                <col class="logs-col-source" />
                <col class="logs-col-message" />
              </colgroup>
              <thead>
                <tr>
                  <th>{{ $t('logsView.time') }}</th>
                  <th>{{ $t('logsView.level') }}</th>
                  <th>{{ $t('logsView.user') }}</th>
                  <th>{{ $t('logsView.source') }}</th>
                  <th>{{ $t('logsView.message') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in logItems"
                  :key="`${item.timestamp}-${index}`"
                  :class="logRowClass(item.level)"
                >
                  <td class="text-no-wrap sui-mono text-caption text-medium-emphasis" dir="ltr">
                    {{ item.time || formatTime(item.timestamp) }}
                  </td>
                  <td>
                    <v-chip
                      size="x-small"
                      :color="levelColor(item.level)"
                      variant="flat"
                      class="sui-mono font-weight-semibold"
                    >
                      {{ item.level }}
                    </v-chip>
                  </td>
                  <td class="connection-break">{{ item.user || '—' }}</td>
                  <td class="connection-break sui-mono text-caption text-medium-emphasis">
                    {{ item.source || 'system' }}
                  </td>
                  <td class="log-message sui-mono">
                    <div>{{ item.message }}</div>
                    <div v-if="connectionMeta(item.connection)" class="text-caption text-medium-emphasis">
                      {{ connectionMeta(item.connection) }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Connection Details Dialog -->
    <v-dialog v-model="detailVisible" width="calc(100% - 32px)" max-width="1200">
      <v-card>
        <div class="sui-modal-header">
          <span class="text-subtitle-1 font-weight-semibold text-truncate">{{ detailTitle }}</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="detailVisible = false"
          />
        </div>
        <v-divider />
        <v-progress-linear v-if="detailLoading" indeterminate color="primary" height="2" />
        <div class="sui-modal-body">
          <EmptyState
            v-if="!detailLoading && detailItems.length === 0"
            icon="mdi-lan-disconnect"
            :title="$t('analytics.noConnections')"
          />
          <div v-else-if="detailItems.length > 0" class="connection-detail-scroll">
            <div class="sui-table-wrap connection-detail-table">
              <v-table density="compact" hover class="sui-data-table">
                <colgroup>
                  <col class="connection-col-time" />
                  <col class="connection-col-resource" />
                  <col class="connection-col-user" />
                  <col class="connection-col-endpoint" />
                  <col class="connection-col-endpoint" />
                  <col class="connection-col-message" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{{ $t('logsView.time') }}</th>
                    <th>{{ $t('analytics.resource') }}</th>
                    <th>{{ $t('analytics.user') }}</th>
                    <th>{{ $t('analytics.destination') }}</th>
                    <th>{{ $t('analytics.source') }}</th>
                    <th>{{ $t('analytics.message') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in detailItems"
                    :key="`${item.timestamp}-${index}`"
                    class="cursor-pointer"
                    @click="openConnectionLog(item)"
                  >
                    <td class="text-no-wrap sui-mono text-caption text-medium-emphasis" dir="ltr">
                      {{ item.time || formatTime(item.timestamp) }}
                    </td>
                    <td class="connection-break sui-mono text-caption">
                      {{ item.resource }}/{{ item.protocol }}[{{ item.tag }}]
                    </td>
                    <td class="connection-break">{{ item.user || '—' }}</td>
                    <td class="connection-break">
                      <div class="sui-mono text-caption">{{ item.destination || '—' }}</div>
                      <div v-if="endpointMeta(item.destinationInfo)" class="text-caption text-medium-emphasis">
                        {{ endpointMeta(item.destinationInfo) }}
                      </div>
                    </td>
                    <td class="connection-break">
                      <div class="sui-mono text-caption">{{ item.source || '—' }}</div>
                      <div v-if="endpointMeta(item.sourceInfo)" class="text-caption text-medium-emphasis">
                        {{ endpointMeta(item.sourceInfo) }}
                      </div>
                    </td>
                    <td>
                      <div class="connection-message sui-mono">{{ item.message }}</div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <div class="connection-detail-cards">
              <div
                v-for="(item, index) in detailItems"
                :key="`mobile-${item.timestamp}-${index}`"
                class="connection-detail-card cursor-pointer"
                role="button"
                tabindex="0"
                @click="openConnectionLog(item)"
                @keydown.enter="openConnectionLog(item)"
                @keydown.space.prevent="openConnectionLog(item)"
              >
                <dl class="sui-kv-list">
                  <div class="sui-kv-row">
                    <dt class="sui-kv-label">{{ $t('logsView.time') }}</dt>
                    <dd class="sui-kv-value sui-mono text-caption" dir="ltr">
                      {{ item.time || formatTime(item.timestamp) }}
                    </dd>
                  </div>
                  <div class="sui-kv-row">
                    <dt class="sui-kv-label">{{ $t('analytics.resource') }}</dt>
                    <dd class="sui-kv-value sui-mono text-caption">
                      {{ item.resource }}/{{ item.protocol }}[{{ item.tag }}]
                    </dd>
                  </div>
                  <div class="sui-kv-row">
                    <dt class="sui-kv-label">{{ $t('analytics.user') }}</dt>
                    <dd class="sui-kv-value">{{ item.user || '—' }}</dd>
                  </div>
                  <div class="sui-kv-row">
                    <dt class="sui-kv-label">{{ $t('analytics.destination') }}</dt>
                    <dd class="sui-kv-value sui-mono text-caption">
                      {{ item.destination || '—' }}
                      <small v-if="endpointMeta(item.destinationInfo)" class="d-block text-medium-emphasis">
                        {{ endpointMeta(item.destinationInfo) }}
                      </small>
                    </dd>
                  </div>
                  <div class="sui-kv-row">
                    <dt class="sui-kv-label">{{ $t('analytics.source') }}</dt>
                    <dd class="sui-kv-value sui-mono text-caption">
                      {{ item.source || '—' }}
                      <small v-if="endpointMeta(item.sourceInfo)" class="d-block text-medium-emphasis">
                        {{ endpointMeta(item.sourceInfo) }}
                      </small>
                    </dd>
                  </div>
                </dl>
                <div class="connection-message sui-mono mt-3">{{ item.message }}</div>
              </div>
            </div>
          </div>
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn color="primary" variant="flat" @click="detailVisible = false">
            {{ $t('actions.close') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Single Connection Log Dialog -->
    <v-dialog v-model="connectionLogVisible" max-width="880">
      <v-card>
        <div class="sui-modal-header">
          <span class="text-subtitle-1 font-weight-semibold">{{ $t('analytics.connectionLog') }}</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="connectionLogVisible = false"
          />
        </div>
        <v-divider />
        <v-progress-linear v-if="connectionLogResolving" indeterminate color="primary" height="2" />
        <div v-if="selectedConnection" class="sui-modal-body">
          <dl class="sui-kv-list sui-conn-kv">
            <div class="sui-kv-row">
              <dt class="sui-kv-label">{{ $t('logsView.time') }}</dt>
              <dd class="sui-kv-value sui-mono" dir="ltr">
                {{ selectedConnection.time || formatTime(selectedConnection.timestamp) }}
              </dd>
            </div>
            <div class="sui-kv-row">
              <dt class="sui-kv-label">{{ $t('analytics.resource') }}</dt>
              <dd class="sui-kv-value sui-mono">
                {{ selectedConnection.resource }}/{{ selectedConnection.protocol }}[{{ selectedConnection.tag }}]
              </dd>
            </div>
            <div class="sui-kv-row">
              <dt class="sui-kv-label">{{ $t('analytics.user') }}</dt>
              <dd class="sui-kv-value">{{ selectedConnection.user || '—' }}</dd>
            </div>
            <div class="sui-kv-row">
              <dt class="sui-kv-label">{{ $t('analytics.destination') }}</dt>
              <dd class="sui-kv-value sui-mono">{{ selectedConnection.destination || '—' }}</dd>
            </div>
            <div class="sui-kv-row">
              <dt class="sui-kv-label">{{ $t('analytics.source') }}</dt>
              <dd class="sui-kv-value sui-mono">{{ selectedConnection.source || '—' }}</dd>
            </div>
          </dl>

          <div
            v-for="section in endpointSections(selectedConnection)"
            :key="section.title"
            class="mt-4"
          >
            <div class="sui-section-header">{{ section.title }}</div>
            <dl class="sui-kv-list">
              <div v-for="field in section.fields" :key="field.label" class="sui-kv-row">
                <dt class="sui-kv-label">{{ field.label }}</dt>
                <dd class="sui-kv-value sui-mono">{{ field.value }}</dd>
              </div>
            </dl>
          </div>

          <div class="sui-section-header mt-4">{{ $t('logsView.message') }}</div>
          <pre class="sui-log-pre sui-mono" dir="ltr">{{ selectedConnection.message }}</pre>
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn color="primary" variant="flat" @click="connectionLogVisible = false">
            {{ $t('actions.close') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { getChartPalette } from '@/plugins/chartTheme'
import HttpUtils from '@/plugins/httputil'
import { logLevelColor as levelColor } from '@/plugins/logs'
import { HumanReadable } from '@/plugins/utils'
import { i18n } from '@/locales'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const theme = useTheme()
const palette = computed(() => getChartPalette(theme))

const t = (key: string, params?: any) => i18n.global.t(key, params)
const tab = ref('usage')
const loading = ref(false)
const search = ref('')
const tag = ref('')
const resource = ref('all')
const logLevel = ref('ALL')
const start = ref(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
const end = ref(new Date().toISOString().slice(0, 10))
const usageItems = ref<any[]>([])
const statItems = ref<any[]>([])
const usage = ref<any>({ upload: 0, download: 0 })
const connectionData = ref<any>({ items: [], summary: {}, scanned: 0 })
const logItems = ref<any[]>([])
const detailVisible = ref(false)
const detailTitle = ref('')
const detailItems = ref<any[]>([])
const detailLoading = ref(false)
const connectionLogVisible = ref(false)
const connectionLogResolving = ref(false)
const selectedConnection = ref<any>(null)
let connectionLogRequest = 0

const levels = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR']

const resources = computed(() => [
  { title: t('analytics.users'), value: 'user' },
  { title: t('analytics.inbounds'), value: 'inbound' },
  { title: t('analytics.outbounds'), value: 'outbound' },
  { title: t('analytics.nodes'), value: 'endpoint' },
  { title: t('analytics.destinations'), value: 'destination' },
  { title: t('all'), value: 'all' },
])

const tagLabel = computed(() =>
  tab.value === 'usage' || tab.value === 'logs' ? t('analytics.user') : t('analytics.tag'),
)

const unix = (value: string, last = false) =>
  Math.floor(new Date(`${value}T${last ? '23:59:59' : '00:00:00'}`).getTime() / 1000)

const query = (limit = 2000) => ({
  search: search.value,
  start: unix(start.value),
  end: unix(end.value, true),
  limit,
})

const load = async () => {
  loading.value = true
  try {
    if (tab.value === 'usage') {
      const response = await HttpUtils.get('api/analytics-usage', { ...query(2000), user: tag.value })
      usageItems.value = response.success ? response.obj?.items ?? [] : []
      usage.value = response.success ? response.obj ?? {} : { upload: 0, download: 0 }
    } else if (tab.value === 'stats') {
      const response = await HttpUtils.get('api/analytics-stats', {
        ...query(2000),
        tag: tag.value,
        resource: resource.value,
      })
      statItems.value = response.success ? response.obj?.items ?? [] : []
    } else if (tab.value === 'connections') {
      const response = await HttpUtils.get('api/analytics-connections', {
        ...query(500),
        tag: tag.value,
        resource: resource.value,
      })
      connectionData.value = response.success
        ? response.obj ?? { items: [], summary: {}, scanned: 0 }
        : { items: [], summary: {}, scanned: 0 }
    } else {
      const response = await HttpUtils.get('api/structured-logs', {
        level: logLevel.value,
        user: tag.value,
        search: search.value,
        start: unix(start.value),
        end: unix(end.value, true),
        limit: 1000,
      })
      logItems.value = response.success ? response.obj?.items ?? [] : []
    }
  } finally {
    loading.value = false
  }
}

const summaries = computed(() => [
  {
    label: t('analytics.upload'),
    value: usage.value.upload ?? 0,
    tone: 'upload',
    icon: 'mdi-arrow-up-bold',
    valueClass: 'sui-val-upload',
  },
  {
    label: t('analytics.download'),
    value: usage.value.download ?? 0,
    tone: 'download',
    icon: 'mdi-arrow-down-bold',
    valueClass: 'sui-val-download',
  },
  {
    label: t('analytics.total'),
    value: (usage.value.upload ?? 0) + (usage.value.download ?? 0),
    tone: 'primary',
    icon: 'mdi-swap-vertical',
    valueClass: 'sui-val-primary',
  },
])

const bytes = (value: any) => HumanReadable.sizeFormat(Number(value || 0))
const formatTime = (value: number) => (value ? new Date(value * 1000).toLocaleString() : '—')

const chartData = computed<ChartData<'line'>>(() => {
  const p = palette.value
  const times = [...new Set(statItems.value.map((item) => item.dateTime))].sort()
  const labels = times.map((value) => new Date(Number(value) * 1000).toLocaleString())
  const values = (direction: boolean) =>
    times.map((time) =>
      statItems.value
        .filter((item) => item.dateTime === time && item.direction === direction)
        .reduce((sum, item) => sum + Number(item.traffic || 0), 0),
    )
  return {
    labels,
    datasets: [
      {
        label: t('analytics.upload'),
        data: values(true),
        borderColor: p.upload,
        backgroundColor: p.uploadFill,
        borderWidth: 2,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: p.upload,
        tension: 0.2,
      },
      {
        label: t('analytics.download'),
        data: values(false),
        borderColor: p.download,
        backgroundColor: p.downloadFill,
        borderWidth: 2,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: p.download,
        tension: 0.2,
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => {
  const p = palette.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        labels: {
          color: p.textColor,
          usePointStyle: true,
          boxWidth: 8,
          font: { family: p.fontFamily, size: 12 },
        },
      },
      tooltip: {
        backgroundColor: p.tooltipBg,
        borderColor: p.tooltipBorder,
        borderWidth: 1,
        titleColor: p.tooltipText,
        bodyColor: p.tooltipText,
        padding: 10,
        titleFont: { family: p.fontFamily, size: 12 },
        bodyFont: { family: p.fontFamily, size: 12 },
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${bytes(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        border: { color: p.borderColor },
        grid: { color: p.gridColor },
        ticks: {
          color: p.mutedColor,
          maxTicksLimit: 8,
          font: { family: p.fontFamily, size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        border: { color: p.borderColor },
        grid: { color: p.gridColor },
        ticks: {
          color: p.mutedColor,
          font: { family: p.fontFamily, size: 11 },
          callback: (value) => bytes(value),
        },
      },
    },
  }
})

const connectionItems = computed(() => connectionData.value?.items ?? [])
const connectionGroups = computed(() => {
  const summary = connectionData.value?.summary ?? {}
  return [
    { key: 'users', resource: 'user', title: t('analytics.users'), items: summary.users ?? [] },
    { key: 'inbounds', resource: 'inbound', title: t('analytics.inbounds'), items: summary.inbounds ?? [] },
    { key: 'outbounds', resource: 'outbound', title: t('analytics.outbounds'), items: summary.outbounds ?? [] },
    { key: 'endpoints', resource: 'endpoint', title: t('analytics.nodes'), items: summary.endpoints ?? [] },
    { key: 'destinations', resource: 'destination', title: t('analytics.destinations'), items: summary.destinations ?? [] },
  ]
})

const logRowClass = (level: string): string => {
  const c = levelColor(level || '')
  if (c === 'error') return 'sui-log-tr--error'
  if (c === 'warning') return 'sui-log-tr--warning'
  return ''
}

const endpointTarget = (info: any) => info?.host || info?.ip || info?.address || ''
const endpointOwnership = (info: any) => {
  if (!info) return ''
  const parts: string[] = []
  const add = (value: any) => {
    const text = String(value || '').trim()
    if (text && !parts.some((item) => item.toLocaleLowerCase() === text.toLocaleLowerCase())) {
      parts.push(text)
    }
  }
  if (info.isp) add(info.isp)
  else if (info.scope !== 'domain') add(info.attribution)
  add(info.city || info.region || info.country)
  if (info.ip && info.ip !== endpointTarget(info)) add(info.ip)
  if (!parts.length && info.scope !== 'domain') add(scopeLabel(info.scope))
  return parts.join(' · ')
}
const endpointMeta = (info: any) => {
  if (!info) return ''
  const parts = [endpointTarget(info), endpointOwnership(info)].filter(Boolean)
  return parts.join(' · ')
}
const connectionMeta = (item: any) =>
  item ? endpointMeta(item.destinationInfo) || endpointMeta(item.sourceInfo) : ''
const scopeLabel = (scope: string) => {
  const key =
    ({
      private: 'analytics.scopePrivate',
      loopback: 'analytics.scopeLoopback',
      link_local: 'analytics.scopeLinkLocal',
      multicast: 'analytics.scopeMulticast',
      reserved: 'analytics.scopeReserved',
      unspecified: 'analytics.scopeReserved',
      public: 'analytics.scopePublic',
      domain: 'analytics.scopeDomain',
    } as any)[scope] ?? 'analytics.scopeUnknown'
  return t(key)
}
const sameEndpoint = (left: any, right: any) =>
  left && right && left.address === right.address && left.ip === right.ip && left.host === right.host

const endpointSections = (item: any) => {
  if (!item) return []
  const endpoints = [
    { title: t('analytics.source'), info: item.sourceInfo },
    { title: t('analytics.destination'), info: item.destinationInfo },
  ].filter(
    (entry, index, source) =>
      entry.info && source.findIndex((other) => sameEndpoint(entry.info, other.info)) === index,
  )
  return endpoints
    .map((entry) => ({
      title: entry.title,
      fields: [
        { label: t('analytics.ipAddress'), value: endpointTarget(entry.info) },
        { label: t('analytics.ipAttribution'), value: endpointOwnership(entry.info) },
      ].filter((field) => field.value),
    }))
    .filter((entry) => entry.fields.length)
}

const openConnections = async (nextResource: string, nextTag: string) => {
  detailTitle.value = `${t('analytics.connectionDetails')} · ${nextResource}/${nextTag}`
  detailVisible.value = true
  detailItems.value = []
  detailLoading.value = true
  try {
    const response = await HttpUtils.get('api/analytics-connections', {
      ...query(500),
      resource: nextResource,
      tag: nextTag,
    })
    detailItems.value = response.success ? response.obj?.items ?? [] : []
  } finally {
    detailLoading.value = false
  }
}

const openConnectionLog = async (item: any) => {
  const requestId = ++connectionLogRequest
  selectedConnection.value = { ...item }
  connectionLogVisible.value = true
  connectionLogResolving.value = false
  const address = item.destination || item.source
  const infoKey = item.destination ? 'destinationInfo' : item.source ? 'sourceInfo' : ''
  const currentInfo = infoKey ? item[infoKey] : null
  const hasLocation = currentInfo?.city || currentInfo?.region || currentInfo?.country
  const needsPublicLookup = currentInfo && ['domain', 'public'].includes(currentInfo.scope)
  const complete = Boolean(
    currentInfo && (!needsPublicLookup || (currentInfo.ip && currentInfo.isp && hasLocation)),
  )
  if (!address || !infoKey || complete) return
  connectionLogResolving.value = true
  try {
    const response = await HttpUtils.get('api/analytics-address-info', { address })
    if (requestId !== connectionLogRequest || !response.success || !selectedConnection.value) return
    const next = { ...selectedConnection.value, [infoKey]: response.obj }
    if (infoKey === 'destinationInfo' && next.remote === next.destination) next.remoteInfo = response.obj
    selectedConnection.value = next
  } catch {
    // Leave the original connection details visible when lookup is unavailable.
  } finally {
    if (requestId === connectionLogRequest) connectionLogResolving.value = false
  }
}

watch(tab, () => {
  if (tab.value === 'usage') resource.value = 'all'
  load()
})

onMounted(load)
</script>

<style scoped>
.sui-analytics {
  width: 100%;
  min-width: 0;
}

.sui-analytics-window {
  min-width: 0;
  overflow: visible;
}

.sui-analytics-window :deep(.v-window__container) {
  min-width: 0;
}

.sui-kpi-num {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 2px;
}

.sui-val-upload {
  color: rgb(var(--v-theme-upload));
}

.sui-val-download {
  color: rgb(var(--v-theme-download));
}

.sui-val-primary {
  color: rgb(var(--v-theme-primary));
}

.sui-online-chip {
  min-width: 24px;
  justify-content: center;
}

.sui-card-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}

.sui-chart-stage {
  position: relative;
  height: 400px;
  width: 100%;
}

.sui-data-table :deep(thead th) {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  background: rgb(var(--v-theme-surface-light));
  white-space: nowrap;
}

.sui-table-wrap :deep(.v-table__wrapper) {
  overflow-x: visible;
}

.usage-table :deep(table) {
  min-width: 860px;
}

.connection-group-table :deep(table) {
  min-width: 480px;
  table-layout: fixed;
}

.connection-group-table :deep(th:nth-child(1)) {
  width: 42%;
}

.connection-group-table :deep(th:nth-child(2)) {
  width: 12%;
}

.connection-group-table :deep(th:nth-child(3)) {
  width: 28%;
}

.connection-group-table :deep(th:nth-child(4)) {
  width: 18%;
}

.connection-list-table :deep(table) {
  min-width: 880px;
  table-layout: fixed;
}

.connection-list-time {
  width: 170px;
}

.connection-list-resource {
  width: 210px;
}

.connection-list-user {
  width: 130px;
}

.connection-list-destination {
  width: 270px;
}

.connection-list-action {
  width: 100px;
}

.logs-table :deep(table) {
  min-width: 900px;
  table-layout: fixed;
}

.logs-col-time {
  width: 170px;
}

.logs-col-level {
  width: 92px;
}

.logs-col-user {
  width: 128px;
}

.logs-col-source {
  width: 164px;
}

.logs-col-message {
  width: 346px;
}

.sui-log-tr--error {
  background-color: rgba(var(--v-theme-error), 0.04);
}

.sui-log-tr--warning {
  background-color: rgba(var(--v-theme-warning), 0.04);
}

.log-message {
  min-width: 0;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 0.78rem;
}

.cursor-pointer {
  cursor: pointer;
}

.connection-detail-scroll {
  max-height: min(65vh, 560px);
  overflow: auto;
}

.connection-detail-table :deep(table) {
  min-width: 1020px;
  table-layout: fixed;
}

.connection-detail-table :deep(th) {
  position: sticky;
  top: 0;
  z-index: 1;
}

.connection-detail-table :deep(td) {
  height: auto;
  vertical-align: top;
  padding-block: 10px;
}

.connection-detail-cards {
  display: none;
}

.connection-detail-card {
  padding: 14px;
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-md);
  background: rgb(var(--v-theme-surface-light));
}

.connection-detail-card + .connection-detail-card {
  margin-top: 10px;
}

.connection-col-time {
  width: 96px;
}

.connection-col-resource {
  width: 190px;
}

.connection-col-user {
  width: 100px;
}

.connection-col-endpoint {
  width: 186px;
}

.connection-col-message {
  width: 262px;
}

.connection-break {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.connection-message {
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 0.75rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.sui-conn-kv .sui-kv-row {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--sui-hairline);
}

.sui-conn-kv .sui-kv-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.sui-log-pre {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background: rgb(var(--v-theme-surface-light));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 700px) {
  .connection-detail-table {
    display: none;
  }

  .connection-detail-cards {
    display: block;
  }

  .connection-detail-scroll {
    max-height: 65vh;
  }
}
</style>
