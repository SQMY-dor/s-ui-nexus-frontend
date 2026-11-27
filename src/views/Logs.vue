<template>
  <div class="sui-logs-view">
    <PageHeader
      :title="$t('logsView.title')"
      :subtitle="$t('logsView.subtitle')"
      :count="items.length"
    >
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
      <v-card-text class="pa-3 pa-sm-4">
        <v-row density="compact" align="center">
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="search"
              :label="$t('logsView.search')"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
              @keyup.enter="load"
            />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-text-field
              v-model="user"
              :label="$t('logsView.user')"
              hide-details
              clearable
              @keyup.enter="load"
            />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="level"
              :label="$t('logsView.level')"
              :items="levels"
              hide-details
              @update:model-value="load"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-text-field
              v-model="start"
              :label="$t('logsView.from')"
              type="date"
              hide-details
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-text-field
              v-model="end"
              :label="$t('logsView.to')"
              type="date"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="1">
            <v-btn block color="primary" variant="flat" :loading="loading" @click="load">
              {{ $t('logsView.apply') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-progress-linear v-if="loading" indeterminate color="primary" height="2" />
    </v-card>

    <EmptyState
      v-if="!loading && items.length === 0"
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
          height="calc(100vh - 290px)"
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
              v-for="(item, index) in items"
              :key="`${item.timestamp}-${index}`"
              :class="rowToneClass(item.level)"
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
              <td class="log-break">{{ item.user || '—' }}</td>
              <td class="log-break sui-mono text-caption text-medium-emphasis">
                {{ item.source || 'system' }}
              </td>
              <td class="log-message sui-mono">{{ item.message }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import HttpUtils from '@/plugins/httputil'
import { logLevelColor as levelColor } from '@/plugins/logs'

const loading = ref(false)
const items = ref<any[]>([])
const search = ref('')
const user = ref('')
const level = ref('ALL')
const start = ref('')
const end = ref('')
const levels = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR']

const unix = (value: string, endOfDay = false) =>
  value ? Math.floor(new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).getTime() / 1000) : 0

const load = async () => {
  loading.value = true
  try {
    const response = await HttpUtils.get('api/structured-logs', {
      level: level.value,
      user: user.value,
      search: search.value,
      start: unix(start.value),
      end: unix(end.value, true),
      limit: 1000,
    })
    if (response.success) items.value = response.obj?.items ?? []
  } finally {
    loading.value = false
  }
}

const formatTime = (value: number) => (value ? new Date(value * 1000).toLocaleString() : '—')

const rowToneClass = (lvl: string): string => {
  const c = levelColor(lvl || '')
  if (c === 'error') return 'sui-log-tr--error'
  if (c === 'warning') return 'sui-log-tr--warning'
  return ''
}

onMounted(load)
</script>

<style scoped>
.sui-logs-view {
  width: 100%;
  min-width: 0;
}

.sui-table-wrap :deep(.v-table__wrapper) {
  overflow-x: visible;
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

.log-break,
.log-message {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.log-message {
  white-space: pre-wrap;
  font-size: 0.78rem;
}
</style>
