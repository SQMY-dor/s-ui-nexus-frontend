<template>
  <div class="sui-view">
    <EndpointVue
      v-model="modal.visible"
      :visible="modal.visible"
      :id="modal.id"
      :data="modal.data"
      :initial-type="modal.type"
      :tags="endpointTags"
      @close="closeModal"
    />
    <Stats
      v-model="stats.visible"
      :visible="stats.visible"
      :resource="stats.resource"
      :tag="stats.tag"
      @close="closeStats"
    />
    <QrCode
      v-model="qrcode.visible"
      :visible="qrcode.visible"
      :data="qrcode.data"
      @close="closeQrCode"
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
      :title="$t('pages.endpoints')"
      :count="filteredEndpoints.length"
      searchable
    >
      <template #actions>
        <div class="sui-split-add">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-plus"
            @click="showModal(0, defaultAddType)"
          >
            {{ $t('actions.add') }}
          </v-btn>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                color="primary"
                variant="outlined"
                icon="mdi-chevron-down"
                size="small"
                density="comfortable"
                :aria-label="$t('type')"
              />
            </template>
            <v-list density="compact" nav min-width="200">
              <v-list-item
                prepend-icon="mdi-vpn"
                title="WireGuard"
                rounded="md"
                @click="showModal(0, 'wireguard')"
              />
              <v-list-item
                prepend-icon="mdi-cloud-outline"
                title="Cloudflare WARP"
                rounded="md"
                @click="showModal(0, 'warp')"
              />
              <v-list-item
                prepend-icon="mdi-lan-connect"
                title="Tailscale"
                rounded="md"
                @click="showModal(0, 'tailscale')"
              />
            </v-list>
          </v-menu>
        </div>
      </template>
    </PageHeader>

    <v-alert
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      :text="$t('organization.tunnelHelp')"
    />

    <div class="sui-category-tabs mb-4">
      <v-tabs v-model="category" show-arrows>
        <v-tab value="all">
          <span>{{ $t('all') }}</span>
          <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num ms-2">
            {{ endpoints.length }}
          </v-chip>
        </v-tab>
        <v-tab value="wireguard" prepend-icon="mdi-vpn">
          <span>WireGuard</span>
          <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num ms-2">
            {{ countByType('wireguard') }}
          </v-chip>
        </v-tab>
        <v-tab value="warp" prepend-icon="mdi-cloud-outline">
          <span>WARP</span>
          <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num ms-2">
            {{ countByType('warp') }}
          </v-chip>
        </v-tab>
        <v-tab value="tailscale" prepend-icon="mdi-lan-connect">
          <span>Tailscale</span>
          <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num ms-2">
            {{ countByType('tailscale') }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </div>

    <EmptyState
      v-if="filteredEndpoints.length === 0"
      icon="mdi-vpn"
      :title="$t('ui.noItems')"
      :description="$t('ui.noItemsHint')"
      :action-text="endpoints.length === 0 ? $t('actions.add') : undefined"
      @action="showModal(0, defaultAddType)"
    />

    <v-row v-else>
      <v-col
        v-for="item in filteredEndpoints"
        :key="item.tag"
        cols="12"
        sm="6"
        md="6"
        lg="4"
        xl="3"
      >
        <v-card class="sui-resource-card sui-endpoint-card d-flex flex-column h-100">
          <div class="sui-card-header">
            <div class="sui-card-header__main">
              <div class="sui-card-tag sui-mono text-truncate" dir="ltr" :title="item.tag">
                {{ item.tag }}
              </div>
              <div class="sui-card-badges">
                <v-chip
                  size="x-small"
                  variant="outlined"
                  :color="endpointColor(item.type)"
                  :prepend-icon="endpointIcon(item.type)"
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
                  <template v-if="item.address?.length > 0">
                    {{ item.address[0] }}
                    <v-chip
                      v-if="item.address.length > 1"
                      size="x-small"
                      variant="tonal"
                      color="secondary"
                      class="sui-num ms-1"
                    >
                      +{{ item.address.length - 1 }}
                    </v-chip>
                  </template>
                  <template v-else-if="item.hostname">
                    {{ item.hostname }}
                  </template>
                  <template v-else>-</template>
                </span>
              </div>
              <div class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('in.port') }}</span>
                <span class="sui-kv-value sui-mono sui-num" dir="ltr">
                  {{ item.listen_port > 0 ? item.listen_port : (item.relay_server_port > 0 ? item.relay_server_port : '-') }}
                </span>
              </div>
              <div v-if="item.name || item.system_interface_name" class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('types.wg.ifName') }}</span>
                <span class="sui-kv-value sui-mono" dir="ltr">
                  {{ item.name || item.system_interface_name }}
                </span>
              </div>
              <div class="sui-kv-row">
                <span class="sui-kv-label">{{ $t('types.wg.peers') }}</span>
                <span class="sui-kv-value sui-num">
                  {{ item.peers?.length ?? '-' }}
                </span>
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

            <v-tooltip
              v-if="item.type === 'wireguard' && hasExportablePeer(item)"
              location="top"
              :text="$t('types.wg.qrTitle')"
            >
              <template #activator="{ props: tipProps }">
                <v-btn
                  v-bind="tipProps"
                  icon="mdi-qrcode"
                  variant="text"
                  size="small"
                  density="comfortable"
                  :aria-label="$t('types.wg.qrTitle')"
                  @click="showQrCode(item.id)"
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
import EndpointVue from '@/layouts/modals/Endpoint.vue'
import Stats from '@/layouts/modals/Stats.vue'
import QrCode from '@/layouts/modals/WgQrCode.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { Endpoint } from '@/types/endpoints'
import { computed, ref } from 'vue'

