<template>
  <div class="sui-access-page">
    <ClientModal
      v-model="modal.visible"
      :visible="modal.visible"
      :id="modal.id"
      :groups="groups"
      :inboundTags="inboundTags"
      @close="closeModal"
    />
    <ClientAddBulk
      v-model="addBulkModal"
      :visible="addBulkModal"
      :groups="groups"
      :inboundTags="inboundTags"
      @close="closeAddBulk"
    />
    <ClientEditBulk
      v-model="editBulkModal"
      :visible="editBulkModal"
      :inboundTags="inboundTags"
      :clients="clients"
      @close="closeEditBulk"
    />
    <QrCode
      v-model="qrcode.visible"
      :visible="qrcode.visible"
      :id="qrcode.id"
      @close="closeQrCode"
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
      icon="mdi-delete-alert-outline"
      :loading="deleteDialog.loading"
      @confirm="confirmDeleteClient"
    >
      <div v-if="deleteDialog.name" class="sui-confirm-target mt-3">
        <span class="sui-mono font-weight-semibold" dir="ltr">{{ deleteDialog.name }}</span>
      </div>
    </ConfirmDialog>

    <PageHeader
      :title="$t('pages.clients')"
      :count="displayedClients.length"
      searchable
      v-model:search="searchQuery"
    >
      <template #prepend>
        <v-btn-toggle
          v-if="clients.length > 0"
          v-model="viewMode"
          mandatory
          density="compact"
          variant="outlined"
          color="primary"
          class="sui-view-toggle"
          @update:model-value="persistViewMode"
        >
          <v-btn
            value="table"
            size="small"
            class="sui-view-toggle__btn"
            :aria-label="$t('pages.clients')"
          >
            <v-icon icon="mdi-table" size="18" />
          </v-btn>
          <v-btn
            value="cards"
            size="small"
            class="sui-view-toggle__btn"
            :aria-label="$t('pages.clients')"
          >
            <v-icon icon="mdi-view-grid-outline" size="18" />
          </v-btn>
        </v-btn-toggle>
      </template>

      <template #actions>
        <v-btn
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-account-multiple-plus-outline"
          @click="addBulk"
        >
          {{ $t('actions.addbulk') }}
        </v-btn>
        <v-btn
          v-if="clients.length > 0"
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-account-multiple-check-outline"
          @click="editBulk"
        >
          {{ $t('actions.editbulk') }}
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

    <div v-if="clients.length > 0" class="sui-filter-bar mb-4">
      <div class="sui-filter-pills" role="group" :aria-label="$t('type')">
        <v-btn
          v-for="opt in stateFilterOptions"
          :key="opt.value"
          size="small"
          density="comfortable"
          :variant="stateFilter === opt.value ? 'flat' : 'outlined'"
          :color="stateFilter === opt.value ? 'primary' : 'secondary'"
          class="sui-filter-pill"
          @click="stateFilter = opt.value"
        >
          <span
            v-if="opt.dot"
            class="sui-status-dot me-2"
            :class="`sui-status-dot--${opt.dot}`"
            aria-hidden="true"
          />
          <span>{{ opt.title }}</span>
          <span class="sui-num sui-pill-count ms-1">{{ opt.count }}</span>
        </v-btn>
      </div>

      <div class="sui-filter-bar__end">
        <v-select
          v-if="groupFilterItems.length > 1"
          v-model="groupFilter"
          :items="groupFilterItems"
          :label="$t('client.group')"
          bg-color="surface"
          density="compact"
          variant="outlined"
          hide-details
          class="sui-group-select"
        />
        <v-btn
          v-if="hasActiveFilters"
          size="small"
          variant="text"
          color="secondary"
          prepend-icon="mdi-filter-remove-outline"
          @click="clearFilter"
        >
          {{ $t('reset') }}
        </v-btn>
      </div>
    </div>

    <EmptyState
      v-if="clients.length === 0"
      icon="mdi-account-group-outline"
      :title="$t('ui.noItems')"
      :description="$t('ui.noItemsHint')"
      :action-text="$t('actions.add')"
      @action="showModal(0)"
    />

    <EmptyState
      v-else-if="displayedClients.length === 0"
      icon="mdi-filter-remove-outline"
      :title="$t('noData')"
      :description="$t('ui.noItemsHint')"
      :action-text="$t('reset')"
      @action="clearFilter"
    />

    <!-- Table View -->
    <v-card v-else-if="viewMode === 'table'" class="sui-table-card">
      <div class="sui-table-wrap">
        <v-data-table
          :headers="headers"
          :items="displayedClients"
          :hide-default-footer="displayedClients.length <= 10"
          :items-per-page="itemPerPage"
          @update:items-per-page="setItemPerPage($event)"
          hide-no-data
          fixed-header
          item-value="id"
          :mobile="smAndDown"
          mobile-breakpoint="sm"
          density="comfortable"
          width="100%"
          class="sui-clients-table"
        >
          <template v-slot:item.name="{ item }">
            <div class="sui-client-identity">
              <div class="sui-client-identity__row">
                <span
                  class="sui-status-dot"
                  :class="statusDotClass(item)"
                  aria-hidden="true"
                />
                <span class="sui-client-name font-weight-semibold">{{ item.name }}</span>
                <v-chip
                  v-if="item.enable === false"
                  size="x-small"
                  variant="outlined"
                  color="error"
                  class="ms-1"
                >
                  {{ $t('security.disabled') }}
                </v-chip>
              </div>
              <div
                v-if="item.desc"
                class="sui-client-desc text-caption text-medium-emphasis text-truncate"
                :title="item.desc"
              >
                {{ item.desc }}
              </div>
            </div>
          </template>

          <template v-slot:item.group="{ item }">
            <v-chip
              v-if="item.group"
              size="small"
              variant="tonal"
              color="secondary"
              class="sui-group-chip"
            >
              {{ item.group }}
            </v-chip>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <template v-slot:item.inbounds="{ item }">
            <div v-if="item.inbounds && item.inbounds.length > 0" class="sui-inbounds-cell">
              <v-tooltip location="top">
                <template #activator="{ props: tipProps }">
                  <div v-bind="tipProps" class="sui-inbound-chips">
                    <v-chip
                      v-for="inbId in item.inbounds.slice(0, 2)"
                      :key="inbId"
                      size="small"
                      variant="tonal"
                      color="primary"
                      class="sui-mono sui-inbound-chip"
                      dir="ltr"
                    >
                      {{ inboundLabel(inbId) }}
                    </v-chip>
                    <v-chip
                      v-if="item.inbounds.length > 2"
                      size="small"
                      variant="tonal"
                      color="secondary"
                      class="sui-num"
                    >
                      +{{ item.inbounds.length - 2 }}
                    </v-chip>
                  </div>
                </template>
                <div dir="ltr" class="sui-mono">
                  <div v-for="inbId in item.inbounds" :key="inbId">
                    {{ inboundLabel(inbId) }}
                  </div>
                </div>
              </v-tooltip>
            </div>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <template v-slot:item.volume="{ item }">
            <div class="sui-traffic-cell">
              <v-tooltip location="top">
                <template #activator="{ props: tipProps }">
                  <div v-bind="tipProps" class="sui-traffic-summary">
                    <div class="sui-traffic-top">
                      <span class="sui-num font-weight-medium" dir="ltr">
                        {{ formatTotalUsage(item) }}
                      </span>
                      <span class="text-medium-emphasis mx-1">/</span>
                      <span
                        v-if="item.volume === 0"
                        class="text-medium-emphasis text-caption"
                      >
                        {{ $t('unlimited') }}
                      </span>
                      <span v-else class="sui-num text-medium-emphasis" dir="ltr">
                        {{ HumanReadable.sizeFormat(item.volume) }}
                      </span>
                    </div>
                    <v-progress-linear
                      v-if="item.volume > 0"
                      :model-value="percent(item)"
                      :color="percentColor(item)"
                      height="5"
                      rounded
                      class="mt-1"
                    />
                    <div class="sui-traffic-split text-caption sui-num" dir="ltr">
                      <span class="text-upload">↑ {{ formatBytes(item.up) }}</span>
                      <span class="text-download">↓ {{ formatBytes(item.down) }}</span>
                    </div>
                  </div>
                </template>
                <span dir="ltr" class="sui-num">
                  {{ $t('stats.upload') }}: {{ formatBytes(item.up) }} · {{ $t('stats.download') }}: {{ formatBytes(item.down) }}
                </span>
              </v-tooltip>
            </div>
          </template>

          <template v-slot:item.expiry="{ item }">
            <div class="text-start">
              <v-tooltip
                v-if="item.expiry > 0"
                location="top"
                :text="formatExpiryDate(item.expiry)"
              >
                <template #activator="{ props: tipProps }">
                  <v-chip
                    v-bind="tipProps"
                    size="small"
                    :variant="expiryChipVariant(item.expiry)"
                    :color="expiryColor(item.expiry)"
                    class="sui-num"
                  >
                    {{ HumanReadable.remainedDays(item.expiry) }}
                  </v-chip>
                </template>
              </v-tooltip>
              <v-chip
                v-else
                size="small"
                variant="outlined"
                color="success"
              >
                {{ HumanReadable.remainedDays(item.expiry) }}
              </v-chip>
            </div>
          </template>

          <template v-slot:item.online="{ item }">
            <div class="text-start">
              <v-chip
                v-if="isClientOnline(item.name)"
                size="small"
                variant="outlined"
                color="success"
                class="sui-online-chip"
              >
                <span class="sui-status-dot sui-status-dot--online me-1" aria-hidden="true" />
                {{ $t('online') }}
              </v-chip>
              <span v-else class="text-medium-emphasis">—</span>
            </div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="sui-action-row">
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
                :aria-label="$t('ui.qrTitle')"
                @click="showQrCode(item.id)"
              >
                <v-icon icon="mdi-qrcode" size="18" />
                <v-tooltip activator="parent" location="top" :text="$t('ui.qrTitle')" />
              </v-btn>
              <v-btn
                v-if="Data().enableTraffic"
                icon
                variant="text"
                size="small"
                density="comfortable"
                :aria-label="$t('stats.graphTitle')"
                @click="showStats(item.name)"
              >
                <v-icon icon="mdi-chart-line" size="18" />
                <v-tooltip activator="parent" location="top" :text="$t('stats.graphTitle')" />
              </v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                density="comfortable"
                :loading="cloningId === item.id"
                :disabled="cloningId !== null && cloningId !== item.id"
                :aria-label="$t('actions.clone')"
                @click="cloneClient(item.id)"
              >
                <v-icon icon="mdi-content-duplicate" size="18" />
                <v-tooltip activator="parent" location="top" :text="$t('actions.clone')" />
              </v-btn>
              <v-btn
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
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card>

    <!-- High-Density Cards View -->
    <v-row v-else>
      <v-col
        v-for="item in displayedClients"
        :key="item.id"
        cols="12"
        sm="6"
        lg="4"
        xl="3"
      >
        <v-card
          class="sui-resource-card sui-client-card d-flex flex-column h-100"
          :class="{ 'sui-client-card--disabled': item.enable === false }"
        >
          <div class="sui-client-card__header">
            <div class="sui-client-card__title-block">
              <div class="sui-client-identity__row">
                <span
                  class="sui-status-dot"
                  :class="statusDotClass(item)"
                  aria-hidden="true"
                />
                <span class="sui-client-card__name font-weight-semibold text-truncate" :title="item.name">
                  {{ item.name }}
                </span>
              </div>
              <div
                v-if="item.desc"
                class="text-caption text-medium-emphasis text-truncate mt-1"
                :title="item.desc"
              >
                {{ item.desc }}
              </div>
            </div>
            <div class="sui-client-card__badges">
              <v-chip
                v-if="isClientOnline(item.name)"
                size="small"
                variant="outlined"
                color="success"
              >
                {{ $t('online') }}
              </v-chip>
              <v-chip
                v-else-if="item.enable === false"
                size="small"
                variant="outlined"
                color="error"
              >
                {{ $t('security.disabled') }}
              </v-chip>
              <v-chip
                v-if="item.group"
                size="small"
                variant="tonal"
                color="secondary"
              >
                {{ item.group }}
              </v-chip>
            </div>
          </div>

          <v-card-text class="sui-client-card__body flex-grow-1">
            <dl class="sui-kv-list">
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('pages.inbounds') }}</dt>
                <dd class="sui-kv-value">
                  <div v-if="item.inbounds && item.inbounds.length > 0" class="sui-inbound-chips justify-end">
                    <v-tooltip location="top">
                      <template #activator="{ props: tipProps }">
                        <div v-bind="tipProps" class="sui-inbound-chips justify-end">
                          <v-chip
                            v-for="inbId in item.inbounds.slice(0, 2)"
                            :key="inbId"
                            size="small"
                            variant="tonal"
                            color="primary"
                            class="sui-mono sui-inbound-chip"
                            dir="ltr"
                          >
                            {{ inboundLabel(inbId) }}
                          </v-chip>
                          <v-chip
                            v-if="item.inbounds.length > 2"
                            size="small"
                            variant="tonal"
                            color="secondary"
                            class="sui-num"
                          >
                            +{{ item.inbounds.length - 2 }}
                          </v-chip>
                        </div>
                      </template>
                      <div dir="ltr" class="sui-mono">
                        <div v-for="inbId in item.inbounds" :key="inbId">
                          {{ inboundLabel(inbId) }}
                        </div>
                      </div>
                    </v-tooltip>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </dd>
              </div>

              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('date.expiry') }}</dt>
                <dd class="sui-kv-value">
                  <v-tooltip
                    v-if="item.expiry > 0"
                    location="top"
                    :text="formatExpiryDate(item.expiry)"
                  >
                    <template #activator="{ props: tipProps }">
                      <v-chip
                        v-bind="tipProps"
                        size="small"
                        :variant="expiryChipVariant(item.expiry)"
                        :color="expiryColor(item.expiry)"
                        class="sui-num"
                      >
                        {{ HumanReadable.remainedDays(item.expiry) }}
                      </v-chip>
                    </template>
                  </v-tooltip>
                  <v-chip
                    v-else
                    size="small"
                    variant="outlined"
                    color="success"
                  >
                    {{ HumanReadable.remainedDays(item.expiry) }}
                  </v-chip>
                </dd>
              </div>
            </dl>

            <div class="sui-card-traffic mt-3">
              <div class="sui-card-traffic__head">
                <span class="text-caption text-medium-emphasis">{{ $t('stats.volume') }}</span>
                <span class="text-caption sui-num font-weight-medium" dir="ltr">
                  {{ formatTotalUsage(item) }} / {{ item.volume === 0 ? $t('unlimited') : HumanReadable.sizeFormat(item.volume) }}
                </span>
              </div>
              <v-progress-linear
                v-if="item.volume > 0"
                :model-value="percent(item)"
                :color="percentColor(item)"
                height="5"
                rounded
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
              :aria-label="$t('ui.qrTitle')"
              @click="showQrCode(item.id)"
            >
              <v-icon icon="mdi-qrcode" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('ui.qrTitle')" />
            </v-btn>
            <v-btn
              v-if="Data().enableTraffic"
              icon
              variant="text"
              size="small"
              density="comfortable"
              :aria-label="$t('stats.graphTitle')"
              @click="showStats(item.name)"
            >
              <v-icon icon="mdi-chart-line" size="18" />
              <v-tooltip activator="parent" location="top" :text="$t('stats.graphTitle')" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              density="comfortable"
              :loading="cloningId === item.id"
              :disabled="cloningId !== null && cloningId !== item.id"
              :aria-label="$t('actions.clone')"
              @click="cloneClient(item.id)"
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
import { useDisplay } from 'vuetify'
import Data from '@/store/modules/data'
import ClientModal from '@/layouts/modals/Client.vue'
import ClientAddBulk from '@/layouts/modals/ClientAddBulk.vue'
import ClientEditBulk from '@/layouts/modals/ClientEditBulk.vue'
import QrCode from '@/layouts/modals/QrCode.vue'
import Stats from '@/layouts/modals/Stats.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { Client, createClient, randomConfigs, shuffleConfigs, updateConfigs } from '@/types/clients'
import { HumanReadable } from '@/plugins/utils'
import { isNodeLinkRemark, replicaNodeName } from '@/plugins/cluster'
import { inboundPickerTitle } from '@/plugins/inbounds'
import { locale } from '@/locales'

