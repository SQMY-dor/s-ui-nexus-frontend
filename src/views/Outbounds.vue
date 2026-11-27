<template>
  <div class="sui-view">
    <OutboundVue
      v-model="modal.visible"
      :visible="modal.visible"
      :id="modal.id"
      :data="modal.data"
      :tags="outboundTags"
      @close="closeModal"
    />
    <OutboundBulk
      v-model="bulkModal.visible"
      :visible="bulkModal.visible"
      :outboundTags="outboundTags"
      @close="closeBulkModal"
    />
    <Stats
      v-model="stats.visible"
      :visible="stats.visible"
      :resource="stats.resource"
      :tag="stats.tag"
      @close="closeStats"
    />
    <ConfirmDialog
      v-model="deleteDialog.visible"
      :title="$t('ui.deleteTitle')"
      :message="$t('ui.deleteConfirm')"
      :confirm-text="$t('actions.del')"
      confirm-color="error"
      icon="mdi-delete-outline"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      <div v-if="deleteDialog.tag" class="mt-3">
        <v-chip size="small" variant="tonal" color="secondary" class="sui-mono" dir="ltr">
          {{ deleteDialog.tag }}
        </v-chip>
      </div>
    </ConfirmDialog>

    <PageHeader
      v-model:search="search"
      :title="$t('pages.outbounds')"
      :count="filteredOutbounds.length"
      searchable
    >
      <template #actions>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="showModal(0)"
        >
          {{ $t('actions.add') }}
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-playlist-plus"
          @click="showBulkModal"
        >
          {{ $t('actions.addbulk') }}
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-speedometer"
          :loading="testingAll"
          :disabled="testingAll || outbounds.length === 0"
          @click="checkAllOutbounds"
        >
          {{ $t('actions.testAll') }}
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="typeFilters.length > 1" class="sui-filter-bar mb-4">
      <v-btn
        size="small"
        :variant="selectedType === 'all' ? 'flat' : 'tonal'"
        :color="selectedType === 'all' ? 'primary' : 'secondary'"
        @click="selectedType = 'all'"
      >
        {{ $t('all') }}
        <span class="sui-num ms-1">({{ outbounds.length }})</span>
      </v-btn>
      <v-btn
        v-for="entry in typeFilters"
        :key="entry.type"
        size="small"
        :variant="selectedType === entry.type ? 'flat' : 'tonal'"
        :color="selectedType === entry.type ? 'primary' : 'secondary'"
        class="sui-mono"
        @click="selectedType = entry.type"
      >
        {{ entry.type }}
        <span class="sui-num ms-1">({{ entry.count }})</span>
      </v-btn>
    </div>

    <EmptyState
      v-if="filteredOutbounds.length === 0"
      icon="mdi-export-variant"
      :title="$t('ui.noItems')"
      :description="$t('ui.noItemsHint')"
      :action-text="outbounds.length === 0 ? $t('actions.add') : undefined"
      @action="showModal(0)"
    />

    <v-row v-else>
      <v-col
        v-for="item in filteredOutbounds"
        :key="item.tag"
        cols="12"
        sm="6"
        md="6"
        lg="4"
        xl="3"
      >
        <v-card class="sui-resource-card sui-outbound-card d-flex flex-column h-100">
          <div class="sui-card-header">
            <div class="sui-card-header__main">
              <div class="sui-card-tag sui-mono text-truncate" dir="ltr" :title="item.tag">
                {{ item.tag }}
              </div>
              <div class="sui-card-badges">
                <v-chip
                  size="x-small"
                  variant="outlined"
                  :color="protocolColor(item.type)"
                  class="sui-mono"
                >
                  {{ item.type }}
                </v-chip>
                <v-chip
                  v-if="onlines.includes(item.tag)"
                  size="x-small"
                  variant="flat"
                  color="success"
                >
                  {{ $t('online') }}
                </v-chip>
              </div>
            </div>
          </div>

          <v-divider />

          <v-card-text class="sui-card-body flex-grow-1">
            <div class="sui-kv-list">
              <div class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('in.addr') }}</span>
                <span class="sui-kv-value sui-mono" dir="ltr">
                  {{ item.server ?? '-' }}
                </span>
              </div>
              <div class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('in.port') }}</span>
                <span class="sui-kv-value sui-mono sui-num" dir="ltr">
                  {{ item.server_port ?? '-' }}
                </span>
              </div>
              <div v-if="Array.isArray(item.outbounds) && item.outbounds.length > 0" class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('pages.outbounds') }}</span>
                <span class="sui-kv-value sui-num">{{ item.outbounds.length }}</span>
              </div>
              <div class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('objects.tls') }}</span>
                <span class="sui-kv-value">
                  <v-chip
                    v-if="Object.hasOwn(item, 'tls')"
                    size="x-small"
                    :variant="item.tls?.enabled ? 'outlined' : 'tonal'"
                    :color="item.tls?.enabled ? 'primary' : 'secondary'"
                  >
                    {{ $t(item.tls?.enabled ? 'enable' : 'disable') }}
                  </v-chip>
                  <template v-else>-</template>
                </span>
              </div>
              <div class="sui-kv-row sui-kv-row--center">
                <span class="sui-kv-label">{{ $t('out.delay') }}</span>
                <div class="sui-delay-cell">
                  <template v-if="checkResults[item.tag]?.loading === false">
                    <v-chip
                      v-if="checkResults[item.tag].success"
                      size="x-small"
                      variant="outlined"
                      :color="delayColor(checkResults[item.tag].data?.Delay)"
                      class="sui-num"
                    >
                      {{ checkResults[item.tag].data?.Delay }}{{ $t('date.ms') }}
                    </v-chip>
                    <v-tooltip
                      v-else
                      location="top"
                      :text="checkResults[item.tag].errorMessage || $t('failed')"
                    >
                      <template #activator="{ props: tipProps }">
                        <v-chip
                          v-bind="tipProps"
                          size="x-small"
                          variant="outlined"
                          color="error"
                        >
                          {{ $t('failed') }}
                        </v-chip>
                      </template>
                    </v-tooltip>
                  </template>

                  <v-tooltip location="top" :text="$t('actions.test')">
                    <template #activator="{ props: tipProps }">
                      <v-btn
                        v-bind="tipProps"
                        icon="mdi-speedometer"
                        variant="text"
                        size="small"
                        density="comfortable"
                        :loading="Boolean(checkResults[item.tag]?.loading)"
                        :aria-label="$t('actions.test')"
                        @click="checkOutbound(item.tag)"
                      />
                    </template>
                  </v-tooltip>
                </div>
              </div>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="sui-card-footer">
            <v-tooltip location="top" :text="$t('actions.edit')">
              <template #activator="{ props: tipProps }">
                <v-btn
                  v-bind="tipProps"
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  density="comfortable"
                  :aria-label="$t('actions.edit')"
                  @click="showModal(item.id)"
                />
              </template>
            </v-tooltip>

            <v-tooltip location="top" :text="$t('actions.clone')">
              <template #activator="{ props: tipProps }">
                <v-btn
                  v-bind="tipProps"
                  icon="mdi-content-duplicate"
                  variant="text"
                  size="small"
                  density="comfortable"
                  :loading="cloningTag === item.tag"
                  :aria-label="$t('actions.clone')"
                  @click="cloneOutbound(item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip v-if="Data().enableTraffic" location="top" :text="$t('stats.graphTitle')">
              <template #activator="{ props: tipProps }">
                <v-btn
                  v-bind="tipProps"
                  icon="mdi-chart-line"
                  variant="text"
                  size="small"
                  density="comfortable"
                  :aria-label="$t('stats.graphTitle')"
                  @click="showStats(item.tag)"
                />
              </template>
            </v-tooltip>

            <v-spacer />

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
                  @click="promptDelete(item.tag)"
                />
              </template>
            </v-tooltip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
