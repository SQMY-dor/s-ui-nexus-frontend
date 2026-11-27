<template>
  <div class="sui-access-page">
    <InboundVue
      v-model="modal.visible"
      :visible="modal.visible"
      :id="modal.id"
      :inTags="inTags"
      :tlsConfigs="tlsConfigs"
      @close="closeModal"
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
      :title="deleteDialog.isReplica ? $t('node.unadopt') : $t('ui.deleteTitle')"
      :message="deleteDialog.isReplica ? $t('node.unadoptConfirm') : $t('ui.deleteConfirm')"
      :confirm-text="deleteDialog.isReplica ? $t('node.unadopt') : $t('actions.del')"
      :confirm-color="deleteDialog.isReplica ? 'warning' : 'error'"
      :icon="deleteDialog.isReplica ? 'mdi-link-variant-remove' : 'mdi-delete-alert-outline'"
      :loading="deleteDialog.loading"
      @confirm="confirmDeleteInbound"
    >
      <div v-if="deleteDialog.tag" class="sui-confirm-target mt-3">
        <span class="sui-mono font-weight-semibold" dir="ltr">{{ deleteDialog.tag }}</span>
        <v-chip
          v-if="deleteDialog.nodeLabel"
          size="x-small"
          variant="tonal"
          color="info"
          class="ms-2"
        >
          {{ deleteDialog.nodeLabel }}
        </v-chip>
      </div>
    </ConfirmDialog>
    <ConfirmDialog
      v-model="resetDialog.visible"
      :title="$t('inbound.resetTraffic')"
      :message="$t('confirm')"
      :confirm-text="$t('reset')"
      confirm-color="warning"
      icon="mdi-restore"
      :loading="resetDialog.loading"
      @confirm="confirmResetTraffic"
    >
      <div v-if="resetDialog.tag" class="sui-confirm-target mt-3">
        <span class="sui-mono font-weight-semibold" dir="ltr">{{ resetDialog.tag }}</span>
        <span v-if="resetDialog.usageText" class="sui-num text-caption text-medium-emphasis ms-2" dir="ltr">
          ({{ resetDialog.usageText }})
        </span>
      </div>
    </ConfirmDialog>

    <PageHeader
      :title="$t('pages.inbounds')"
      :count="filteredInbounds.length"
      searchable
      v-model:search="searchQuery"
    >
      <template #prepend>
        <v-select
          v-if="protocolFilterItems.length > 2"
          v-model="protocolFilter"
          :items="protocolFilterItems"
          :label="$t('protocol')"
          bg-color="surface"
          density="compact"
          variant="outlined"
          hide-details
          class="sui-protocol-select"
        />
      </template>

      <template #actions>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="showModal(0)"
        >
          {{ $t('actions.add') }}
        </v-btn>
      </template>
    </PageHeader>

    <EmptyState
      v-if="inbounds.length === 0"
      icon="mdi-import"
      :title="$t('ui.noItems')"
      :description="$t('ui.noItemsHint')"
      :action-text="$t('actions.add')"
      @action="showModal(0)"
    />

    <EmptyState
      v-else-if="filteredInbounds.length === 0"
      icon="mdi-filter-remove-outline"
      :title="$t('noData')"
      :description="$t('ui.noItemsHint')"
      :action-text="$t('reset')"
      @action="clearFilters"
    />

    <v-row v-else>
      <v-col
        v-for="item in filteredInbounds"
        :key="item.id || item.tag"
        cols="12"
        sm="6"
        md="4"
        xl="3"
      >
        <v-card
          class="sui-resource-card sui-inbound-card d-flex flex-column h-100"
          :class="cardStateClass(item)"
        >
          <div class="sui-inbound-card__header">
            <div class="sui-inbound-card__heading">
              <div class="sui-inbound-card__title-row">
                <span
                  class="sui-status-dot"
                  :class="inboundDotClass(item)"
                  aria-hidden="true"
                />
                <span
                  class="sui-inbound-card__tag sui-mono font-weight-semibold text-truncate"
                  dir="ltr"
                  :title="item.tag"
                >
                  {{ item.tag }}
                </span>
              </div>
              <div class="sui-inbound-card__badges mt-2">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="primary"
                  class="sui-mono sui-protocol-chip"
                >
                  {{ item.type }}
                </v-chip>
                <v-chip
                  v-if="onlines.includes(item.tag)"
                  size="small"
                  variant="outlined"
                  color="success"
                >
                  {{ $t('online') }}
                </v-chip>
                <v-chip
                  v-if="!inboundEnabled(item) && inboundDepleted(item)"
                  size="small"
                  variant="outlined"
                  color="error"
                >
                  {{ $t('inbound.depleted') }}
                </v-chip>
                <v-chip
                  v-else-if="!inboundEnabled(item)"
                  size="small"
                  variant="tonal"
                  color="secondary"
                >
                  {{ $t('inbound.off') }}
                </v-chip>
                <v-chip
                  v-if="item.node_id"
                  size="small"
                  variant="tonal"
                  color="info"
                  prepend-icon="mdi-server-network"
                >
                  {{ nodeName(item) }}
                  <v-tooltip activator="parent" location="top" :text="$t('node.replicaHint')" />
                </v-chip>
              </div>
            </div>

            <div v-if="!item.node_id" class="sui-inbound-card__switch">
              <v-switch
                color="primary"
                density="compact"
                hide-details
                :model-value="inboundEnabled(item)"
                :loading="switching[item.id]"
                :disabled="switching[item.id]"
                :aria-label="inboundEnabled(item) ? $t('inbound.switchOff') : $t('inbound.switchOn')"
                @update:model-value="(v: any) => setEnable(item, !!v)"
              >
                <v-tooltip
                  activator="parent"
                  location="top"
                  :text="inboundEnabled(item) ? $t('inbound.switchOff') : $t('inbound.switchOn')"
                />
              </v-switch>
            </div>
          </div>

          <v-card-text class="sui-inbound-card__body flex-grow-1">
            <dl class="sui-kv-list">
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('objects.listen') }}</dt>
                <dd class="sui-kv-value sui-mono" dir="ltr">
                  {{ formatEndpoint(item) }}
                </dd>
              </div>

              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('objects.tls') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip
                    v-if="item.tls_id > 0"
                    size="small"
                    variant="outlined"
                    color="success"
                    prepend-icon="mdi-lock-outline"
                  >
                    {{ tlsConfigName(item.tls_id) || $t('enable') }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">{{ $t('disable') }}</span>
                </dd>
              </div>

              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('pages.clients') }}</dt>
                <dd class="sui-kv-value">
                  <template v-if="item.users">
                    <v-tooltip
                      v-if="item.users.length > 0"
                      location="top"
                    >
                      <template #activator="{ props: tipProps }">
                        <v-chip
                          v-bind="tipProps"
                          size="small"
                          variant="tonal"
                          color="secondary"
                          class="sui-num"
                        >
                          {{ item.users.length }}
                        </v-chip>
                      </template>
                      <div dir="ltr" class="sui-mono">
                        <div v-for="u in item.users" :key="u">{{ u }}</div>
                      </div>
                    </v-tooltip>
                    <span v-else class="sui-num text-medium-emphasis">0</span>
                  </template>
                  <span v-else class="text-medium-emphasis">—</span>
                </dd>
              </div>
            </dl>

            <div v-if="showTrafficBlock(item)" class="sui-inbound-traffic mt-3">
              <div class="sui-inbound-traffic__head">
                <span class="text-caption text-medium-emphasis">{{ $t('inbound.traffic') }}</span>
                <span class="text-caption sui-num font-weight-medium" dir="ltr">
                  {{ formatInboundUsed(item) }}
                  <template v-if="(item.volume ?? 0) > 0">
                    / {{ HumanReadable.sizeFormat(item.volume ?? 0) }}
                  </template>
                </span>
              </div>
              <v-progress-linear
                v-if="(item.volume ?? 0) > 0"
                :model-value="inboundUsagePercent(item)"
                :color="inboundBarColor(item)"
                rounded
                height="5"
                class="my-1"
              />
              <div class="sui-traffic-split text-caption sui-num mt-1" dir="ltr">
                <span class="text-upload">↑ {{ formatBytes(item.up) }}</span>
                <span class="text-download">↓ {{ formatBytes(item.down) }}</span>
              </div>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="sui-card-actions">
            <v-btn
              v-if="!item.node_id"
              icon
              variant="text"
              size="small"
              density="comfortable"
              :aria-label="$t('actions.edit')"
              @click="showModal(item.id)"
            >
              <v-icon icon="mdi-pencil-outline" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('actions.edit')" />
            </v-btn>
            <span v-else class="d-inline-flex">
              <v-btn
                icon
                variant="text"
                size="small"
                density="comfortable"
                disabled
                :aria-label="$t('node.manageOnNode')"
              >
                <v-icon icon="mdi-lock-outline" size="18" />
              </v-btn>
              <v-tooltip activator="parent" location="top" :text="$t('node.manageOnNode')" />
            </span>

            <v-btn
              v-if="Data().enableTraffic && !item.node_id"
              icon
              variant="text"
              size="small"
              density="comfortable"
              :aria-label="$t('stats.graphTitle')"
              @click="showStats(item.tag)"
            >
              <v-icon icon="mdi-chart-line" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('stats.graphTitle')" />
            </v-btn>

            <v-btn
              v-if="!item.node_id && canResetTraffic(item)"
              icon
              variant="text"
              size="small"
              density="comfortable"
              color="warning"
              :loading="resetting[item.id]"
              :aria-label="$t('inbound.resetTraffic')"
              @click="openResetDialog(item)"
            >
              <v-icon icon="mdi-restore" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('inbound.resetTraffic')" />
            </v-btn>

            <v-btn
              v-if="!item.node_id"
              icon
              variant="text"
              size="small"
              density="comfortable"
              :loading="cloningId === item.id"
              :disabled="cloningId !== null && cloningId !== item.id"
              :aria-label="$t('actions.clone')"
              @click="clone(item.id)"
            >
              <v-icon icon="mdi-content-duplicate" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('actions.clone')" />
            </v-btn>

            <v-spacer />

            <v-btn
              icon
              variant="text"
              size="small"
              density="comfortable"
              :color="item.node_id ? 'warning' : 'error'"
              :aria-label="item.node_id ? $t('node.unadopt') : $t('actions.del')"
              @click="openDeleteDialog(item)"
            >
              <v-icon :icon="item.node_id ? 'mdi-link-variant-remove' : 'mdi-delete-outline'" size="18" />
              <v-tooltip
                activator="parent"
                location="top"
                :text="item.node_id ? $t('node.unadopt') : $t('actions.del')"
              />
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Data from '@/store/modules/data'
import InboundVue from '@/layouts/modals/Inbound.vue'
import Stats from '@/layouts/modals/Stats.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { createInbound } from '@/types/inbounds'
import RandomUtil from '@/plugins/randomUtil'
import { replicaNodeName } from '@/plugins/cluster'
import { inboundEnabled, inboundDepleted, inboundUsagePercent } from '@/plugins/inbounds'
import { HumanReadable } from '@/plugins/utils'