const category = ref('all')
const search = ref('')

const endpoints = computed((): Endpoint[] => {
  return <Endpoint[]> Data().endpoints ?? []
})

const defaultAddType = computed(() => {
  return category.value === 'all' ? 'wireguard' : category.value
})

const countByType = (type: string): number => {
  return endpoints.value.filter((item) => item.type === type).length
}

const filteredEndpoints = computed((): Endpoint[] => {
  const q = search.value.trim().toLowerCase()
  return endpoints.value.filter((item) => {
    if (category.value !== 'all' && item.type !== category.value) return false
    if (!q) return true
    const haystack = [
      item.tag,
      item.type,
      ...(Array.isArray(item.address) ? item.address : []),
      item.hostname,
      item.name,
      item.system_interface_name,
      item.listen_port > 0 ? String(item.listen_port) : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

const endpointTags = computed((): string[] => {
  return endpoints.value.map((o: Endpoint) => o.tag)
})

const onlines = computed((): string[] => {
  return [...(Data().onlines.inbound ?? []), ...(Data().onlines.outbound ?? [])]
})

const endpointIcon = (type: string): string => {
  if (type === 'warp') return 'mdi-cloud-outline'
  if (type === 'tailscale') return 'mdi-lan-connect'
  return 'mdi-vpn'
}

const endpointColor = (type: string): string => {
  if (type === 'warp') return 'info'
  if (type === 'tailscale') return 'secondary'
  return 'primary'
}

const modal = ref({
  visible: false,
  id: 0,
  data: '',
  type: 'wireguard',
})

const showModal = (id: number, type = 'wireguard') => {
  modal.value.id = id
  modal.value.data = id === 0 ? '' : JSON.stringify(endpoints.value.findLast((o) => o.id === id))
  modal.value.type = type
  modal.value.visible = true
}

const closeModal = () => {
  modal.value.visible = false
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
    const success = await Data().save('endpoints', 'del', deleteDialog.value.tag)
    if (success) deleteDialog.value.visible = false
  } finally {
    deleteDialog.value.loading = false
  }
}

const stats = ref({
  visible: false,
  resource: 'endpoint',
  tag: '',
})

const showStats = (tag: string) => {
  stats.value.tag = tag
  stats.value.visible = true
}

const closeStats = () => {
  stats.value.visible = false
}

const qrcode = ref({
  visible: false,
  data: <any>{},
})

const showQrCode = (id: number) => {
  qrcode.value.data = endpoints.value.findLast((o) => o.id === id)
  qrcode.value.visible = true
}

const hasExportablePeer = (item: any): boolean => {
  const exportEnabled = item.client_export_enabled ?? Boolean(item.advertised_endpoint_host)
  if (!exportEnabled) return false
  return (item.peers || []).some((peer: any) => {
    if (peer.peer_key_mode === 'existing_peer') return false
    if (peer.client_private_key || peer.client_private_key_set) return true
    return (item.ext?.keys || []).some((key: any) => key.public_key === peer.public_key)
  })
}

const closeQrCode = () => {
  qrcode.value.visible = false
}
</script>

<style scoped>
.sui-view {
  width: 100%;
}

.sui-split-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sui-category-tabs {
  border-bottom: 1px solid var(--sui-hairline);
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

.sui-card-footer {
  padding: 6px 10px;
  min-height: 44px;
  gap: 2px;
}
</style>
