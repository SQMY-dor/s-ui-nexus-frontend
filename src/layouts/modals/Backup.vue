<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="520">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-database-sync-outline" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('main.backup.title') }}
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

      <div class="sui-modal-body">
        <div class="sui-section-header">
          <span>{{ $t('tools.backupRestore') }}</span>
        </div>

        <div class="sui-backup-panel mb-4">
          <v-row>
            <v-col cols="12" sm="6">
              <v-checkbox
                v-model="exclude"
                :label="$t('main.backup.exclStats')"
                value="stats"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-checkbox
                v-model="exclude"
                :label="$t('main.backup.exclChanges')"
                value="changes"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <div class="d-flex flex-wrap ga-2 mt-3">
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-database-export-outline"
              @click="backup()"
            >
              {{ $t('main.backup.backup') }}
            </v-btn>
            <v-btn
              color="warning"
              variant="tonal"
              prepend-icon="mdi-database-import-outline"
              @click="restore()"
            >
              {{ $t('main.backup.restore') }}
            </v-btn>
          </div>
        </div>

        <div class="sui-section-header">
          <span>{{ $t('objects.config') }}</span>
        </div>

        <div class="sui-backup-panel d-flex align-center justify-space-between flex-wrap ga-3">
          <div class="text-body-2 text-medium-emphasis">
            {{ $t('tools.generatedRuntimeJson') }}
          </div>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-code-json"
            @click="config()"
          >
            {{ $t('main.backup.sbConfig') }}
          </v-btn>
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

export default {
  props: ['control', 'visible'],
  data() {
    return {
      exclude: ['stats', 'changes'],
    }
  },
  methods: {
    backup() {
      const excludeOption = this.exclude.length > 0 ? '?exclude=' + this.exclude.join(',') : ''
      window.location.href = 'api/getdb' + excludeOption
    },
    config() {
      window.location.href = 'api/singbox-config'
    },
    restore() {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.db'

      fileInput.addEventListener('change', async (event: Event) => {
        const inputElement = event.target as HTMLInputElement
        const dbFile = inputElement.files ? inputElement.files[0] : null

        if (dbFile) {
          const formData = new FormData()
          formData.append('db', dbFile)

          this.control.visible = false

          const uploadMsg = await HttpUtils.post('api/importdb', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })

          if (uploadMsg.success) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            location.reload()
          }
        }
      })

      fileInput.click()
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.exclude = ['stats', 'changes']
      }
    },
  },
}
</script>

<style scoped>
.sui-backup-panel {
  padding: 12px 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}
</style>
