<template>
  <div class="sui-access-page">
    <TlsVue
      v-model="modal.visible"
      :visible="modal.visible"
      :id="modal.id"
      :data="modal.data"
      @close="closeModal"
      @save="saveModal"
    />
    <ConfirmDialog
      v-model="deleteDialog.visible"
      :title="$t('ui.deleteTitle')"
      :message="$t('ui.deleteConfirm')"
      :confirm-text="$t('actions.del')"
      confirm-color="error"
      icon="mdi-delete-alert-outline"
      :loading="deleteDialog.loading"
      @confirm="confirmDeleteTls"
    >
      <div v-if="deleteDialog.name" class="sui-confirm-target mt-3">
        <span class="sui-mono font-weight-semibold" dir="ltr">{{ deleteDialog.name }}</span>
      </div>
    </ConfirmDialog>

    <PageHeader
      :title="$t('pages.tls')"
      :count="filteredTlsConfigs.length"
      searchable
      v-model:search="searchQuery"
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
      </template>
    </PageHeader>

    <EmptyState
      v-if="tlsConfigs.length === 0"
      icon="mdi-shield-lock-outline"
      :title="$t('ui.noItems')"
      :description="$t('ui.noItemsHint')"
      :action-text="$t('actions.add')"
      @action="showModal(0)"
    />

    <EmptyState
      v-else-if="filteredTlsConfigs.length === 0"
      icon="mdi-filter-remove-outline"
      :title="$t('noData')"
      :description="$t('ui.noItemsHint')"
      :action-text="$t('reset')"
      @action="searchQuery = ''"
    />

    <v-row v-else>
      <v-col
        v-for="item in filteredTlsConfigs"
        :key="item.id"
        cols="12"
        sm="6"
        md="4"
        xl="3"
      >
        <v-card class="sui-resource-card sui-tls-card d-flex flex-column h-100">
          <div class="sui-tls-card__header">
            <div class="sui-tls-card__title-group">
              <v-avatar
                size="34"
                rounded="md"
                variant="tonal"
                :color="isReality(item) ? 'info' : 'primary'"
                class="sui-tls-card__avatar"
              >
                <v-icon
                  :icon="isReality(item) ? 'mdi-shield-key-outline' : 'mdi-certificate-outline'"
                  size="18"
                />
              </v-avatar>
              <div class="sui-tls-card__heading">
                <div class="sui-tls-card__name font-weight-semibold text-truncate" :title="item.name">
                  {{ item.name }}
                </div>
                <div
                  class="sui-tls-card__sni sui-mono text-caption text-medium-emphasis text-truncate"
                  dir="ltr"
                  :title="primaryServerName(item)"
                >
                  {{ primaryServerName(item) || '—' }}
                </div>
              </div>
            </div>

            <v-chip
              size="small"
              variant="tonal"
              :color="isReality(item) ? 'info' : 'primary'"
              class="flex-shrink-0"
            >
              {{ isReality(item) ? 'Reality' : 'TLS' }}
            </v-chip>
          </div>

          <div v-if="featureBadges(item).length > 0" class="sui-tls-card__badges">
            <v-chip
              v-for="badge in featureBadges(item)"
              :key="badge.key"
              size="small"
              :variant="badge.variant"
              :color="badge.color"
              :class="badge.mono ? 'sui-mono' : undefined"
            >
              {{ badge.label }}
            </v-chip>
          </div>

          <v-card-text class="sui-tls-card__body flex-grow-1">
            <dl class="sui-kv-list">
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('pages.inbounds') }}</dt>
                <dd class="sui-kv-value">
                  <template v-if="tlsInbounds(item.id).length > 0">
                    <v-tooltip location="top">
                      <template #activator="{ props: tipProps }">
                        <v-chip
                          v-bind="tipProps"
                          size="small"
                          variant="tonal"
                          color="primary"
                          class="sui-num"
                        >
                          {{ tlsInbounds(item.id).length }}
                        </v-chip>
                      </template>
                      <div dir="ltr" class="sui-mono">
                        <div v-for="tag in tlsInbounds(item.id)" :key="tag">{{ tag }}</div>
                      </div>
                    </v-tooltip>
                  </template>
                  <span v-else class="text-medium-emphasis">—</span>
                </dd>
              </div>

              <div v-if="isReality(item) && realityHandshake(item)" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('types.shdwTls.hs') }}</dt>
                <dd class="sui-kv-value sui-mono text-truncate" dir="ltr" :title="realityHandshake(item)">
                  {{ realityHandshake(item) }}
                </dd>
              </div>

              <div v-if="isReality(item) && item.client?.reality?.public_key" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('tls.pubKey') }}</dt>
                <dd class="sui-kv-value">
                  <v-tooltip location="top" :text="item.client.reality.public_key">
                    <template #activator="{ props: tipProps }">
                      <span v-bind="tipProps" class="sui-mono sui-fingerprint" dir="ltr">
                        {{ truncateMono(item.client.reality.public_key, 16) }}
                      </span>
                    </template>
                  </v-tooltip>
                </dd>
              </div>

              <div v-if="!isReality(item) && item.server?.certificate_path" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('tls.certPath') }}</dt>
                <dd class="sui-kv-value">
                  <v-tooltip location="top" :text="item.server.certificate_path">
                    <template #activator="{ props: tipProps }">
                      <span v-bind="tipProps" class="sui-mono sui-path" dir="ltr">
                        {{ truncatePath(item.server.certificate_path) }}
                      </span>
                    </template>
                  </v-tooltip>
                </dd>
              </div>

              <div v-else-if="!isReality(item) && item.server?.certificate?.length" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('tls.cert') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip size="small" variant="tonal" color="secondary">
                    {{ $t('tls.useText') }}
                  </v-chip>
                </dd>
              </div>

              <div v-if="acmeDomains(item)" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.domain') }}</dt>
                <dd class="sui-kv-value sui-mono text-truncate" dir="ltr" :title="acmeDomains(item)">
                  {{ acmeDomains(item) }}
                </dd>
              </div>

              <div v-if="item.server?.alpn?.length" class="sui-kv-row">
                <dt class="sui-kv-label">ALPN</dt>
                <dd class="sui-kv-value sui-mono" dir="ltr">
                  {{ item.server.alpn.join(', ') }}
                </dd>
              </div>

              <div class="sui-kv-row">
                <dt class="sui-kv-label">ACME / ECH</dt>
                <dd class="sui-kv-value">
                  <div class="sui-flag-group">
                    <v-chip
                      size="small"
                      :variant="item.server?.acme != undefined ? 'outlined' : 'tonal'"
                      :color="item.server?.acme != undefined ? 'success' : 'secondary'"
                    >
                      ACME: {{ $t(item.server?.acme == undefined ? 'no' : 'yes') }}
                    </v-chip>
                    <v-chip
                      size="small"
                      :variant="item.server?.ech != undefined ? 'outlined' : 'tonal'"
                      :color="item.server?.ech != undefined ? 'info' : 'secondary'"
                    >
                      ECH: {{ $t(item.server?.ech == undefined ? 'no' : 'yes') }}
                    </v-chip>
                  </div>
                </dd>
              </div>
            </dl>
          </v-card-text>

          <v-divider />

          <v-card-actions class="sui-card-actions">
            <v-btn
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

            <v-btn
              icon
              variant="text"
              size="small"
              density="comfortable"
              :loading="cloningId === item.id"
              :disabled="cloningId !== null && cloningId !== item.id"
              :aria-label="$t('actions.clone')"
              @click="clone(item)"
            >
              <v-icon icon="mdi-content-duplicate" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('actions.clone')" />
            </v-btn>

            <v-spacer />

            <v-btn
              v-if="tlsInbounds(item.id).length === 0"
              icon
              variant="text"
              size="small"
              density="comfortable"
              color="error"
              :aria-label="$t('actions.del')"
              @click="openDeleteDialog(item)"
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TlsVue from '@/layouts/modals/Tls.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Data from '@/store/modules/data'
import { Inbound } from '@/types/inbounds'
import { tls } from '@/types/tls'

