<template>
  <v-dialog transition="dialog-top-transition" width="100%" max-width="840">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-playlist-plus" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 flex-wrap min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('rule.import.title') }}
            </div>
            <v-chip v-if="importPreview.length > 0" size="small" color="primary" variant="tonal" class="sui-num">
              {{ $t('count') }}: {{ importPreview.length }}
            </v-chip>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="close"
        />
      </div>

      <v-divider />

      <v-tabs v-model="tab" align-tabs="start" class="px-4" @update:model-value="tabChanged">
        <v-tab value="text">{{ $t('rule.import.pasteUrls') }}</v-tab>
        <v-tab value="file">{{ $t('rule.import.uploadTxt') }}</v-tab>
      </v-tabs>
      <v-divider />

      <div class="sui-modal-body">
        <v-window v-model="tab" class="mb-4">
          <v-window-item value="text">
            <v-alert variant="tonal" type="info" density="compact" class="mb-3">
              {{ $t('rule.import.urlsHint') }}
            </v-alert>
            <v-textarea
              v-model="importRawText"
              dir="ltr"
              class="sui-mono"
              label="URLs"
              rows="8"
              auto-grow
              hide-details
              spellcheck="false"
              placeholder="https://github.com/.../geoip-telegram.srs&#10;https://github.com/.../geosite-youtube.srs"
            />
          </v-window-item>
          <v-window-item value="file">
            <v-alert variant="tonal" type="info" density="compact" class="mb-3">
              {{ $t('rule.import.fileHint') }}
            </v-alert>
            <v-file-input
              :label="$t('rule.import.selectTxt')"
              accept=".txt"
              variant="outlined"
              density="compact"
              hide-details
              prepend-icon="mdi-file-document-outline"
              @change="onFileUpload"
            />
          </v-window-item>
        </v-window>

        <v-row>
          <v-col cols="12" sm="4">
            <v-select
              v-model="importFormat"
              hide-details
              :label="$t('ruleset.format')"
              :items="['source', 'binary']"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="importDetour"
              hide-details
              :label="$t('objects.outbound')"
              :items="outTags"
              clearable
              @click:clear="importDetour = ''"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="importInterval"
              :suffix="$t('date.d')"
              type="number"
              min="0"
              :label="$t('ruleset.interval')"
              hide-details
            />
          </v-col>
        </v-row>

        <template v-if="importPreview.length > 0">
          <v-divider class="my-4" />
          <div class="sui-section-header">
            <span>{{ $t('rule.import.preview') }}</span>
            <div class="d-flex align-center ga-2">
              <v-chip size="small" color="success" variant="outlined" class="sui-num">
                {{ importPreview.length }}
              </v-chip>
              <v-chip
                v-if="importSkipped > 0"
                v-tooltip:top="$t('rule.import.skipped')"
                size="small"
                color="warning"
                variant="outlined"
                class="sui-num"
              >
                {{ importSkipped }}
              </v-chip>
            </div>
          </div>

          <div class="sui-table-wrap sui-preview-table">
            <v-table density="compact">
              <thead>
                <tr>
                  <th>{{ $t('objects.tag') }}</th>
                  <th>{{ $t('ruleset.format') }}</th>
                  <th>URL</th>
                  <th class="text-end">{{ $t('actions.del') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in importPreview" :key="i" :class="{ 'sui-row-skipped': item.exists }">
                  <td class="sui-mono text-caption">{{ item.tag }}</td>
                  <td>{{ item.format }}</td>
                  <td v-tooltip:top="item.url" dir="ltr" class="sui-mono text-caption">
                    .../{{ item.url.split('/').pop() ?? item.url }}
                  </td>
                  <td class="text-end">
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      color="error"
                      size="small"
                      :aria-label="$t('actions.del')"
                      @click="importPreview.splice(i, 1)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </template>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-magnify"
          :disabled="importRawText.trim().length === 0"
          @click="parseImport"
        >
          {{ $t('rule.import.parse') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="close">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :disabled="newCount === 0" @click="save">
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
interface ImportItem { tag: string; url: string; format: string; exists: boolean }

export default {
  props: ['visible', 'outTags', 'rsTags'],
  emits: ['save', 'close'],
  data() {
    return {
      tab: 'text',
      importRawText: '',
      importFormat: 'binary',
      importDetour: '',
      importInterval: 1,
      importPreview: [] as ImportItem[],
    }
  },
  computed: {
    importSkipped(): number {
      return this.importPreview.filter(i => i.exists).length
    },
    newCount(): number {
      return this.importPreview.filter(i => !i.exists).length
    },
  },
  methods: {
    tabChanged() {
      this.importPreview = []
      this.importRawText = ''
    },
    urlToTag(url: string): string {
      try {
        const filename = new URL(url).pathname.split('/').pop() ?? ''
        return filename.replace(/\.[^.]+$/, '')
      } catch {
        const parts = url.split('/')
        return parts[parts.length - 1].replace(/\.[^.]+$/, '') || url
      }
    },
    close() {
      this.$emit('close')
    },
    parseImport() {
      const existingTags = new Set(this.rsTags)
      const seen = new Set<string>()
      this.importPreview = this.importRawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.startsWith('http'))
        .filter(url => {
          if (seen.has(url)) return false
          seen.add(url)
          return true
        })
        .map(url => ({ tag: this.urlToTag(url), url, format: this.importFormat, exists: existingTags.has(this.urlToTag(url)) }))
    },
    save() {
      const toAdd = this.importPreview.filter(i => !i.exists).map(item => {
        const rs: any = { type: 'remote', tag: item.tag, format: item.format, url: item.url }
        if (this.importDetour) rs.download_detour = this.importDetour
        if (this.importInterval > 0) rs.update_interval = this.importInterval + 'd'
        return rs
      })
      this.$emit('save', toAdd)
    },
    async onFileUpload(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      this.importRawText = await file.text()
      this.parseImport()
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.tab = 'text'
        this.tabChanged()
      }
    },
  },
}
</script>

<style scoped>
.sui-preview-table {
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-md);
}

.sui-row-skipped {
  opacity: 0.45;
}
</style>
