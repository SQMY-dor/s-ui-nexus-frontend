<template>
  <div class="sui-config-view">
    <DnsVue
      v-model="dnsModal.visible"
      :visible="dnsModal.visible"
      :index="dnsModal.index"
      :data="dnsModal.data"
      :tsTags="tsTags"
      :rslvdTags="rslvdTags"
      @close="closeDnsModal"
      @save="saveDnsModal"
    />
    <DnsRuleVue
      v-model="dnsRuleModal.visible"
      :visible="dnsRuleModal.visible"
      :index="dnsRuleModal.index"
      :data="dnsRuleModal.data"
      :clients="clients"
      :inTags="inboundTags"
      :serverTags="dnsServerTags"
      :ruleSets="ruleSets"
      @close="closeDnsRuleModal"
      @save="saveDnsRuleModal"
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
          @click="showDnsModal(-1)"
        >
          {{ $t('dns.add') }}
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-filter-plus-outline"
          @click="showDnsRuleModal(-1)"
        >
          {{ $t('dns.rule.add') }}
        </v-btn>
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

    <!-- DNS General Settings -->
    <v-card class="mb-4">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <span>{{ $t('pages.basics') }}</span>
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="finalDns"
              hide-details
              :label="$t('dns.final')"
              :items="[{ title: $t('dns.firstServer'), value: '' }, ...dnsServerTags]"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="dns.strategy"
              hide-details
              :label="$t('dns.domainStrategy')"
              clearable
              :items="['prefer_ipv4', 'prefer_ipv6', 'ipv4_only', 'ipv6_only']"
              @click:clear="delete dns.strategy"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="dns.client_subnet"
              hide-details
              clearable
              dir="ltr"
              class="sui-mono-input"
              :label="$t('dns.rule.action.clientSubnet')"
              @click:clear="delete dns.client_subnet"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="dns.cache_capacity"
              type="number"
              min="1024"
              hide-details
              clearable
              class="sui-num"
              :label="$t('dns.cacheCapacity')"
              @click:clear="delete dns.cache_capacity"
            />
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="dns.disable_cache"
              color="primary"
              hide-details
              :label="$t('dns.disableCache')"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="dns.disable_expire"
              color="primary"
              hide-details
              :label="$t('dns.disableExpire')"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="dns.independent_cache"
              color="primary"
              hide-details
              :label="$t('dns.independentCache')"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="dns.reverse_mapping"
              color="primary"
              hide-details
              :label="$t('dns.reverseMapping')"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- DNS Servers Table -->
    <v-card class="mb-4">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <div class="d-flex align-center ga-2">
            <span>{{ $t('dns.title') }}</span>
            <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num">
              {{ dnsServers.length }}
            </v-chip>
          </div>
        </div>

        <EmptyState
          v-if="dnsServers.length === 0"
          icon="mdi-dns-outline"
          :title="$t('ui.noItems')"
          :description="$t('ui.noItemsHint')"
          :action-text="$t('dns.add')"
          @action="showDnsModal(-1)"
        />

        <div v-else class="sui-table-wrap">
          <v-table density="comfortable" hover class="sui-rules-table">
            <thead>
              <tr>
                <th>{{ $t('objects.tag') }}</th>
                <th>{{ $t('type') }}</th>
                <th>{{ $t('dns.server') }}</th>
                <th>{{ $t('in.port') }}</th>
                <th>{{ $t('objects.tls') }}</th>
                <th class="text-end">{{ $t('actions.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in dnsServers" :key="item.tag || item.id || index">
                <td>
                  <div class="d-flex flex-wrap align-center ga-2">
                    <span class="sui-mono font-weight-medium" dir="ltr">{{ item.tag || '-' }}</span>
                    <v-chip
                      v-if="item.tag && item.tag === dns.final"
                      size="x-small"
                      variant="outlined"
                      color="primary"
                    >
                      {{ $t('dns.final') }}
                    </v-chip>
                  </div>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    :color="dnsTypeColor(item.type)"
                    class="sui-mono"
                  >
                    {{ item.type }}
                  </v-chip>
                </td>
                <td>
                  <span class="sui-mono" dir="ltr">{{ formatDnsServerAddress(item) }}</span>
                </td>
                <td>
                  <span class="sui-mono sui-num" dir="ltr">{{ item.server_port ?? '-' }}</span>
                </td>
                <td>
                  <v-chip
                    v-if="Object.hasOwn(item, 'tls')"
                    size="x-small"
                    :variant="item.tls?.enabled ? 'outlined' : 'tonal'"
                    :color="item.tls?.enabled ? 'primary' : 'secondary'"
                  >
                    {{ $t(item.tls?.enabled ? 'enable' : 'disable') }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">-</span>
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
                          @click="showDnsModal(index)"
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
                          @click="promptDeleteServer(index, item.tag)"
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

    <!-- DNS Rules Table -->
    <v-card>
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <div class="d-flex align-center ga-2">
            <span>{{ $t('dns.rule.title') }}</span>
            <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num">
              {{ dnsRules.length }}
            </v-chip>
          </div>
          <span v-if="dnsRules.length > 1" class="sui-drag-hint text-caption text-medium-emphasis">
            <v-icon icon="mdi-drag-vertical" size="14" class="me-1" />
            {{ $t('ui.dragToReorder') }}
          </span>
        </div>

        <EmptyState
          v-if="dnsRules.length === 0"
          icon="mdi-filter-variant"
          :title="$t('ui.noItems')"
          :description="$t('ui.noItemsHint')"
          :action-text="$t('dns.rule.add')"
          @action="showDnsRuleModal(-1)"
        />

        <div v-else class="sui-table-wrap">
          <v-table density="comfortable" hover class="sui-rules-table">
            <thead>
              <tr>
                <th class="sui-col-order">#</th>
                <th class="sui-col-type">{{ $t('type') }}</th>
                <th class="sui-col-matchers">{{ $t('pages.rules') }}</th>
                <th class="sui-col-action-chip">{{ $t('admin.action') }}</th>
                <th class="sui-col-target">{{ $t('dns.server') }}</th>
                <th class="sui-col-actions text-end">{{ $t('actions.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in dnsRules"
                :key="dnsRuleRowKey(item, index)"
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
                    <template v-if="summarizeDnsRuleMatchers(item).length > 0">
                      <v-chip
                        v-for="(token, tIdx) in summarizeDnsRuleMatchers(item).slice(0, 3)"
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
                        v-if="summarizeDnsRuleMatchers(item).length > 3"
                        location="top"
                        :text="summarizeDnsRuleMatchers(item).slice(3).join(' · ')"
                      >
                        <template #activator="{ props: tipProps }">
                          <v-chip
                            v-bind="tipProps"
                            size="x-small"
                            variant="outlined"
                            color="secondary"
                            class="sui-num"
                          >
                            +{{ summarizeDnsRuleMatchers(item).length - 3 }}
                          </v-chip>
                        </template>
                      </v-tooltip>
                    </template>
                    <span v-else class="text-medium-emphasis sui-num">
                      {{ dnsRuleMatcherCount(item) }}
                    </span>
                  </div>
                </td>

                <td class="sui-col-action-chip">
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    :color="dnsActionColor(item.action)"
                    class="sui-mono"
                  >
                    {{ item.action || 'route' }}
                  </v-chip>
                </td>

                <td class="sui-col-target">
                  <v-chip
                    v-if="item.server"
                    size="x-small"
                    variant="outlined"
                    color="primary"
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
                      @click="moveDnsRule(index, index - 1)"
                    />
                    <v-btn
                      icon="mdi-arrow-down"
                      variant="text"
                      size="small"
                      density="comfortable"
                      :disabled="index === dnsRules.length - 1"
                      :aria-label="$t('ui.dragToReorder')"
                      @click="moveDnsRule(index, index + 1)"
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
                          @click="showDnsRuleModal(index)"
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
  </div>
</template>

<script lang="ts" setup>
import Data from '@/store/modules/data'
import { computed, ref, watch, onBeforeMount } from 'vue'
import DnsVue from '@/layouts/modals/Dns.vue'
import DnsRuleVue from '@/layouts/modals/DnsRule.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { Config } from '@/types/config'
import { actionDnsRuleKeys, dnsRule } from '@/types/dns'
import { FindDiff } from '@/plugins/utils'

const oldConfig = ref<Record<string, any>>({})
const loading = ref(false)

const appConfig = computed((): Config => {
  return <Config> Data().config
})

const ensureDnsStructure = () => {
  const cfg = appConfig.value as any
  if (!cfg || typeof cfg !== 'object') return
  if (!cfg.dns) cfg.dns = { servers: [], rules: [] }
  if (!Array.isArray(cfg.dns.servers)) cfg.dns.servers = []
  if (!Array.isArray(cfg.dns.rules)) cfg.dns.rules = []
}

watch(
  () => Data().lastLoad,
  () => {
    ensureDnsStructure()
  },
  { immediate: true },
)

onBeforeMount(async () => {
  ensureDnsStructure()

  loading.value = true
  while (Data().lastLoad === 0) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  ensureDnsStructure()
  oldConfig.value = JSON.parse(JSON.stringify(Data().config))
  loading.value = false
})

const tsTags = computed((): string[] => {
  return (Data().endpoints ?? []).filter((e: any) => e.type === 'tailscale').map((e: any) => e.tag)
})

const rslvdTags = computed((): string[] => {
  return (Data().services ?? []).filter((e: any) => e.type === 'resolved').map((e: any) => e.tag)
})

const clients = computed((): string[] => {
  return (Data().clients ?? []).map((c: any) => c.name)
})

const stateChange = computed(() => {
  return FindDiff.deepCompare(appConfig.value.dns, oldConfig.value.dns)
})

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

const inboundTags = computed((): string[] => {
  return [
    ...(Data().inbounds ?? []).map((o: any) => o.tag),
    ...(Data().endpoints ?? []).filter((e: any) => e.listen_port > 0).map((e: any) => e.tag),
  ]
})

const dns = computed((): any => {
  return appConfig.value?.dns ?? { servers: [], rules: [] }
})

const dnsServers = computed((): any[] => {
  return Array.isArray(dns.value?.servers) ? dns.value.servers : []
})

const dnsServerTags = computed((): string[] => {
  return dnsServers.value.filter((s: any) => s.tag && s.tag !== '').map((s: any) => s.tag)
})

const finalDns = computed({
  get() {
    return dns.value?.final ?? ''
  },
  set(v: string) {
    ensureDnsStructure()
    appConfig.value.dns.final = v.length > 0 ? v : undefined
  },
})

const dnsRules = computed((): any[] => {
  return Array.isArray(dns.value?.rules) ? dns.value.rules : []
})

const ruleSets = computed((): string[] => {
  return appConfig.value?.route?.rule_set?.map((r: any) => r.tag) ?? []
})

const formatDnsServerAddress = (item: any): string => {
  if (item.server) return item.server
  if (item.inet4_range || item.inet6_range) {
    return [item.inet4_range, item.inet6_range].filter(Boolean).join(', ')
  }
  if (Array.isArray(item.path) && item.path.length > 0) return item.path.join(', ')
  if (item.endpoint) return item.endpoint
  if (item.service) return item.service
  return '-'
}

const dnsTypeColor = (type?: string): string => {
  if (type === 'https' || type === 'h3' || type === 'tls' || type === 'quic') return 'primary'
  if (type === 'udp' || type === 'tcp') return 'info'
  return 'secondary'
}

const dnsActionColor = (action?: string): string => {
  if (action === 'reject') return 'error'
  if (action === 'predefined') return 'info'
  if (action === 'route-options') return 'warning'
  return 'primary'
}

const dnsRuleRowKey = (item: any, index: number): string => {
  return item?.id != null ? String(item.id) : `dns-rule-${index}`
}

const formatMatcherValue = (key: string, val: unknown): string => {
  if (Array.isArray(val)) {
    const preview = val.slice(0, 2).join(', ')
    return val.length > 2 ? `${key}: ${preview} (+${val.length - 2})` : `${key}: ${preview}`
  }
  if (typeof val === 'boolean') return val ? key : `!${key}`
  return `${key}: ${String(val)}`
}

const summarizeDnsRuleMatchers = (item: any): string[] => {
  if (!item || typeof item !== 'object') return []
  if (Array.isArray(item.rules)) {
    const tokens: string[] = []
    for (const sub of item.rules) {
      if (!sub || typeof sub !== 'object') continue
      for (const [k, v] of Object.entries(sub)) {
        if (actionDnsRuleKeys.includes(k) || k === 'id' || v === undefined || v === null || v === false) continue
        if (Array.isArray(v) && v.length === 0) continue
        tokens.push(formatMatcherValue(k, v))
      }
    }
    return tokens
  }
  const tokens: string[] = []
  for (const [k, v] of Object.entries(item)) {
    if (actionDnsRuleKeys.includes(k) || k === 'id' || k === 'type' || k === 'mode' || v === undefined || v === null || v === false) continue
    if (Array.isArray(v) && v.length === 0) continue
    tokens.push(formatMatcherValue(k, v))
  }
  return tokens
}

const dnsRuleMatcherCount = (item: any): number => {
  if (Array.isArray(item?.rules)) return item.rules.length
  return Object.keys(item ?? {}).filter((r) => !actionDnsRuleKeys.includes(r) && r !== 'id').length
}

const dnsModal = ref({
  visible: false,
  index: -1,
  data: '',
})

const showDnsModal = (index: number) => {
  dnsModal.value.index = index
  dnsModal.value.data = index === -1 ? '' : JSON.stringify(dnsServers.value[index])
  dnsModal.value.visible = true
}

const closeDnsModal = () => {
  dnsModal.value.visible = false
}

const saveDnsModal = (data: any) => {
  ensureDnsStructure()
  if (dnsModal.value.index === -1) {
    appConfig.value.dns.servers.push(data)
  } else {
    appConfig.value.dns.servers[dnsModal.value.index] = data
  }
  dnsModal.value.visible = false
}

const dnsRuleModal = ref({
  visible: false,
  index: -1,
  data: '',
})

const showDnsRuleModal = (index: number) => {
  dnsRuleModal.value.index = index
  dnsRuleModal.value.data = index === -1 ? '' : JSON.stringify(dnsRules.value[index])
  dnsRuleModal.value.visible = true
}

const closeDnsRuleModal = () => {
  dnsRuleModal.value.visible = false
}

const saveDnsRuleModal = (data: dnsRule) => {
  ensureDnsStructure()
  if (dnsRuleModal.value.index === -1) {
    appConfig.value.dns.rules.push(data)
  } else {
    appConfig.value.dns.rules[dnsRuleModal.value.index] = data
  }
  dnsRuleModal.value.visible = false
}

const deleteDialog = ref<{
  visible: boolean
  kind: 'server' | 'rule'
  index: number
  label: string
}>({
  visible: false,
  kind: 'server',
  index: -1,
  label: '',
})

const promptDeleteServer = (index: number, tag?: string) => {
  deleteDialog.value = {
    visible: true,
    kind: 'server',
    index,
    label: tag || `#${index + 1}`,
  }
}

const promptDeleteRule = (index: number) => {
  const item = dnsRules.value[index]
  deleteDialog.value = {
    visible: true,
    kind: 'rule',
    index,
    label: `#${index + 1} · ${item?.action || 'route'}${item?.server ? ` → ${item.server}` : ''}`,
  }
}

const confirmDelete = () => {
  ensureDnsStructure()
  const { kind, index } = deleteDialog.value
  if (index >= 0) {
    if (kind === 'server') appConfig.value.dns.servers.splice(index, 1)
    else appConfig.value.dns.rules.splice(index, 1)
  }
  deleteDialog.value.visible = false
}

const moveDnsRule = (fromIndex: number, toIndex: number) => {
  ensureDnsStructure()
  const list = appConfig.value.dns.rules
  if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return
  const [moved] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, moved)
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
    moveDnsRule(draggedItemIndex.value, index)
  }
  draggedItemIndex.value = null
  dragOverIndex.value = null
}
const onDragEnd = () => {
  draggedItemIndex.value = null
  dragOverIndex.value = null
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

:deep(.sui-mono-input input) {
  font-family: var(--sui-font-mono);
  font-size: 0.875rem;
}
</style>