const { t } = useI18n()

const tlsConfigs = computed((): any[] => {
  return Data().tlsConfigs ?? []
})

const inbounds = computed((): Inbound[] => {
  return Data().inbounds ?? []
})

const tlsInbounds = (id: number): string[] => {
  return inbounds.value.filter((i) => i.tls_id == id).map((i) => i.tag)
}

const searchQuery = ref('')

const filteredTlsConfigs = computed((): any[] => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return tlsConfigs.value
  return tlsConfigs.value.filter((item: any) => {
    const domains = Array.isArray(item.server?.acme?.domain)
      ? item.server.acme.domain.join(' ')
      : ''
    return (
      String(item.name ?? '').toLowerCase().includes(q) ||
      String(item.server?.server_name ?? '').toLowerCase().includes(q) ||
      String(item.server?.certificate_path ?? '').toLowerCase().includes(q) ||
      String(item.server?.reality?.handshake?.server ?? '').toLowerCase().includes(q) ||
      domains.toLowerCase().includes(q)
    )
  })
})

const modal = ref({
  visible: false,
  id: 0,
  data: '',
})

const showModal = (id: number) => {
  modal.value.id = id
  modal.value.data =
    id == 0 ? '{}' : JSON.stringify(tlsConfigs.value.find((t: any) => t.id == id))
  modal.value.visible = true
}

