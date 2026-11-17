<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <NodeModal :visible="modal.visible" :id="modal.id" @close="modal.visible = false" />
  <NodeInboundsModal :visible="inbModal.visible" :nodeId="inbModal.id" :nodeName="inbModal.name" @close="inbModal.visible = false" />
  <v-dialog v-model="del.visible" width="460">
    <v-card class="rounded-lg">
      <v-card-title>{{ $t('actions.del') }} {{ del.name }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <p>{{ $t('node.delConfirm', { name: del.name }) }}</p>
        <p class="mt-2 text-warning" v-if="del.replicas > 0">{{ $t('node.delReplicas', { count: del.replicas }) }}</p>
        <p class="mt-2 text-medium-emphasis">{{ $t('node.delRemoteNote') }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="success" variant="outlined" @click="del.visible = false">{{ $t('no') }}</v-btn>
        <v-btn color="error" variant="tonal" :loading="del.loading" @click="confirmDelete">{{ $t('yes') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-row>
    <v-col cols="12" justify="center" align="center">
      <v-btn color="primary" @click="showModal(0)">{{ $t('actions.add') }}</v-btn>
    </v-col>
  </v-row>
  <v-row v-if="nodes.length === 0">
    <v-col cols="12" class="text-center text-medium-emphasis">
      <v-icon icon="mdi-server-network-off" size="48" class="mb-2" /><br />
      <div class="text-subtitle-1">{{ $t('node.emptyTitle') }}</div>
      <div>{{ $t('node.emptyDesc') }}</div>
    </v-col>
  </v-row>
  <v-row>
    <v-col cols="12" sm="6" md="4" lg="3" v-for="item in nodes" :key="item.id">
      <v-card rounded="xl" elevation="5" min-width="220" :title="item.name">
        <v-card-subtitle style="margin-top: -15px;">
          <span dir="ltr">{{ displayBaseUrl(item.baseUrl) }}</span>
        </v-card-subtitle>
        <v-card-text>
          <v-row>
            <v-col>{{ $t('node.state') }}</v-col>
            <v-col>
              <v-chip density="comfortable" size="small" variant="flat" :color="nodeStateColor(stateOf(item))">{{ $t(nodeStateKey(stateOf(item))) }}</v-chip>
              <v-chip v-if="item.dirty" density="comfortable" size="small" variant="tonal" color="warning" class="ms-1">{{ $t('node.syncDirty') }}</v-chip>
            </v-col>
          </v-row>
          <template v-if="stateOf(item) === 'online' || stateOf(item) === 'core-stopped'">
            <v-row>
              <v-col>{{ $t('node.latency') }}</v-col>
              <v-col dir="ltr">{{ statusOf(item)?.latency }} {{ $t('date.ms') }}</v-col>
            </v-row>
            <v-row>
              <v-col>CPU / {{ $t('node.mem') }}</v-col>
              <v-col dir="ltr">{{ cpuPercent(statusOf(item)?.cpu) }}% / {{ memPercent(statusOf(item)?.mem) }}%</v-col>
            </v-row>
            <v-row>
              <v-col>{{ $t('node.panelVersion') }}</v-col>
              <v-col dir="ltr">{{ statusOf(item)?.appVersion || '-' }}</v-col>
            </v-row>
            <v-row>
              <v-col>{{ $t('node.coreVersion') }}</v-col>
              <v-col dir="ltr">{{ statusOf(item)?.coreVersion || '-' }}</v-col>
            </v-row>
          </template>
          <template v-else>
            <v-row>
              <v-col>{{ $t('node.lastOnline') }}</v-col>
              <v-col>{{ relTime(statusOf(item)?.lastOnline || item.lastSeen) }}</v-col>
            </v-row>
            <v-row v-if="statusOf(item)?.error">
              <v-col cols="12" class="text-error text-caption" style="word-break: break-word;">
                {{ statusOf(item)?.error }}
              </v-col>
            </v-row>
          </template>
          <v-row>
            <v-col>{{ $t('pages.inbounds') }}</v-col>
            <v-col>
              <template v-if="replicaTags(item.id).length > 0">
                <v-tooltip activator="parent" dir="ltr" location="bottom">
                  <span v-for="t in replicaTags(item.id)" :key="t">{{ t }}<br /></span>
                </v-tooltip>
                {{ replicaTags(item.id).length }}
              </template>
              <template v-else>-</template>
            </v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('node.lastSync') }}</v-col>
            <v-col :class="item.dirty ? 'text-warning' : ''">{{ relTime(item.lastSync ?? 0) }}</v-col>
          </v-row>
          <v-row v-if="item.desc">
            <v-col cols="12" class="text-medium-emphasis text-caption">{{ item.desc }}</v-col>
          </v-row>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions style="padding: 0;">
          <v-btn icon="mdi-file-edit" @click="showModal(item.id)">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('actions.edit')"></v-tooltip>
          </v-btn>
          <v-btn icon="mdi-import" style="margin-inline-start:0;" @click="showInbounds(item)">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('node.viewInbounds')"></v-tooltip>
          </v-btn>
          <v-btn icon="mdi-sync" style="margin-inline-start:0;" :loading="reconciling === item.id" :disabled="!item.enable" @click="reconcile(item)">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('node.reconcile')"></v-tooltip>
          </v-btn>
          <v-btn icon="mdi-file-remove" style="margin-inline-start:0;" color="warning" @click="askDelete(item)">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('actions.del')"></v-tooltip>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Data from '@/store/modules/data'
import HttpUtils from '@/plugins/httputil'
import { i18n, locale } from '@/locales'
import NodeModal from '@/layouts/modals/Node.vue'
import NodeInboundsModal from '@/layouts/modals/NodeInbounds.vue'
import {
  cpuPercent, displayBaseUrl, memPercent, nodeCardState, nodeStateColor, nodeStateKey, relativeParts,
  type Node, type NodeStatus,
} from '@/plugins/cluster'

const nodes = computed((): Node[] => [...(Data().nodes ?? [])].sort((a, b) => a.id - b.id))

const statusOf = (n: Node): NodeStatus | undefined => Data().nodesStatus?.[String(n.id)] ?? n.status
const stateOf = (n: Node) => nodeCardState(n, statusOf(n))

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