const { t } = useI18n()
const { smAndDown } = useDisplay()

const VIEW_MODE_KEY = 'sui-clients-view'
const readStoredViewMode = (): 'table' | 'cards' => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'cards' ? 'cards' : 'table'
  } catch {
    return 'table'
  }
}

const viewMode = ref<'table' | 'cards'>(readStoredViewMode())
const persistViewMode = (mode: 'table' | 'cards') => {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  } catch {
    // Ignore restricted storage environments
  }
}

const clients = computed((): any[] => {
  return Data().clients ?? []
})

const inbounds = computed((): any[] => {
  return Data().inbounds ?? []
})

const onlineUsers = computed((): Set<string> => {
  return new Set(Data().onlines?.user ?? [])
})

const isClientOnline = (cname: string): boolean => {
  return onlineUsers.value.has(cname)
}

const inboundTags = computed((): any[] => {
  if (!inbounds.value) return []
  // Cluster replicas (node_id set) are labelled with their node so the same
  // protocol on several machines stays distinguishable.
  // A switched-off inbound is marked: binding to it is allowed, but its links
  // are not served until it is switched back on.
  const offMark = t('inbound.offMark')
  return inbounds.value
    .filter((i: any) => i.tag != '' && i.users)
    .map((i: any) => {
      const node = replicaNodeName(i, Data().nodes ?? [])
      return { title: inboundPickerTitle(<any>i, node, offMark), value: i.id }
    })
})