const closeModal = () => {
  modal.value.visible = false
}

const saveModal = async (data: tls) => {
  const success = await Data().save('tls', data.id > 0 ? 'edit' : 'new', data)
  if (success) modal.value.visible = false
}

const cloningId = ref<number | null>(null)

const clone = async (obj: any) => {
  if (cloningId.value !== null) return
  cloningId.value = obj.id
  try {
    const data = JSON.parse(JSON.stringify(obj))
    data.id = 0
    while (tlsConfigs.value.findIndex((item: any) => item.name == data.name) != -1) {
      data.name += '-copy'
    }
    await saveModal(data)
  } finally {
    cloningId.value = null
  }
}

const deleteDialog = ref({
  visible: false,
  id: 0,
  name: '',
  loading: false,
})

const openDeleteDialog = (item: any) => {
  deleteDialog.value = {
    visible: true,
    id: item.id,
    name: item.name ?? '',
    loading: false,
  }
}

const confirmDeleteTls = async () => {
  if (deleteDialog.value.loading || !deleteDialog.value.id) return
  deleteDialog.value.loading = true
  try {
    const success = await Data().save('tls', 'del', deleteDialog.value.id)
    if (success) deleteDialog.value.visible = false
  } finally {
    deleteDialog.value.loading = false
  }
}

const isReality = (item: any): boolean => item.server?.reality != undefined

const primaryServerName = (item: any): string => {
  if (item.server?.server_name?.length > 0) return item.server.server_name
  if (item.server?.acme?.default_server_name) return item.server.acme.default_server_name
  if (Array.isArray(item.server?.acme?.domain) && item.server.acme.domain.length > 0) {
    return item.server.acme.domain[0]
  }
  return ''
}

const acmeDomains = (item: any): string => {
  const domains = item.server?.acme?.domain
  if (!Array.isArray(domains) || domains.length === 0) return ''
  return domains.join(', ')
}

const realityHandshake = (item: any): string => {
  const hs = item.server?.reality?.handshake
  if (!hs?.server) return ''
  return hs.server_port ? `${hs.server}:${hs.server_port}` : String(hs.server)
}

interface FeatureBadge {
  key: string
  label: string
  color: string
  variant: 'tonal' | 'outlined'
  mono?: boolean
}

const featureBadges = (item: any): FeatureBadge[] => {
  const badges: FeatureBadge[] = []
  if (item.client?.utls?.fingerprint) {
    badges.push({
      key: 'utls',
      label: `uTLS: ${item.client.utls.fingerprint}`,
      color: 'secondary',
      variant: 'tonal',
      mono: true,
    })
  }
  if (item.server?.min_version || item.server?.max_version) {
    const min = item.server?.min_version ?? '1.2'
    const max = item.server?.max_version ?? '1.3'
    badges.push({
      key: 'ver',
      label: min === max ? `TLS ${min}` : `TLS ${min}–${max}`,
      color: 'secondary',
      variant: 'tonal',
      mono: true,
    })
  }
  if (item.server?.kernel_tx || item.server?.kernel_rx) {
    badges.push({
      key: 'ktls',
      label: t('tls.ktls'),
      color: 'info',
      variant: 'tonal',
    })
  }
  return badges
}

const truncateMono = (val: string, maxLen = 16): string => {
  if (!val) return ''
  return val.length > maxLen ? `${val.slice(0, maxLen)}…` : val
}

const truncatePath = (path: string): string => {
  if (!path) return ''
  if (path.length <= 28) return path
  const parts = path.split(/[/\\]/)
  const tail = parts.slice(-2).join('/')
  return `…/${tail}`
}
</script>

<style scoped>
.sui-access-page {
  width: 100%;
}

.sui-tls-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
}

.sui-tls-card__title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.sui-tls-card__avatar {
  flex-shrink: 0;
}

.sui-tls-card__heading {
  min-width: 0;
  flex: 1 1 auto;
}

.sui-tls-card__name {
  font-size: 0.9375rem;
  line-height: 1.35;
}

.sui-tls-card__sni {
  margin-top: 2px;
}

.sui-tls-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 16px 8px;
}

.sui-tls-card__body {
  padding: 6px 16px 14px;
}

.sui-fingerprint,
.sui-path {
  font-size: 0.8125rem;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sui-flag-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.sui-card-actions {
  padding: 6px 10px;
  gap: 2px;
}

.sui-confirm-target {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background: rgb(var(--v-theme-surface-light));
}
</style>
