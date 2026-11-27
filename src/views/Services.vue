<template>
  <div class="sui-services-page">
    <ServiceVue
      v-model="modal.visible"
      :visible="modal.visible"
      :id="modal.id"
      :data="modal.data"
      :inTags="inTags"
      :tsTags="tsTags"
      :ssTags="ssTags"
      :tlsConfigs="tlsConfigs"
      @close="closeModal"
    />

    <ConfirmDialog
      v-model="delDialog.visible"
      :title="`${$t('actions.del')} ${delDialog.tag}`"
      :message="$t('ui.deleteConfirm')"
      :confirm-text="$t('actions.del')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="error"
      icon="mdi-delete-alert-outline"
      :loading="delDialog.loading"
      @confirm="confirmDelSrv"
    />

    <PageHeader
      :title="$t('pages.services')"
      :subtitle="$t('organization.serviceHelp')"
      :count="filteredServices.length"
      v-model:search="search"
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
      </template>
    </PageHeader>

    <div class="sui-services-tabs mb-4">
      <v-tabs v-model="category" color="primary" density="compact" show-arrows>
        <v-tab value="all">
          {{ $t('all') }}
          <v-chip size="x-small" variant="outlined" color="secondary" class="ms-2 sui-num">
            {{ services.length }}
          </v-chip>
        </v-tab>
        <v-tab value="network">
          {{ $t('organization.networkServices') }}
          <v-chip size="x-small" variant="outlined" color="secondary" class="ms-2 sui-num">
            {{ networkCount }}
          </v-chip>
        </v-tab>
        <v-tab value="ai">
          {{ $t('organization.aiServices') }}
          <v-chip size="x-small" variant="outlined" color="secondary" class="ms-2 sui-num">
            {{ aiCount }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </div>

    <EmptyState
      v-if="filteredServices.length === 0"
      icon="mdi-cogs"
      :title="$t('ui.noItems')"
      :description="$t('ui.noItemsHint')"
      :action-text="services.length === 0 ? $t('actions.add') : undefined"
      @action="showModal(0)"
    />

    <v-row v-else>
      <v-col
        v-for="item in filteredServices"
        :key="item.tag"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="sui-resource-card sui-service-card d-flex flex-column fill-height">
          <div class="sui-service-card__head">
            <div class="d-flex align-center ga-2 min-width-0">
              <v-avatar
                :color="isAiService(item.type) ? 'primary' : 'info'"
                variant="tonal"
                size="32"
                rounded="md"
                class="flex-shrink-0"
              >
                <v-icon :icon="isAiService(item.type) ? 'mdi-robot-outline' : 'mdi-lan'" size="18" />
              </v-avatar>
              <span class="sui-mono text-subtitle-1 font-weight-semibold text-truncate" dir="ltr">
                {{ item.tag }}
              </span>
            </div>
            <v-chip
              size="small"
              variant="outlined"
              :color="isAiService(item.type) ? 'primary' : 'info'"
              class="sui-mono flex-shrink-0"
            >
              {{ item.type }}
            </v-chip>
          </div>

          <v-divider />

          <v-card-text class="py-3 flex-grow-1">
            <dl class="sui-kv-list">
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('in.addr') }}</dt>
                <dd class="sui-kv-value sui-mono" dir="ltr">{{ item.listen || '-' }}</dd>
              </div>
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('in.port') }}</dt>
                <dd class="sui-kv-value sui-mono sui-num" dir="ltr">{{ item.listen_port ?? '-' }}</dd>
              </div>
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('objects.tls') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    :color="item.tls_id > 0 ? 'success' : 'secondary'"
                  >
                    {{ item.tls_id > 0 ? $t('security.enabled') : $t('security.disabled') }}
                  </v-chip>
                </dd>
              </div>
            </dl>
          </v-card-text>

          <v-divider />

          <v-card-actions class="px-3 py-2">
            <v-btn
              variant="outlined"
              color="primary"
              size="small"
              prepend-icon="mdi-pencil-outline"
              @click="showModal(item.id)"
            >
              {{ $t('actions.edit') }}
            </v-btn>
            <v-spacer />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              :aria-label="$t('actions.del')"
              @click="askDelSrv(item)"
            >
              <v-icon icon="mdi-delete-outline" />
              <v-tooltip activator="parent" location="top" :text="$t('actions.del')" />
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
import Data from '@/store/modules/data'
import { Srv } from '@/types/services'
import { computed, ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ServiceVue from '@/layouts/modals/Service.vue'

const category = ref('all')
const search = ref('')

const services = computed((): Srv[] => {
  return (Data().services ?? []) as Srv[]
})

const isAiService = (type: string) => ['ocm', 'ccm'].includes(type)

const networkCount = computed(() => services.value.filter((item: any) => !isAiService(item.type)).length)
const aiCount = computed(() => services.value.filter((item: any) => isAiService(item.type)).length)

const filteredServices = computed((): any[] => {
  const q = search.value.trim().toLowerCase()
  return services.value.filter((item: any) => {
    const matchesCategory =
      category.value === 'all' || (isAiService(item.type) ? 'ai' : 'network') === category.value
    if (!matchesCategory) return false
    if (!q) return true
    return (
      String(item.tag ?? '').toLowerCase().includes(q) ||
      String(item.type ?? '').toLowerCase().includes(q) ||
      String(item.listen ?? '').toLowerCase().includes(q) ||
      String(item.listen_port ?? '').includes(q)
    )
  })
})

const tsTags = computed((): any[] => {
  return Data().endpoints?.filter((o: any) => o.type == 'tailscale')?.map((o: any) => o.tag)
})

const ssTags = computed((): any[] => {
  return Data().inbounds?.filter((o: any) => o.type == 'shadowsocks' && !o.users)?.map((o: any) => o.tag)
})

const inTags = computed((): any[] => {
  return [
    ...(Data().inbounds ?? []).map((o: any) => o.tag).filter(t => t != null),
    ...(Data().endpoints ?? []).filter((e: any) => e.listen_port > 0).map((e: any) => e.tag),
  ]
})

const tlsConfigs = computed((): any[] => {
  return (Data().tlsConfigs ?? []) as any[]
})

const modal = ref({
  visible: false,
  id: 0,
  data: '',
})

const delDialog = ref({
  visible: false,
  id: 0,
  tag: '',
  loading: false,
})

const showModal = (id: number) => {
  modal.value.id = id
  modal.value.data = id == 0 ? '' : JSON.stringify(services.value.findLast(o => o.id == id))
  modal.value.visible = true
}

const closeModal = () => {
  modal.value.visible = false
}

const askDelSrv = (item: any) => {
  delDialog.value = {
    visible: true,
    id: item.id,
    tag: item.tag ?? '',
    loading: false,
  }
}

const confirmDelSrv = async () => {
  const index = services.value.findIndex(i => i.id == delDialog.value.id)
  const tag = index >= 0 ? services.value[index].tag : delDialog.value.tag
  if (!tag) {
    delDialog.value.visible = false
    return
  }
  delDialog.value.loading = true
  const success = await Data().save('services', 'del', tag)
  delDialog.value.loading = false
  if (success) delDialog.value.visible = false
}
</script>

<style scoped>
.min-width-0 {
  min-width: 0;
}

.sui-services-tabs {
  border-bottom: 1px solid var(--sui-hairline);
}

.sui-service-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
}
</style>