const inboundLabelMap = computed((): Map<number, string> => {
  const map = new Map<number, string>()
  for (const tag of inboundTags.value) {
    map.set(tag.value, tag.title)
  }
  for (const inb of inbounds.value) {
    if (!map.has(inb.id)) map.set(inb.id, inb.tag)
  }
  return map
})

const inboundLabel = (id: number): string => {
  return inboundLabelMap.value.get(id) ?? `#${id}`
}

const groups = computed((): string[] => {
  if (!clients.value) return []
  return Array.from(new Set(clients.value.map((c: any) => c.group ?? '')))
})

const groupFilterItems = computed(() => [
  { title: t('all'), value: '-' },
  ...groups.value.map((g) => ({
    title: g.length > 0 ? g : t('none'),
    value: g,
  })),
])

const searchQuery = ref('')
const stateFilter = ref<'' | 'online' | 'disable' | 'expired'>('')
const groupFilter = ref('-')

const isExpired = (c: any): boolean => {
  return Number(c.expiry ?? 0) > 0 && Number(c.expiry) < Date.now() / 1000
}

const stateFilterOptions = computed(() => [
  {
    value: '' as const,
    title: t('all'),
    count: clients.value.length,
    dot: null as string | null,
  },
  {
    value: 'online' as const,
    title: t('online'),
    count: clients.value.filter((c: any) => isClientOnline(c.name)).length,
    dot: 'online',
  },
  {
    value: 'disable' as const,
    title: t('disable'),
    count: clients.value.filter((c: any) => c.enable === false).length,
    dot: 'disabled',
  },
  {
    value: 'expired' as const,
    title: t('date.expired'),
    count: clients.value.filter((c: any) => isExpired(c)).length,
    dot: 'expired',
  },
])

