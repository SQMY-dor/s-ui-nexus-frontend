<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <div class="sui-nodes-page">
    <NodeModal :visible="modal.visible" :id="modal.id" @close="modal.visible = false" />
    <NodeInboundsModal
      :visible="inbModal.visible"
      :nodeId="inbModal.id"
      :nodeName="inbModal.name"
      @close="inbModal.visible = false"
    />

    <ConfirmDialog
      v-model="del.visible"
      :title="`${$t('actions.del')} ${del.name}`"
      :confirm-text="$t('actions.del')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="error"
      icon="mdi-server-remove"
      :loading="del.loading"
      @confirm="confirmDelete"
    >
      <p class="mb-2">{{ $t('node.delConfirm', { name: del.name }) }}</p>
      <v-alert v-if="del.replicas > 0" type="warning" variant="outlined" density="compact" class="mb-2">
        {{ $t('node.delReplicas', { count: del.replicas }) }}
      </v-alert>
      <p class="text-body-2 text-medium-emphasis mb-0">{{ $t('node.delRemoteNote') }}</p>
    </ConfirmDialog>

    <PageHeader :title="$t('pages.nodes')" :count="nodes.length">
      <template v-if="nodes.length > 0" #prepend>
        <v-chip size="small" variant="flat" color="success" class="sui-num">
          {{ onlineCount }} {{ $t('node.status.online') }}
        </v-chip>
        <v-chip v-if="dirtyCount > 0" size="small" variant="flat" color="warning" class="sui-num">
          <v-icon icon="mdi-sync-alert" size="14" start />
          {{ dirtyCount }} {{ $t('node.syncDirty') }}
        </v-chip>
      </template>
      <template #actions>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="refreshing"
          @click="refreshNodes"
        >
          {{ $t('node.refresh') }}
        </v-btn>
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
      v-if="nodes.length === 0"
      icon="mdi-server-network-off"
      :title="$t('node.emptyTitle')"
      :description="$t('node.emptyDesc')"
      :action-text="$t('actions.add')"
      @action="showModal(0)"
    />

    <v-row v-else>
      <v-col
        v-for="item in nodes"
        :key="item.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card class="sui-resource-card sui-node-card d-flex flex-column fill-height">
          <div class="sui-node-card__head">
            <div class="sui-node-card__title-wrap">
              <div class="d-flex align-center ga-2 min-width-0">
                <span
                  class="sui-status-dot"
                  :class="`sui-status-dot--${nodeStateColor(stateOf(item))}`"
                  aria-hidden="true"
                />
                <span class="text-subtitle-1 font-weight-semibold text-truncate">
                  {{ item.name }}
                </span>
              </div>
              <div class="sui-mono text-caption text-medium-emphasis text-truncate mt-1" dir="ltr">
                {{ displayBaseUrl(item.baseUrl) }}
              </div>
            </div>
            <div class="d-flex flex-column align-end ga-1 flex-shrink-0">
              <v-chip
                size="small"
                variant="flat"
                :color="nodeStateColor(stateOf(item))"
              >
                {{ $t(nodeStateKey(stateOf(item))) }}
              </v-chip>
              <v-chip
                v-if="item.dirty"
                size="x-small"
                variant="outlined"
                color="warning"
                prepend-icon="mdi-sync-alert"
              >
                {{ $t('node.syncDirty') }}
              </v-chip>
            </div>
          </div>

          <div
            v-if="stateOf(item) === 'online' || stateOf(item) === 'core-stopped'"
            class="sui-node-metrics"
          >
            <div class="sui-node-metric">
              <span class="sui-node-metric__label">{{ $t('node.latency') }}</span>
              <span class="sui-node-metric__value sui-num" dir="ltr">
                {{ statusOf(item)?.latency ?? '-' }} <span class="text-caption text-medium-emphasis">{{ $t('date.ms') }}</span>
              </span>
            </div>
            <div class="sui-node-metric">
              <span class="sui-node-metric__label">{{ $t('main.info.cpu') }}</span>
              <span class="sui-node-metric__value sui-num" dir="ltr">
                {{ cpuPercent(statusOf(item)?.cpu) }}%
              </span>
            </div>
            <div class="sui-node-metric">
              <span class="sui-node-metric__label">{{ $t('node.mem') }}</span>
              <span class="sui-node-metric__value sui-num" dir="ltr">
                {{ memPercent(statusOf(item)?.mem) }}%
              </span>
            </div>
          </div>

          <v-card-text class="sui-node-card__body flex-grow-1">
            <dl class="sui-kv-list">
              <template v-if="stateOf(item) === 'online' || stateOf(item) === 'core-stopped'">
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('node.panelVersion') }}</dt>
                  <dd class="sui-kv-value sui-mono" dir="ltr">{{ statusOf(item)?.appVersion || '-' }}</dd>
                </div>
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('node.coreVersion') }}</dt>
                  <dd class="sui-kv-value sui-mono" dir="ltr">{{ statusOf(item)?.coreVersion || '-' }}</dd>
                </div>
              </template>
              <template v-else>
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('node.lastOnline') }}</dt>
                  <dd class="sui-kv-value">{{ relTime(statusOf(item)?.lastOnline || item.lastSeen) }}</dd>
                </div>
              </template>

              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('node.inbounds') }}</dt>
                <dd class="sui-kv-value sui-num">
                  <v-chip
                    v-if="replicaTags(item.id).length > 0"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    class="sui-num"
                  >
                    {{ replicaTags(item.id).length }}
                    <v-tooltip activator="parent" dir="ltr" location="bottom">
                      <div v-for="tag in replicaTags(item.id)" :key="tag" class="sui-mono">{{ tag }}</div>
                    </v-tooltip>
                  </v-chip>
                  <span v-else class="text-medium-emphasis">-</span>
                </dd>
              </div>

              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('node.lastSync') }}</dt>
                <dd class="sui-kv-value" :class="item.dirty ? 'text-warning' : ''">
                  {{ relTime(item.lastSync ?? 0) }}
                </dd>
              </div>
            </dl>

            <v-alert
              v-if="stateOf(item) !== 'online' && stateOf(item) !== 'core-stopped' && statusOf(item)?.error"
              type="error"
              variant="outlined"
              density="compact"
              class="mt-3 text-caption sui-node-error"
            >
              {{ statusOf(item)?.error }}
            </v-alert>

            <p v-if="item.desc" class="text-caption text-medium-emphasis mt-3 mb-0 sui-node-desc">
              {{ item.desc }}
            </p>
          </v-card-text>

          <v-divider />

          <v-card-actions class="sui-node-card__actions">
            <v-btn
              variant="outlined"
              color="primary"
              size="small"
              prepend-icon="mdi-import"
              class="px-2"
              @click="showInbounds(item)"
            >
              {{ $t('node.adopt') }}
              <v-tooltip activator="parent" location="top" :text="$t('node.viewInbounds')" />
            </v-btn>
            <v-btn
              variant="outlined"
              :color="item.dirty ? 'warning' : 'secondary'"
              size="small"
              prepend-icon="mdi-sync"
              class="px-2"
              :loading="reconciling === item.id"
              :disabled="!item.enable"
              @click="reconcile(item)"
            >
              {{ $t('node.reconcile') }}
            </v-btn>
            <v-spacer />
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              width="30"
              height="30"
              :aria-label="$t('actions.edit')"
              @click="showModal(item.id)"
            >
              <v-icon icon="mdi-pencil-outline" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('actions.edit')" />
            </v-btn>
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              width="30"
              height="30"
              color="error"
              :aria-label="$t('actions.del')"
              @click="askDelete(item)"
            >
              <v-icon icon="mdi-delete-outline" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('actions.del')" />
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Data from '@/store/modules/data'
import HttpUtils from '@/plugins/httputil'
import { i18n, locale } from '@/locales'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import NodeModal from '@/layouts/modals/Node.vue'
import NodeInboundsModal from '@/layouts/modals/NodeInbounds.vue'
import {
  cpuPercent, displayBaseUrl, memPercent, nodeCardState, nodeStateColor, nodeStateKey, relativeParts,
  type Node, type NodeStatus,
} from '@/plugins/cluster'

