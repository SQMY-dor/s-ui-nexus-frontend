<template>
  <div class="sui-config-view">
    <RuleVue
      v-model="ruleModal.visible"
      :visible="ruleModal.visible"
      :index="ruleModal.index"
      :data="ruleModal.data"
      :clients="clients"
      :inTags="inboundTags"
      :outTags="outboundTags"
      :rsTags="rulesetTags"
      @close="closeRuleModal"
      @save="saveRuleModal"
    />
    <RulesetVue
      v-model="rulesetModal.visible"
      :visible="rulesetModal.visible"
      :index="rulesetModal.index"
      :data="rulesetModal.data"
      :outTags="outboundTags"
      @close="closeRulesetModal"
      @save="saveRulesetModal"
    />
    <RuleImport
      v-model="importRulesModal.visible"
      :visible="importRulesModal.visible"
      :existingRulesCount="rules.length"
      :existingRulesetsCount="rulesets.length"
      :existingRulesetTags="rulesetTags"
      @save="saveImportRule"
      @close="closeImportRule"
    />
    <RulesetImport
      v-model="importRulesetsModal.visible"
      :visible="importRulesetsModal.visible"
      :outTags="outboundTags"
      :rsTags="rulesetTags"
      @save="saveImportRulesets"
      @close="closeImportRulesets"
    />
    <ConfirmDialog
      v-model="deleteDialog.visible"
      :title="$t('ui.deleteTitle')"
      :message="$t('ui.deleteConfirm')"
      :confirm-text="$t('actions.del')"
      confirm-color="error"
      icon="mdi-delete-outline"
      @confirm="confirmDelete"
    >
      <div v-if="deleteDialog.label" class="mt-3">
        <v-chip size="small" variant="tonal" color="secondary" class="sui-mono" dir="ltr">
          {{ deleteDialog.label }}
        </v-chip>
      </div>
    </ConfirmDialog>

    <!-- Action Bar -->
    <div class="sui-subview-bar mb-4">
      <div class="sui-subview-bar__actions">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="showRuleModal(-1)"
        >
          {{ $t('rule.add') }}
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-database-plus-outline"
          @click="showRulesetModal(-1)"
        >
          {{ $t('ruleset.add') }}
        </v-btn>
        <v-menu v-model="actionMenu" location="bottom start">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-import"
              append-icon="mdi-chevron-down"
            >
              {{ $t('actions.action') }}
            </v-btn>
          </template>
          <v-list density="compact" nav min-width="220">
            <v-list-item
              prepend-icon="mdi-routes"
              :title="$t('rule.import.rulesTitle')"
              rounded="md"
              @click="showImportRule"
            />
            <v-list-item
              prepend-icon="mdi-download-multiple"
              :title="$t('rule.import.title')"
              rounded="md"
              @click="showImportRulesets"
            />
          </v-list>
        </v-menu>
      </div>

      <div class="sui-subview-bar__actions">
        <v-btn
          :color="stateChange ? 'secondary' : 'primary'"
          :variant="stateChange ? 'outlined' : 'flat'"
          prepend-icon="mdi-content-save-outline"
          :loading="loading"
          :disabled="stateChange"
          @click="saveConfig"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </div>

    <!-- Routing Defaults -->
    <v-card class="mb-4">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <span>{{ $t('basic.routing.title') }}</span>
        </div>

        <v-row align="center">
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="route.final"
              hide-details
              :label="$t('basic.routing.defaultOut')"
              clearable
              :items="outboundTags"
              @click:clear="delete route.final"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="route.default_interface"
              hide-details
              clearable
              dir="ltr"
              class="sui-mono-input"
              :label="$t('basic.routing.defaultIf')"
              @click:clear="delete route.default_interface"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="routeMark"
              hide-details
              type="number"
              min="0"
              class="sui-num"
              :label="$t('basic.routing.defaultRm')"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="route.auto_detect_interface"
              color="primary"
              :label="$t('basic.routing.autoBind')"
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Routing Rules Table -->
    <v-card class="mb-4">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <div class="d-flex align-center ga-2">
            <span>{{ $t('pages.rules') }}</span>
            <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num">
              {{ rules.length }}
            </v-chip>
          </div>
          <span v-if="rules.length > 1" class="sui-drag-hint text-caption text-medium-emphasis">
            <v-icon icon="mdi-drag-vertical" size="14" class="me-1" />
            {{ $t('ui.dragToReorder') }}
          </span>
        </div>

        <EmptyState
          v-if="rules.length === 0"
          icon="mdi-routes"
          :title="$t('ui.noItems')"
          :description="$t('ui.noItemsHint')"
          :action-text="$t('rule.add')"
          @action="showRuleModal(-1)"
        />

        <div v-else class="sui-table-wrap">
          <v-table density="comfortable" hover class="sui-rules-table">
            <thead>
              <tr>
                <th class="sui-col-order">#</th>
                <th class="sui-col-type">{{ $t('type') }}</th>
                <th class="sui-col-matchers">{{ $t('pages.rules') }}</th>
                <th class="sui-col-action-chip">{{ $t('admin.action') }}</th>
                <th class="sui-col-target">{{ $t('objects.outbound') }}</th>
                <th class="sui-col-actions text-end">{{ $t('actions.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in rules"
                :key="ruleRowKey(item, index)"
                :draggable="true"
                :class="{
                  'sui-row-dragging': draggedItemIndex === index,
                  'sui-row-drop-target': dragOverIndex === index && draggedItemIndex !== index,
                }"
                class="sui-draggable-row"
                @dragstart="onDragStart(index)"
                @dragover.prevent="onDragOver(index)"
                @dragleave="onDragLeave(index)"
                @drop="onDrop(index)"
                @dragend="onDragEnd"
              >
                <td class="sui-col-order">
                  <div class="sui-order-cell">
                    <v-icon
                      icon="mdi-drag-vertical"
                      size="18"
                      class="sui-drag-grip text-medium-emphasis"
                      aria-hidden="true"
                    />
                    <span class="sui-num font-weight-medium">{{ index + 1 }}</span>
                  </div>
                </td>

                <td class="sui-col-type">
                  <div class="d-flex flex-wrap align-center ga-1">
                    <v-chip
                      size="x-small"
                      :variant="item.type != undefined ? 'outlined' : 'tonal'"
                      :color="item.type != undefined ? 'info' : 'secondary'"
                    >
                      {{ item.type != undefined ? $t('rule.logical') + ' (' + item.mode + ')' : $t('rule.simple') }}
                    </v-chip>
                    <v-chip
                      v-if="item.invert"
                      size="x-small"
                      variant="outlined"
                      color="warning"
                    >
                      {{ $t('rule.invert') }}
                    </v-chip>
                  </div>
                </td>

                <td class="sui-col-matchers">
                  <div class="sui-matcher-list" dir="ltr">
                    <template v-if="summarizeRuleMatchers(item).length > 0">
                      <v-chip
                        v-for="(token, tIdx) in summarizeRuleMatchers(item).slice(0, 3)"
                        :key="tIdx"
                        size="x-small"
                        variant="tonal"
                        color="secondary"
                        class="sui-mono sui-matcher-chip"
                        :title="token"
                      >
                        <span class="text-truncate">{{ token }}</span>
                      </v-chip>
                      <v-tooltip
                        v-if="summarizeRuleMatchers(item).length > 3"
                        location="top"
                        :text="summarizeRuleMatchers(item).slice(3).join(' · ')"
                      >
                        <template #activator="{ props: tipProps }">
                          <v-chip
                            v-bind="tipProps"
                            size="x-small"
                            variant="outlined"
                            color="secondary"
                            class="sui-num"
                          >
                            +{{ summarizeRuleMatchers(item).length - 3 }}
                          </v-chip>
                        </template>
                      </v-tooltip>
                    </template>
                    <span v-else class="text-medium-emphasis sui-num">
                      {{ ruleMatcherCount(item) }}
                    </span>
                  </div>
                </td>

                <td class="sui-col-action-chip">
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    :color="ruleActionColor(item.action)"
                    class="sui-mono"
                  >
                    {{ item.action || 'route' }}
                  </v-chip>
                </td>

                <td class="sui-col-target">
                  <v-chip
                    v-if="item.outbound"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    class="sui-mono"
                    dir="ltr"
                  >
                    {{ item.outbound }}
                  </v-chip>
                  <v-chip
                    v-else-if="item.server"
                    size="x-small"
                    variant="outlined"
                    color="info"
                    class="sui-mono"
                    dir="ltr"
                  >
                    {{ item.server }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">-</span>
                </td>

                <td class="sui-col-actions text-end">
                  <div class="sui-row-actions">
                    <v-btn
                      icon="mdi-arrow-up"
                      variant="text"
                      size="small"
                      density="comfortable"
                      :disabled="index === 0"
                      :aria-label="$t('ui.dragToReorder')"
                      @click="moveRule(index, index - 1)"
                    />
                    <v-btn
                      icon="mdi-arrow-down"
                      variant="text"
                      size="small"
                      density="comfortable"
                      :disabled="index === rules.length - 1"
                      :aria-label="$t('ui.dragToReorder')"
                      @click="moveRule(index, index + 1)"
                    />
                    <v-tooltip location="top" :text="$t('actions.edit')">
                      <template #activator="{ props: tipProps }">
                        <v-btn
                          v-bind="tipProps"
                          icon="mdi-pencil-outline"
                          variant="text"
                          size="small"
                          density="comfortable"
                          :aria-label="$t('actions.edit')"
                          @click="showRuleModal(index)"
                        />
                      </template>
                    </v-tooltip>
                    <v-tooltip location="top" :text="$t('actions.del')">
                      <template #activator="{ props: tipProps }">
                        <v-btn
                          v-bind="tipProps"
                          icon="mdi-delete-outline"
                          variant="text"
                          size="small"
                          density="comfortable"
                          color="error"
                          :aria-label="$t('actions.del')"
                          @click="promptDeleteRule(index)"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>

    <!-- Rulesets Table -->
    <v-card>
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <div class="d-flex align-center ga-2">
            <span>{{ $t('rule.ruleset') }}</span>
            <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num">
              {{ rulesets.length }}
            </v-chip>
          </div>
        </div>

        <EmptyState
          v-if="rulesets.length === 0"
          icon="mdi-database-outline"
          :title="$t('ui.noItems')"
          :description="$t('ui.noItemsHint')"
          :action-text="$t('ruleset.add')"
          @action="showRulesetModal(-1)"
        />

        <div v-else class="sui-table-wrap">
          <v-table density="comfortable" hover class="sui-rules-table">
            <thead>
              <tr>
                <th>{{ $t('objects.tag') }}</th>
                <th>{{ $t('type') }}</th>
                <th>{{ $t('ruleset.format') }}</th>
                <th>{{ $t('objects.outbound') }}</th>
                <th>{{ $t('actions.update') }}</th>
                <th class="text-end">{{ $t('actions.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in rulesets" :key="item.tag || index">
                <td>
                  <div class="sui-ruleset-tag">
                    <span class="sui-mono font-weight-medium" dir="ltr">{{ item.tag }}</span>
                    <span
                      v-if="item.url || item.path"
                      class="sui-mono text-caption text-medium-emphasis text-truncate sui-ruleset-source"
                      dir="ltr"
                      :title="item.url || item.path"
                    >
                      {{ item.url || item.path }}
                    </span>
                  </div>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :variant="item.type === 'remote' ? 'outlined' : 'tonal'"
                    :color="item.type === 'remote' ? 'info' : 'secondary'"
                  >
                    {{ $t('ruleset.' + item.type) }}
                  </v-chip>
                </td>
                <td>
                  <span class="sui-mono">{{ item.format ?? '-' }}</span>
                </td>
                <td>
                  <v-chip
                    v-if="item.download_detour"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                    class="sui-mono"
                    dir="ltr"
                  >
                    {{ item.download_detour }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">-</span>
                </td>
                <td>
                  <span class="sui-mono sui-num" dir="ltr">{{ item.update_interval ?? '-' }}</span>
                </td>
                <td class="text-end">
                  <div class="sui-row-actions">
                    <v-tooltip location="top" :text="$t('actions.edit')">
                      <template #activator="{ props: tipProps }">
                        <v-btn
                          v-bind="tipProps"
                          icon="mdi-pencil-outline"
                          variant="text"
                          size="small"
                          density="comfortable"
                          :aria-label="$t('actions.edit')"
                          @click="showRulesetModal(index)"
                        />
                      </template>
                    </v-tooltip>
                    <v-tooltip location="top" :text="$t('actions.del')">
                      <template #activator="{ props: tipProps }">
                        <v-btn
                          v-bind="tipProps"
                          icon="mdi-delete-outline"
                          variant="text"
                          size="small"
                          density="comfortable"
                          color="error"
                          :aria-label="$t('actions.del')"
                          @click="promptDeleteRuleset(index, item.tag)"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
import Data from '@/store/modules/data'
import { computed, ref, onBeforeMount } from 'vue'
import RuleVue from '@/layouts/modals/Rule.vue'
import RulesetVue from '@/layouts/modals/Ruleset.vue'
import RulesetImport from '@/layouts/modals/RulesetImport.vue'
import RuleImport from '@/layouts/modals/RuleImport.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { Config } from '@/types/config'
import { actionKeys, ruleset } from '@/types/rules'
import { FindDiff } from '@/plugins/utils'

const oldConfig = ref<Record<string, any>>({})
const loading = ref(false)
const actionMenu = ref(false)

const appConfig = computed((): Config => {
  return <Config> Data().config
})

onBeforeMount(async () => {
  loading.value = true
  while (Data().lastLoad === 0) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  oldConfig.value = JSON.parse(JSON.stringify(Data().config))
  loading.value = false
})

const route = computed((): any => appConfig.value.route ?? {})

const routeMark = computed({
  get() {
    return route.value.default_mark ?? 0
  },
  set(v: number) {
    if (v > 0) route.value.default_mark = v
    else delete route.value.default_mark
  },
})

const stateChange = computed(() => FindDiff.deepCompare(appConfig.value, oldConfig.value))

const saveConfig = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const success = await Data().save('config', 'set', appConfig.value)
    if (success) oldConfig.value = JSON.parse(JSON.stringify(Data().config))
  } finally {
    loading.value = false
  }
}

const clients = computed((): string[] => (Data().clients ?? []).map((c: any) => c.name))

const rules = computed((): any[] => {
  const data = route.value
  if (!data) return []
  if (!('rules' in data) || !Array.isArray(data.rules)) data.rules = []
  return data.rules
})

const rulesets = computed((): any[] => {
  const data = route.value
  if (!data) return []
  if (!('rule_set' in data) || !Array.isArray(data.rule_set)) data.rule_set = []
  return data.rule_set
})

const rulesetTags = computed((): string[] => rulesets.value.map((rs: any) => rs.tag))

const outboundTags = computed((): string[] => [
  ...(Data().outbounds ?? []).map((o: any) => o.tag),
  ...(Data().endpoints ?? []).map((e: any) => e.tag),
])

const inboundTags = computed((): string[] => [
  ...(Data().inbounds ?? []).map((o: any) => o.tag),
  ...(Data().endpoints ?? []).filter((e: any) => e.listen_port > 0).map((e: any) => e.tag),
])

const ruleRowKey = (item: any, index: number): string => {
  return item?.id != null ? String(item.id) : `rule-${index}`
}

const formatMatcherValue = (key: string, val: unknown): string => {
  if (Array.isArray(val)) {
    const preview = val.slice(0, 2).join(', ')
    return val.length > 2 ? `${key}: ${preview} (+${val.length - 2})` : `${key}: ${preview}`
  }
  if (typeof val === 'boolean') return val ? key : `!${key}`
  return `${key}: ${String(val)}`
}

const summarizeRuleMatchers = (item: any): string[] => {
  if (!item || typeof item !== 'object') return []
  if (Array.isArray(item.rules)) {
    const tokens: string[] = []
    for (const sub of item.rules) {
      if (!sub || typeof sub !== 'object') continue
      for (const [k, v] of Object.entries(sub)) {
        if (actionKeys.includes(k) || k === 'id' || v === undefined || v === null || v === false) continue
        if (Array.isArray(v) && v.length === 0) continue
        tokens.push(formatMatcherValue(k, v))
      }
    }
    return tokens
  }
  const tokens: string[] = []
  for (const [k, v] of Object.entries(item)) {
    if (actionKeys.includes(k) || k === 'id' || k === 'type' || k === 'mode' || v === undefined || v === null || v === false) continue
    if (Array.isArray(v) && v.length === 0) continue
    tokens.push(formatMatcherValue(k, v))
  }
  return tokens
}

const ruleMatcherCount = (item: any): number => {
  if (Array.isArray(item?.rules)) return item.rules.length
  return Object.keys(item ?? {}).filter((r) => !actionKeys.includes(r) && r !== 'id').length
}

const ruleActionColor = (action?: string): string => {
  if (action === 'reject') return 'error'
  if (action === 'hijack-dns' || action === 'resolve') return 'info'
  if (action === 'route-options') return 'warning'
  if (action === 'sniff' || action === 'bypass') return 'secondary'
  return 'primary'
}

const ruleModal = ref({ visible: false, index: -1, data: '' })
const showRuleModal = (index: number) => {
  ruleModal.value.index = index
  ruleModal.value.data = index === -1 ? '' : JSON.stringify(rules.value[index])
  ruleModal.value.visible = true
}
const closeRuleModal = () => {
  ruleModal.value.visible = false
}
const saveRuleModal = (data: any) => {
  if (ruleModal.value.index === -1) rules.value.push(data)
  else rules.value[ruleModal.value.index] = data
  ruleModal.value.visible = false
}

const rulesetModal = ref({ visible: false, index: -1, data: '' })
const showRulesetModal = (index: number) => {
  rulesetModal.value.index = index
  rulesetModal.value.data = index === -1 ? '' : JSON.stringify(rulesets.value[index])
  rulesetModal.value.visible = true
}
const closeRulesetModal = () => {
  rulesetModal.value.visible = false
}
const saveRulesetModal = (data: ruleset) => {
  if (rulesetModal.value.index === -1) rulesets.value.push(data)
  else rulesets.value[rulesetModal.value.index] = data
  rulesetModal.value.visible = false
}

const deleteDialog = ref<{
  visible: boolean
  kind: 'rule' | 'ruleset'
  index: number
  label: string
}>({
  visible: false,
  kind: 'rule',
  index: -1,
  label: '',
})

const promptDeleteRule = (index: number) => {
  const item = rules.value[index]
  deleteDialog.value = {
    visible: true,
    kind: 'rule',
    index,
    label: `#${index + 1} · ${item?.action || 'route'}${item?.outbound ? ` → ${item.outbound}` : ''}`,
  }
}

const promptDeleteRuleset = (index: number, tag: string) => {
  deleteDialog.value = {
    visible: true,
    kind: 'ruleset',
    index,
    label: tag || `#${index + 1}`,
  }
}

const confirmDelete = () => {
  const { kind, index } = deleteDialog.value
  if (index >= 0) {
    if (kind === 'rule') rules.value.splice(index, 1)
    else rulesets.value.splice(index, 1)
  }
  deleteDialog.value.visible = false
}

const moveRule = (fromIndex: number, toIndex: number) => {
  if (toIndex < 0 || toIndex >= rules.value.length || fromIndex === toIndex) return
  const [moved] = rules.value.splice(fromIndex, 1)
  rules.value.splice(toIndex, 0, moved)
}

const draggedItemIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const onDragStart = (index: number) => {
  draggedItemIndex.value = index
}
const onDragOver = (index: number) => {
  dragOverIndex.value = index
}
const onDragLeave = (index: number) => {
  if (dragOverIndex.value === index) dragOverIndex.value = null
}
const onDrop = (index: number) => {
  if (draggedItemIndex.value !== null && draggedItemIndex.value !== index) {
    moveRule(draggedItemIndex.value, index)
  }
  draggedItemIndex.value = null
  dragOverIndex.value = null
}
const onDragEnd = () => {
  draggedItemIndex.value = null
  dragOverIndex.value = null
}

const importRulesModal = ref({ visible: false })
function showImportRule() {
  actionMenu.value = false
  importRulesModal.value.visible = true
}
function closeImportRule() {
  importRulesModal.value.visible = false
}
function saveImportRule(block: any, mode: 'merge' | 'replace', applyFinal: boolean) {
  if (mode === 'replace') {
    route.value.rules = block.rules ?? []
    route.value.rule_set = block.rule_set ?? []
  } else {
    const existingTags = new Set(rulesetTags.value)
    if (block.rules) rules.value.push(...block.rules)
    if (block.rule_set) {
      for (const rs of block.rule_set) {
        if (!existingTags.has(rs.tag)) rulesets.value.push(rs)
      }
    }
  }
  if (applyFinal && block.final) route.value.final = block.final
  importRulesModal.value.visible = false
}

const importRulesetsModal = ref({ visible: false })
function showImportRulesets() {
  actionMenu.value = false
  importRulesetsModal.value.visible = true
}
function closeImportRulesets() {
  importRulesetsModal.value.visible = false
}
function saveImportRulesets(items: any[]) {
  rulesets.value.push(...items)
  importRulesetsModal.value.visible = false
}
</script>

<style scoped>
.sui-config-view {
  width: 100%;
}

.sui-subview-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
}

.sui-subview-bar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-drag-hint {
  display: inline-flex;
  align-items: center;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.sui-rules-table th {
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.sui-col-order {
  width: 72px;
  white-space: nowrap;
}

.sui-col-type {
  white-space: nowrap;
}

.sui-col-matchers {
  min-width: 220px;
}

.sui-col-action-chip,
.sui-col-target,
.sui-col-actions {
  white-space: nowrap;
}

.sui-order-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sui-drag-grip {
  cursor: grab;
}

.sui-draggable-row {
  transition: background-color 140ms ease;
}

.sui-row-dragging {
  opacity: 0.48;
}

.sui-row-drop-target {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.sui-matcher-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.sui-matcher-chip {
  max-width: 260px;
}

.sui-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.sui-ruleset-tag {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sui-ruleset-source {
  max-width: 320px;
}

:deep(.sui-mono-input input) {
  font-family: var(--sui-font-mono);
  font-size: 0.875rem;
}
</style>