const { t } = useI18n()

const nodeName = (inbound: any): string => replicaNodeName(inbound, Data().nodes ?? [])

const inbounds = computed((): any[] => {
  return <any[]>(Data().inbounds ?? [])
})

const tlsConfigs = computed((): any[] => {
  return <any[]>(Data().tlsConfigs ?? [])
})

const tlsNameMap = computed((): Map<number, string> => {
  const map = new Map<number, string>()
  for (const cfg of tlsConfigs.value) {
    if (cfg?.id) map.set(cfg.id, cfg.name)
  }
  return map
})

const tlsConfigName = (tlsId: number): string => {
  return tlsNameMap.value.get(tlsId) ?? ''
}

const inTags = computed((): string[] => {
  return [
    ...inbounds.value.map((i: any) => i.tag),
    ...(Data().endpoints ?? [])
      .filter((e: any) => e.listen_port > 0)
      .map((e: any) => e.tag),
  ]
})

const onlines = computed((): string[] => {
  return Data().onlines?.inbound ?? []
})

const searchQuery = ref('')
const protocolFilter = ref('all')

const protocolFilterItems = computed(() => {
  const types = Array.from(new Set(inbounds.value.map((i: any) => i.type).filter(Boolean))).sort()
  return [
    { title: t('all'), value: 'all' },
    ...types.map((type) => ({ title: String(type), value: String(type) })),
  ]
})