const nodes = computed((): Node[] => [...(Data().nodes ?? [])].sort((a, b) => a.id - b.id))

const statusOf = (n: Node): NodeStatus | undefined => Data().nodesStatus?.[String(n.id)] ?? n.status
const stateOf = (n: Node) => nodeCardState(n, statusOf(n))

const onlineCount = computed(() => nodes.value.filter(n => stateOf(n) === 'online').length)
const dirtyCount = computed(() => nodes.value.filter(n => n.dirty).length)

const replicaTags = (nodeId: number): string[] =>
  (Data().inbounds ?? []).filter((i: any) => i.node_id == nodeId).map((i: any) => i.tag)

const now = ref(Math.floor(Date.now() / 1000))
const relTime = (unix: number): string => {
  const parts = relativeParts(unix, now.value)
  if (!parts) return i18n.global.t('node.never')
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(parts.value, parts.unit)
  } catch {
    return new Date(unix * 1000).toLocaleString()
  }
}

const refreshing = ref(false)
const refreshNodes = async () => {
  refreshing.value = true
  try {
    now.value = Math.floor(Date.now() / 1000)
    await Promise.all([Data().loadNodes(), Data().loadData()])
  } finally {
    refreshing.value = false
  }
}

// The heartbeat refreshes every 5 s; the global poll runs every 10 s. Poll a
// little faster while this page is open so the badges feel live.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  Data().loadNodes()
  timer = setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
    Data().loadData()
  }, 5000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

