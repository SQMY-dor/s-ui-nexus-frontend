<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="900">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-history" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('admin.changes') }}
          </div>
          <v-chip v-if="changes.length > 0" size="small" color="primary" variant="tonal" class="sui-num">
            {{ changes.length }}
          </v-chip>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="$emit('close')"
        />
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <v-row align="center" class="mb-3">
          <v-col cols="12" sm="4" md="4">
            <v-select
              v-model="user"
              hide-details
              :label="$t('admin.actor')"
              :items="['', 'DepleteJob', ...admins]"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="12" sm="4" md="4">
            <v-select
              v-model="key"
              hide-details
              :label="$t('admin.key')"
              :items="['', 'inbounds', 'outbounds', 'clients', 'route', 'tls', 'experimental']"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="8" sm="2" md="3">
            <v-select
              v-model.number="chngCount"
              hide-details
              :label="$t('count')"
              :items="[10, 20, 30, 50, 100]"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="4" sm="2" md="1" class="d-flex justify-end">
            <v-btn
              icon="mdi-refresh"
              variant="tonal"
              size="small"
              :loading="loading"
              :aria-label="$t('actions.update')"
              @click="loadData"
            />
          </v-col>
        </v-row>

        <div class="sui-table-wrap sui-changes-table">
          <v-data-table
            :headers="changesHeaders"
            :items="changes"
            item-value="id"
            density="compact"
            show-expand
            :items-per-page="10"
          >
            <template v-slot:item.id="{ value }">
              <span class="sui-num text-medium-emphasis">#{{ value }}</span>
            </template>
            <template v-slot:item.dateTime="{ value }">
              <span dir="ltr" class="sui-mono text-caption">
                {{ dateFormatted(value) }}
              </span>
            </template>
            <template v-slot:item.key="{ value }">
              <span class="sui-mono text-caption">{{ value }}</span>
            </template>
            <template v-slot:item.action="{ value }">
              <v-chip :color="actionColor(value)" variant="outlined" size="small">
                {{ $t('actions.' + value) }}
              </v-chip>
            </template>
            <template v-slot:expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length" class="pa-3 sui-expanded-cell">
                  <div v-if="item.index > 0" class="mb-2">
                    <v-chip size="x-small" variant="tonal" color="secondary" class="sui-mono" dir="ltr">
                      Index: {{ item.index }}
                    </v-chip>
                  </div>
                  <pre class="sui-diff-pre sui-mono" dir="ltr">{{ formatObj(item.obj) }}</pre>
                </td>
              </tr>
            </template>
          </v-data-table>
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="$emit('close')">
          {{ $t('actions.close') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'

export default {
  props: ['admins', 'actor', 'visible'],
  emits: ['close'],
  data() {
    return {
      loading: false,
      changes: <any[]>[],
      user: '',
      key: '',
      chngCount: 10,
      expanded: [],
      changesHeaders: [
        { title: 'ID', key: 'id' },
        { title: i18n.global.t('admin.date') + ' - ' + i18n.global.t('admin.time'), key: 'dateTime' },
        { title: i18n.global.t('admin.actor'), key: 'Actor' },
        { title: i18n.global.t('admin.key'), key: 'key' },
        { title: i18n.global.t('admin.action'), key: 'action' },
      ],
    }
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const data = await HttpUtils.get('api/changes', { a: this.user, k: this.key, c: this.chngCount })
        if (data.success) {
          this.changes = data.obj ?? []
        }
      } finally {
        this.loading = false
      }
    },
    dateFormatted(dt: number): string {
      const date = new Date(dt * 1000)
      return date.toLocaleString(this.locale)
    },
    actionColor(action: string): string {
      if (!action) return 'secondary'
      if (action.startsWith('del')) return 'error'
      if (action.startsWith('add') || action === 'new') return 'success'
      if (action.startsWith('edit') || action === 'set') return 'info'
      return 'secondary'
    },
    formatObj(obj: unknown): string {
      if (typeof obj === 'string') {
        try {
          return JSON.stringify(JSON.parse(obj), null, 2)
        } catch {
          return obj
        }
      }
      if (obj != null && typeof obj === 'object') {
        return JSON.stringify(obj, null, 2)
      }
      return String(obj ?? '')
    },
  },
  computed: {
    locale() {
      const l = i18n.global.locale.value
      switch (l) {
        case 'zhHans':
          return 'zh-cn'
        case 'zhHant':
          return 'zh-tw'
        default:
          return l
      }
    },
  },
  watch: {
    visible(newValue) {
      this.changes = []
      this.user = this.$props.actor
      this.key = ''
      this.chngCount = 10
      if (newValue) {
        this.loadData()
      }
    },
  },
}
</script>

<style scoped>
.sui-changes-table {
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-md);
}

.sui-expanded-cell {
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-diff-pre {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78125rem;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 280px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