const filteredInbounds = computed((): any[] => {
  let list = inbounds.value
  if (protocolFilter.value !== 'all') {
    list = list.filter((i: any) => i.type === protocolFilter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q.length > 0) {
    list = list.filter((i: any) => {
      const node = nodeName(i).toLowerCase()
      return (
        String(i.tag ?? '').toLowerCase().includes(q) ||
        String(i.type ?? '').toLowerCase().includes(q) ||
        String(i.listen ?? '').toLowerCase().includes(q) ||
        String(i.listen_port ?? '').includes(q) ||
        node.includes(q)
      )
    })
  }
  return list
})

const clearFilters = () => {
  searchQuery.value = ''
  protocolFilter.value = 'all'
}

const modal = ref({
  visible: false,
  id: 0,
})

const showModal = (id: number) => {
  modal.value.id = id
  modal.value.visible = true
}

const closeModal = () => {
  modal.value.visible = false
}

const deleteDialog = ref({
  visible: false,
  tag: '',
  isReplica: false,
  nodeLabel: '',
  loading: false,
})

const openDeleteDialog = (item: any) => {
  deleteDialog.value = {
    visible: true,
    tag: item.tag,
    isReplica: Boolean(item.node_id),
    nodeLabel: item.node_id ? nodeName(item) : '',
    loading: false,
  }
}

const confirmDeleteInbound = async () => {
  if (deleteDialog.value.loading || !deleteDialog.value.tag) return
  deleteDialog.value.loading = true
  try {
    const success = await Data().save('inbounds', 'del', deleteDialog.value.tag)
    if (success) deleteDialog.value.visible = false
  } finally {
    deleteDialog.value.loading = false
  }
}

// The enable switch on a local card: an edit of the full inbound with enable
// flipped, so the backend applies it like any other save (out of the core and
// its links out of the subscriptions when off).
const switching = ref(<Record<number, boolean>>{})
const setEnable = async (item: any, enable: boolean) => {
  if (item.node_id || switching.value[item.id]) return
  switching.value[item.id] = true
  try {
    const inboundArray = await Data().loadInbounds([item.id])
    const inbound = inboundArray?.[0]
    if (!inbound) return
    await Data().save('inbounds', 'edit', { ...inbound, enable })
  } finally {
    switching.value[item.id] = false
  }
}

const resetting = ref(<Record<number, boolean>>{})
const resetDialog = ref({
  visible: false,
  id: 0,
  tag: '',
  usageText: '',
  loading: false,
})

const canResetTraffic = (item: any): boolean => {
  return (item.up ?? 0) + (item.down ?? 0) > 0 || inboundDepleted(item)
}

const openResetDialog = (item: any) => {
  const used = Number(item.up ?? 0) + Number(item.down ?? 0)
  const limit = Number(item.volume ?? 0)
  resetDialog.value = {
    visible: true,
    id: item.id,
    tag: item.tag,
    usageText:
      limit > 0
        ? `${formatBytes(used)} / ${HumanReadable.sizeFormat(limit)}`
        : formatBytes(used),
    loading: false,
  }
}

const confirmResetTraffic = async () => {
  if (resetDialog.value.loading || !resetDialog.value.tag) return
  const { id, tag } = resetDialog.value
  resetDialog.value.loading = true
  resetting.value[id] = true
  try {
    const success = await Data().save('inbounds', 'resetTraffic', tag)
    if (success) resetDialog.value.visible = false
  } finally {
    resetDialog.value.loading = false
    resetting.value[id] = false
  }
}

const cloningId = ref<number | null>(null)

const clone = async (id: number) => {
  if (cloningId.value !== null) return
  cloningId.value = id
  try {
    const inboundArray = await Data().loadInbounds([id])
    const inbound = inboundArray?.[0]
    if (!inbound) return
    const newTag = inbound.type + '-' + RandomUtil.randomSeq(3)
    // A clone starts enabled and with its own (zero) traffic counters.
    const newInbound = createInbound(inbound.type, {
      ...inbound,
      id: 0,
      enable: true,
      up: 0,
      down: 0,
      tag: newTag,
      listen_port: RandomUtil.randomIntRange(10000, 60000),
    })
    await Data().save('inbounds', 'new', newInbound)
  } finally {
    cloningId.value = null
  }
}

const stats = ref({
  visible: false,
  resource: 'inbound',
  tag: '',
})

const showStats = (tag: string) => {
  stats.value.tag = tag
  stats.value.visible = true
}

const closeStats = () => {
  stats.value.visible = false
}

const formatEndpoint = (item: any): string => {
  const listen = item.listen ? String(item.listen) : ''
  const port = Number(item.listen_port ?? 0)
  if (!listen && !port) return '—'
  if (!port) return listen
  if (!listen) return `:${port}`
  const host = listen.includes(':') && !listen.startsWith('[') ? `[${listen}]` : listen
  return `${host}:${port}`
}

const formatBytes = (value: number | undefined): string => {
  const n = Number(value ?? 0)
  return n > 0 ? HumanReadable.sizeFormat(n) : '0 ' + t('stats.B')
}

const formatInboundUsed = (item: any): string => {
  return formatBytes(Number(item.up ?? 0) + Number(item.down ?? 0))
}

const showTrafficBlock = (item: any): boolean => {
  if (item.node_id) return false
  return Number(item.volume ?? 0) > 0 || Number(item.up ?? 0) + Number(item.down ?? 0) > 0
}

const inboundBarColor = (item: any): string => {
  if (inboundDepleted(item)) return 'error'
  if (inboundUsagePercent(item) > 85) return 'warning'
  return 'primary'
}

const inboundDotClass = (item: any): string => {
  if (!inboundEnabled(item)) {
    return inboundDepleted(item) ? 'sui-status-dot--error' : 'sui-status-dot--idle'
  }
  if (onlines.value.includes(item.tag)) return 'sui-status-dot--online'
  return 'sui-status-dot--active'
}

const cardStateClass = (item: any): Record<string, boolean> => ({
  'inbound-off': !inboundEnabled(item),
  'inbound-depleted': !inboundEnabled(item) && inboundDepleted(item),
})
</script>

<style scoped>
.sui-access-page {
  width: 100%;
}

.sui-protocol-select {
  width: 168px;
  max-width: 100%;
}

.inbound-off {
  border-style: dashed;
}

.inbound-depleted {
  border-style: dashed;
  border-color: rgba(var(--v-theme-error), 0.65);
}

.sui-inbound-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
}