import Data from '@/store/modules/data'
import HttpUtils from '@/plugins/httputil'
import RandomUtil from '@/plugins/randomUtil'
import OutboundVue from '@/layouts/modals/Outbound.vue'
import OutboundBulk from '@/layouts/modals/OutboundBulk.vue'
import Stats from '@/layouts/modals/Stats.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { createOutbound, Outbound } from '@/types/outbounds'
import { computed, ref } from 'vue'

interface CheckResult {
  loading?: boolean
  success: boolean
  data?: { OK?: boolean; Delay?: number; Error?: string } | null
  errorMessage?: string
}

const search = ref('')
const selectedType = ref('all')
const checkResults = ref<Record<string, CheckResult>>({})
const testingAll = ref(false)
const cloningTag = ref<string | null>(null)

const outbounds = computed((): Outbound[] => {
  return <Outbound[]> Data().outbounds ?? []
})

const typeFilters = computed(() => {
  const counts = new Map<string, number>()
  for (const item of outbounds.value) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }))
})

const filteredOutbounds = computed((): Outbound[] => {
  const q = search.value.trim().toLowerCase()
  return outbounds.value.filter((item) => {
    if (selectedType.value !== 'all' && item.type !== selectedType.value) return false
    if (!q) return true
    const haystack = [
      item.tag,
      item.type,
      item.server,
      item.server_port != null ? String(item.server_port) : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

const outboundTags = computed((): string[] => {
  return [
    ...(Data().outbounds ?? []).map((o: Outbound) => o.tag),
    ...(Data().endpoints ?? []).map((e: any) => e.tag),
  ]
})

const onlines = computed((): string[] => {
  return Data().onlines.outbound ?? []
})

const protocolColor = (type: string): string => {
  if (type === 'direct' || type === 'block') return 'secondary'
  if (type === 'selector' || type === 'urltest') return 'info'
  return 'primary'
}

const delayColor = (delay?: number): string => {
  if (delay == null) return 'secondary'
  if (delay < 250) return 'success'
  if (delay < 600) return 'warning'
  return 'error'
}

const checkOutbound = async (tag: string) => {
  checkResults.value = { ...checkResults.value, [tag]: { loading: true, success: false } }
  const msg = await HttpUtils.get('api/checkOutbound', { tag })
  const success = Boolean(msg.success && msg.obj?.OK)
  const errorMessage = success ? undefined : (msg.obj?.Error ?? msg.msg ?? '')
  checkResults.value = {
    ...checkResults.value,
    [tag]: { loading: false, success, data: msg.obj ?? null, errorMessage },
  }
}

const checkAllOutbounds = async () => {
  const list = filteredOutbounds.value.length > 0 ? filteredOutbounds.value : outbounds.value
  if (list.length === 0) return
  testingAll.value = true
  try {
    await Promise.all(list.map((o) => checkOutbound(o.tag)))
  } finally {
    testingAll.value = false
  }
}

const modal = ref({
  visible: false,
  id: 0,
  data: '',
})

const showModal = (id: number) => {
  modal.value.id = id
  modal.value.data = id === 0 ? '' : JSON.stringify(outbounds.value.findLast((o) => o.id === id))
  modal.value.visible = true
}

const closeModal = () => {
  modal.value.visible = false
}

const bulkModal = ref({ visible: false })

const showBulkModal = () => {
  bulkModal.value.visible = true
}

const closeBulkModal = () => {
  bulkModal.value.visible = false
}

const cloneOutbound = async (item: Outbound) => {
  if (cloningTag.value) return
  cloningTag.value = item.tag
  try {
    const existing = new Set(outboundTags.value)
    let newTag = `${item.type}-${RandomUtil.randomSeq(3)}`
    while (existing.has(newTag)) {
      newTag = `${item.type}-${RandomUtil.randomSeq(4)}`
    }
    const copy = JSON.parse(JSON.stringify(item))
    delete copy.id
    const cloned = createOutbound(item.type, { ...copy, id: 0, tag: newTag })
    await Data().save('outbounds', 'new', cloned)
  } finally {
    cloningTag.value = null
  }
}

const deleteDialog = ref({
  visible: false,
  tag: '',
  loading: false,
})

const promptDelete = (tag: string) => {
  deleteDialog.value.tag = tag
  deleteDialog.value.visible = true
}

const confirmDelete = async () => {
  if (!deleteDialog.value.tag || deleteDialog.value.loading) return
  deleteDialog.value.loading = true
  try {
    const success = await Data().save('outbounds', 'del', deleteDialog.value.tag)
    if (success) deleteDialog.value.visible = false
  } finally {
    deleteDialog.value.loading = false
  }
}

const stats = ref({
  visible: false,
  resource: 'outbound',
  tag: '',
})

const showStats = (tag: string) => {
  stats.value.tag = tag
  stats.value.visible = true
}

const closeStats = () => {
  stats.value.visible = false
}
</script>

<style scoped>
.sui-view {
  width: 100%;
}

.sui-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-card-header {
  padding: 14px 16px 12px;
}

.sui-card-header__main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sui-card-tag {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  text-align: start;
}

.sui-card-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.sui-card-body {
  padding: 14px 16px;
}

.sui-kv-row--center {
  align-items: center;
}

.sui-delay-cell {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}

.sui-card-footer {
  padding: 6px 10px;
  min-height: 44px;
  gap: 2px;
}
</style>