const modal = ref({ visible: false, id: 0 })
const showModal = (id: number) => {
  modal.value.id = id
  modal.value.visible = true
}

const inbModal = ref({ visible: false, id: 0, name: '' })
const showInbounds = (n: Node) => {
  inbModal.value = { visible: true, id: n.id, name: n.name }
}

const reconciling = ref(0)
const reconcile = async (n: Node) => {
  reconciling.value = n.id
  const msg = await HttpUtils.post('api/reconcileNode', { id: n.id }, { timeout: 120000 })
  reconciling.value = 0
  if (msg.success) await Data().loadNodes()
}

const del = ref({ visible: false, id: 0, name: '', replicas: 0, loading: false })
const askDelete = (n: Node) => {
  del.value = { visible: true, id: n.id, name: n.name, replicas: replicaTags(n.id).length, loading: false }
}
const confirmDelete = async () => {
  del.value.loading = true
  const success = await Data().save('nodes', 'del', del.value.id)
  del.value.loading = false
  if (success) del.value.visible = false
}
</script>

<style scoped>
.sui-node-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
}

.sui-node-card__title-wrap {
  min-width: 0;
  flex: 1 1 auto;
}

.min-width-0 {
  min-width: 0;
}

.sui-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sui-status-dot--success {
  background-color: rgb(var(--v-theme-success));
}

.sui-status-dot--warning {
  background-color: rgb(var(--v-theme-warning));
}

.sui-status-dot--error {
  background-color: rgb(var(--v-theme-error));
}

.sui-status-dot--grey {
  background-color: rgb(var(--v-theme-grey));
}

.sui-node-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background-color: var(--sui-hairline);
  border-top: 1px solid var(--sui-hairline);
  border-bottom: 1px solid var(--sui-hairline);
}

.sui-node-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background-color: rgb(var(--v-theme-surface-light));
  min-width: 0;
}

.sui-node-metric__label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sui-node-metric__value {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.sui-node-card__body {
  padding: 12px 16px 14px;
}

.sui-node-error,
.sui-node-desc {
  overflow-wrap: anywhere;
}

.sui-node-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
}
</style>
