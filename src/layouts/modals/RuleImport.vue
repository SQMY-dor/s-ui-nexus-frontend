<template>
  <v-dialog transition="dialog-top-transition" width="100%" max-width="860">
    <v-card class="sui-modal-card" :loading="fetching">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-file-import-outline" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 flex-wrap min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('rule.import.rulesTitle') }}
            </div>
            <v-chip v-if="parsed" size="small" color="primary" variant="tonal" class="sui-num">
              {{ parsed.rules?.length ?? 0 }} {{ $t('pages.rules') }} · {{ parsed.rule_set?.length ?? 0 }} {{ $t('rule.ruleset') }}
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
        <v-tab value="json">JSON</v-tab>
        <v-tab value="file">{{ $t('rule.import.uploadFile') }}</v-tab>
        <v-tab value="url">{{ $t('rule.import.fromUrl') }}</v-tab>
      </v-tabs>
      <v-divider />

      <div class="sui-modal-body">
        <v-window v-model="tab">
          <v-window-item value="json">
            <v-alert variant="tonal" type="info" density="compact" class="mb-3">
              {{ $t('rule.import.jsonHint') }}
            </v-alert>
            <v-textarea
              v-model="rawJson"
              dir="ltr"
              class="sui-mono"
              label="JSON"
              rows="10"
              hide-details
              spellcheck="false"
              :error="!!error"
            />
          </v-window-item>

          <v-window-item value="file">
            <v-alert variant="tonal" type="info" density="compact" class="mb-3">
              {{ $t('rule.import.fileJsonHint') }}
            </v-alert>
            <v-file-input
              :label="$t('rule.import.selectJson')"
              accept=".json"
              variant="outlined"
              density="compact"
              hide-details
              prepend-icon="mdi-file-code-outline"
              clearable
              @click:clear="tabChanged"
              @update:model-value="onFileUpload($event)"
            />
          </v-window-item>

          <v-window-item value="url">
            <v-alert variant="tonal" type="info" density="compact" class="mb-3">
              {{ $t('rule.import.urlHint') }}
            </v-alert>
            <v-text-field
              v-model="fetchUrl"
              dir="ltr"
              class="sui-mono"
              label="URL"
              hide-details
              spellcheck="false"
              placeholder="https://raw.githubusercontent.com/.../rules.json"
              @keydown.enter="fetchFromUrl"
            >
              <template #append>
                <v-btn
                  color="primary"
                  variant="tonal"
                  size="small"
                  icon="mdi-download"
                  :loading="fetching"
                  :disabled="!fetchUrl.trim()"
                  :aria-label="$t('rule.import.parse')"
                  @click="fetchFromUrl"
                />
              </template>
            </v-text-field>
          </v-window-item>
        </v-window>

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3 import-error">
          {{ error }}
        </v-alert>

        <template v-if="parsed">
          <v-divider class="my-4" />

          <v-alert v-if="hasConflicts" type="warning" variant="tonal" density="compact" :title="$t('rule.import.conflict')" class="mb-3">
            <div class="text-body-2">{{ $t('rule.import.conflictDesc', { rules: existingRulesCount, rulesets: existingRulesetsCount }) }}</div>
            <v-radio-group v-model="mode" hide-details density="compact" class="mt-2">
              <v-radio value="merge" :label="$t('rule.import.merge')" />
              <v-radio value="replace" :label="$t('rule.import.replace')" />
            </v-radio-group>
          </v-alert>

          <v-alert v-if="parsed.final" type="info" variant="tonal" density="compact" class="mb-3">
            <div class="d-flex align-center flex-wrap ga-2">
              <span>{{ $t('rule.import.finalOutbound') }}:</span>
              <v-chip size="small" color="secondary" variant="outlined" class="sui-mono">{{ parsed.final }}</v-chip>
            </div>
            <v-checkbox v-model="applyFinal" :label="$t('rule.import.applyFinal')" hide-details density="compact" class="mt-1" />
          </v-alert>

          <template v-if="parsed.rules?.length">
            <div class="sui-section-header">
              <span>{{ $t('pages.rules') }}</span>
              <v-chip size="small" color="success" variant="outlined" class="sui-num">
                {{ parsed.rules.length }}
              </v-chip>
            </div>
            <div class="sui-table-wrap sui-preview-table mb-4">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{{ $t('type') }}</th>
                    <th>{{ $t('admin.action') }}</th>
                    <th>{{ $t('objects.outbound') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in parsed.rules" :key="i">
                    <td class="sui-num text-medium-emphasis">{{ (i as number) + 1 }}</td>
                    <td>{{ r.type ?? 'simple' }}</td>
                    <td class="sui-mono text-caption">{{ r.action }}</td>
                    <td class="sui-mono text-caption">{{ r.outbound ?? '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </template>

          <template v-if="parsed.rule_set?.length">
            <div class="sui-section-header">
              <span>{{ $t('rule.ruleset') }}</span>
              <div class="d-flex align-center ga-2">
                <v-chip size="small" color="success" variant="outlined" class="sui-num">
                  {{ parsed.rule_set.length }}
                </v-chip>
                <v-chip
                  v-if="skippedRulesets > 0"
                  v-tooltip:top="$t('rule.import.skipped')"
                  size="small"
                  color="warning"
                  variant="outlined"
                  class="sui-num"
                >
                  {{ skippedRulesets }}
                </v-chip>
              </div>
            </div>
            <div class="sui-table-wrap sui-preview-table">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>{{ $t('objects.tag') }}</th>
                    <th>{{ $t('ruleset.format') }}</th>
                    <th>{{ $t('type') }}</th>
                    <th>{{ $t('ruleset.interval') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(rs, i) in parsed.rule_set"
                    :key="i"
                    :class="{ 'sui-row-skipped': mode === 'merge' && existingRulesetTags.includes(rs.tag) }"
                  >
                    <td class="sui-mono text-caption">{{ rs.tag }}</td>
                    <td>{{ rs.format }}</td>
                    <td>{{ rs.type }}</td>
                    <td class="sui-mono text-caption">{{ rs.update_interval ?? '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </template>
        </template>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn
          v-if="tab === 'json'"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-magnify"
          :disabled="rawJson.trim().length === 0"
          @click="parseJson"
        >
          {{ $t('rule.import.parse') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="close">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :disabled="!parsed" @click="save">
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
export default {
  props: ['visible', 'existingRulesCount', 'existingRulesetsCount', 'existingRulesetTags'],
  emits: ['save', 'close'],
  data() {
    return {
      tab: 'json',
      rawJson: '',
      fetchUrl: '',
      fetching: false,
      error: '',
      parsed: null as any,
      mode: 'merge' as 'merge' | 'replace',
      applyFinal: false,
    }
  },
  computed: {
    hasConflicts(): boolean {
      return this.existingRulesCount > 0 || this.existingRulesetsCount > 0
    },
    skippedRulesets(): number {
      if (!this.parsed?.rule_set) return 0
      const existing = new Set(this.existingRulesetTags)
      return this.parsed.rule_set.filter((rs: any) => existing.has(rs.tag)).length
    },
  },
  methods: {
    tabChanged() {
      this.rawJson = ''
      this.fetchUrl = ''
      this.error = ''
      this.parsed = null
      this.mode = this.hasConflicts ? 'merge' : 'replace'
      this.applyFinal = false
    },
    extractRouteBlock(obj: any): any {
      if (obj?.route && (obj.route.rules || obj.route.rule_set)) return obj.route
      if (obj?.rules || obj?.rule_set) return obj
      return null
    },
    setParsed(block: any) {
      this.parsed = block
      this.mode = this.hasConflicts ? 'merge' : 'replace'
      this.applyFinal = false
    },
    reset() {
      this.tab = 'json'
      this.tabChanged()
    },
    parseJson() {
      this.error = ''
      this.parsed = null
      try {
        const block = this.extractRouteBlock(JSON.parse(this.rawJson))
        if (!block) {
          this.error = this.$t('rule.import.errNoArrays')
          return
        }
        this.setParsed(block)
      } catch (e: any) {
        this.error = this.$t('rule.import.errJsonParse', { message: e.message })
      }
    },
    async fetchFromUrl() {
      this.error = ''
      this.parsed = null
      this.fetching = true
      try {
        const resp = await fetch(this.fetchUrl)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const block = this.extractRouteBlock(await resp.json())
        if (!block) this.error = this.$t('rule.import.errNoArraysFetched')
        else this.setParsed(block)
      } catch (e: any) {
        this.error = this.$t('rule.import.errFetch', { message: e.message })
      } finally {
        this.fetching = false
      }
    },
    async onFileUpload(files: File | File[] | null) {
      this.error = ''
      this.parsed = null
      const file = Array.isArray(files) ? files[0] : files
      if (!file) {
        this.error = this.$t('rule.import.errNoFile')
        return
      }
      try {
        const block = this.extractRouteBlock(JSON.parse(await file.text()))
        if (!block) {
          this.error = this.$t('rule.import.errNoArraysInFile')
          return
        }
        this.setParsed(block)
      } catch (e: any) {
        this.error = this.$t('rule.import.errJsonParse', { message: e.message })
        return
      }
    },
    save() {
      if (!this.parsed) return
      this.$emit('save', this.parsed, this.mode, this.applyFinal)
    },
    close() {
      this.$emit('close')
    },
  },
  watch: {
    visible(v: boolean) {
      if (v) this.reset()
    },
  },
}
</script>

<style scoped>
.import-error {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.sui-preview-table {
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-md);
}

.sui-row-skipped {
  opacity: 0.45;
}
</style>