const displayedClients = computed((): any[] => {
  let list = clients.value
  if (groupFilter.value !== '-') {
    list = list.filter((c: any) => (c.group ?? '') === groupFilter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q.length > 0) {
    list = list.filter(
      (c: any) =>
        String(c.name ?? '').toLowerCase().includes(q) ||
        String(c.desc ?? '').toLowerCase().includes(q) ||
        String(c.group ?? '').toLowerCase().includes(q),
    )
  }
  switch (stateFilter.value) {
    case 'disable':
      list = list.filter((c: any) => c.enable === false)
      break
    case 'expired':
      list = list.filter((c: any) => isExpired(c))
      break
    case 'online':
      list = list.filter((c: any) => isClientOnline(c.name))
      break
  }
  return list
})

const hasActiveFilters = computed(
  () =>
    searchQuery.value.trim().length > 0 ||
    stateFilter.value !== '' ||
    groupFilter.value !== '-',
)

const clearFilter = () => {
  searchQuery.value = ''
  stateFilter.value = ''
  groupFilter.value = '-'
}

const headers = computed(() => [
  { title: t('client.name'), key: 'name' },
  { title: t('client.group'), key: 'group' },
  { title: t('pages.inbounds'), key: 'inbounds', sortable: false },
  { title: t('stats.volume'), key: 'volume' },
  { title: t('date.expiry'), key: 'expiry' },
  { title: t('online'), key: 'online', sortable: false },
  { title: t('actions.action'), key: 'actions', align: 'end' as const, sortable: false },
])

const itemPerPage = ref<number>(Number(localStorage.getItem('items-per-page')) || 10)

const setItemPerPage = (items: number) => {
  itemPerPage.value = items
  try {
    localStorage.setItem('items-per-page', items.toString())
  } catch {
    // Ignore storage errors
  }
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

const confirmDeleteClient = async () => {
  if (deleteDialog.value.loading || !deleteDialog.value.id) return
  deleteDialog.value.loading = true
  try {
    const success = await Data().save('clients', 'del', deleteDialog.value.id)
    if (success) deleteDialog.value.visible = false
  } finally {
    deleteDialog.value.loading = false
  }
}

const cloningId = ref<number | null>(null)

const cloneClient = async (id: number) => {
  if (cloningId.value !== null) return
  cloningId.value = id
  try {
    const source = await Data().loadClients(id)
    if (!source || !source.name) return
    let newName = `${source.name}-copy`
    let suffix = 2
    while (clients.value.some((c: any) => c.name === newName)) {
      newName = `${source.name}-copy-${suffix++}`
    }
    const baseConfig = source.config
      ? JSON.parse(JSON.stringify(source.config))
      : randomConfigs(newName)
    const clonedConfig = updateConfigs(baseConfig, newName)
    shuffleConfigs(clonedConfig)
    const nodeNames = (Data().nodes ?? []).map((n: any) => n.name)
    const keepLinks = (source.links ?? []).filter(
      (l: any) =>
        (l.type === 'external' && !isNodeLinkRemark(l.remark, nodeNames)) ||
        l.type === 'sub',
    )
    const cloned = createClient({
      ...source,
      id: 0,
      name: newName,
      subId: '',
      up: 0,
      down: 0,
      totalUp: 0,
      totalDown: 0,
      config: clonedConfig,
      links: keepLinks,
      inbounds: Array.isArray(source.inbounds) ? [...source.inbounds] : [],
    })
    await Data().save('clients', 'new', cloned)
  } finally {
    cloningId.value = null
  }
}

const qrcode = ref({
  visible: false,
  id: 0,
})

const showQrCode = (id: number) => {
  qrcode.value.id = id
  qrcode.value.visible = true
}

const closeQrCode = () => {
  qrcode.value.visible = false
}

const stats = ref({
  visible: false,
  resource: 'user',
  tag: '',
})

const showStats = (tag: string) => {
  stats.value.tag = tag
  stats.value.visible = true
}

const closeStats = () => {
  stats.value.visible = false
}

const addBulkModal = ref(false)
const addBulk = () => {
  addBulkModal.value = true
}
const closeAddBulk = () => {
  addBulkModal.value = false
}

const editBulkModal = ref(false)
const editBulk = () => {
  editBulkModal.value = true
}
const closeEditBulk = () => {
  editBulkModal.value = false
}

const percent = (c: Client): number => {
  if (!(c.volume > 0)) return 0
  return Math.min(100, Math.round(((c.up + c.down) * 100) / c.volume))
}

const percentColor = (c: Client): string => {
  if (c.up + c.down >= c.volume) return 'error'
  if (percent(c) > 85) return 'warning'
  return 'primary'
}

const formatBytes = (value: number | undefined): string => {
  const n = Number(value ?? 0)
  return n > 0 ? HumanReadable.sizeFormat(n) : '0 ' + t('stats.B')
}

const formatTotalUsage = (c: Client): string => {
  const total = Number(c.up ?? 0) + Number(c.down ?? 0)
  return total > 0 ? HumanReadable.sizeFormat(total) : '0 ' + t('stats.B')
}

const formatExpiryDate = (expiry: number): string => {
  return new Date(expiry * 1000).toLocaleString(locale)
}

const expiryColor = (expiry: number): string => {
  if (expiry === 0) return 'success'
  const now = Date.now() / 1000
  if (expiry <= now) return 'error'
  if (expiry - now <= 7 * 86400) return 'warning'
  return 'secondary'
}

const expiryChipVariant = (expiry: number): 'outlined' | 'tonal' => {
  const col = expiryColor(expiry)
  return col === 'secondary' ? 'tonal' : 'outlined'
}

const statusDotClass = (c: any): string => {
  if (isClientOnline(c.name)) return 'sui-status-dot--online'
  if (c.enable === false || isExpired(c) || (c.volume > 0 && c.up + c.down >= c.volume)) {
    return 'sui-status-dot--error'
  }
  return 'sui-status-dot--idle'
}
</script>

<style scoped>
.sui-access-page {
  width: 100%;
}

.sui-view-toggle {
  height: 36px;
}

.sui-view-toggle__btn {
  min-width: 36px;
  padding-inline: 8px;
}

.sui-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
}

.sui-filter-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.sui-filter-pill {
  min-height: 32px;
}

.sui-pill-count {
  font-size: 0.75rem;
  font-weight: 600;
}

.sui-filter-bar__end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-group-select {
  width: 200px;
  max-width: 100%;
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

.sui-status-dot--error,
.sui-status-dot--expired {
  background-color: rgb(var(--v-theme-error));
}

.sui-status-dot--disabled {
  background-color: rgb(var(--v-theme-warning));
}

.sui-status-dot--idle {
  background-color: rgb(var(--v-theme-outline));
}

.sui-table-card {
  overflow: hidden;
}

.sui-clients-table :deep(th) {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
}

.sui-clients-table :deep(td) {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  vertical-align: middle;
}

.sui-clients-table :deep(.v-data-table__tr--mobile td) {
  height: fit-content;
  min-height: 36px !important;
}

.sui-clients-table :deep(.v-data-table__tr--mobile td > div) {
  max-width: 100%;
}

.sui-client-identity {
  min-width: 140px;
  max-width: 260px;
}

.sui-client-identity__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sui-client-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sui-client-desc {
  padding-inline-start: 16px;
  max-width: 240px;
}

.sui-inbound-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.sui-inbound-chip {
  max-width: 150px;
}

.sui-inbound-chip :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sui-traffic-cell {
  min-width: 170px;
  max-width: 230px;
}

.sui-traffic-top {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  line-height: 1.3;
}

.sui-traffic-split {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.sui-action-row {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  white-space: nowrap;
}

.sui-client-card--disabled {
  border-style: dashed;
}

.sui-client-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
}

.sui-client-card__title-block {
  min-width: 0;
  flex: 1 1 auto;
}

.sui-client-card__name {
  font-size: 0.9375rem;
  line-height: 1.35;
}

.sui-client-card__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.sui-client-card__body {
  padding: 6px 16px 14px;
}

.sui-card-traffic {
  padding-top: 10px;
  border-top: 1px solid var(--sui-hairline);
}

.sui-card-traffic__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
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

@media (max-width: 599.98px) {
  .sui-group-select {
    width: 100%;
  }

  .sui-filter-bar__end {
    width: 100%;
  }
}
</style>