.sui-inbound-card__heading {
  min-width: 0;
  flex: 1 1 auto;
}

.sui-inbound-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sui-inbound-card__tag {
  font-size: 0.9375rem;
  line-height: 1.35;
}

.sui-inbound-card__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.sui-protocol-chip {
  text-transform: uppercase;
  font-size: 0.6875rem;
  letter-spacing: 0.03em;
}

.sui-inbound-card__switch {
  flex-shrink: 0;
  margin-top: -4px;
}

.sui-inbound-card__body {
  padding: 6px 16px 14px;
}

.sui-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sui-status-dot--online {
  background-color: rgb(var(--v-theme-success));
}

.sui-status-dot--active {
  background-color: rgb(var(--v-theme-primary));
}

.sui-status-dot--error {
  background-color: rgb(var(--v-theme-error));
}

.sui-status-dot--idle {
  background-color: rgb(var(--v-theme-outline));
}

.sui-inbound-traffic {
  padding-top: 10px;
  border-top: 1px solid var(--sui-hairline);
}

.sui-inbound-traffic__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.sui-traffic-split {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sui-card-actions {
  padding: 6px 10px;
  gap: 2px;
}

.sui-confirm-target {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 6px 10px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background: rgb(var(--v-theme-surface-light));
}

@media (max-width: 599.98px) {
  .sui-protocol-select {
    width: 100%;
  }
}
</style>
