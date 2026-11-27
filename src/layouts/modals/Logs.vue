<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="1080">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-text-box-search-outline" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('basic.log.title') }}
            </div>
            <v-chip v-if="lines.length > 0" size="small" color="primary" variant="tonal" class="sui-num">
              {{ lines.length }}
            </v-chip>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="control.visible = false"
        />
      </div>

      <v-divider />

      <div class="sui-modal-body log-dialog-content">
        <v-row align="center" class="mb-3">
          <v-col cols="12" sm="5" md="4">
            <v-select
              v-model="logLevel"
              hide-details
              :label="$t('basic.log.level')"
              :items="logLevels"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="8" sm="5" md="4">
            <v-select
              v-model.number="logCount"
              hide-details
              :label="$t('count')"
              :items="[10, 20, 30, 50, 100]"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="4" sm="2" md="4" class="d-flex justify-end">
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

        <div class="sui-logs-wrap">
          <LogLines :lines="lines" />
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="control.visible = false">
          {{ $t('actions.close') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import HttpUtils from '@/plugins/httputil'
import LogLines from '@/components/LogLines.vue'

export default {
  components: { LogLines },
  props: ['control', 'visible'],
  data() {
    return {
      loading: false,
      lines: [] as string[],
      logLevel: 'info',
      logLevels: [
        { title: 'DEBUG', value: 'debug' },
        { title: 'INFO', value: 'info' },
        { title: 'WARNING', value: 'warning' },
        { title: 'ERROR', value: 'error' },
      ],
      logCount: 10,
    }
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const data = await HttpUtils.get('api/logs', { c: this.logCount, l: this.logLevel })
        if (data.success) {
          this.lines = Array.isArray(data.obj) ? data.obj.map(String) : []
        }
      } finally {
        this.loading = false
      }
    },
  },
  watch: {
    visible(v) {
      this.lines = []
      this.logLevel = 'info'
      this.logCount = 10
      if (v) {
        this.loadData()
      }
    },
  },
}
</script>

<style scoped>
.log-dialog-content {
  min-width: 0;
}

.sui-logs-wrap {
  min-width: 0;
}
</style>
