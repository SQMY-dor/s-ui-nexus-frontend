<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-dialog transition="dialog-bottom-transition" width="560" :model-value="visible" @update:model-value="v => { if (!v) emit('close') }">
    <v-card class="rounded-lg" :loading="loading">
      <v-card-title>{{ $t('node.inboundsTitle', { name: nodeName }) }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <div class="text-medium-emphasis mb-2">{{ $t('node.adoptHint') }}</div>
        <v-alert v-if="loadError" type="error" variant="tonal" density="compact">{{ loadError }}</v-alert>
        <div v-else-if="!loading && inbounds.length === 0" class="text-center text-medium-emphasis pa-4">{{ $t('node.noRemoteInbounds') }}</div>
        <v-list v-else density="compact">
          <v-list-item v-for="ib in inbounds" :key="ib.tag" :disabled="ib.adopted" @click="toggle(ib)">
            <template #prepend>
              <v-checkbox-btn :model-value="ib.adopted || selected.includes(ib.tag)" :disabled="ib.adopted" @click.stop="toggle(ib)" />
            </template>
            <v-list-item-title dir="ltr">{{ ib.tag }}</v-list-item-title>
            <v-list-item-subtitle>{{ ib.type }}<template v-if="!ib.adopted && !ib.takesUsers"> · {{ $t('node.noUsers') }}</template></v-list-item-subtitle>
            <template #append>
              <v-chip v-if="ib.adopted" color="success" size="small" variant="tonal">{{ $t('node.adopted') }}</v-chip>
              <v-chip v-else-if="localTags.includes(ib.tag)" color="warning" size="small" variant="tonal">{{ $t('node.tagConflict') }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
        <!-- The clients picker of the inbound drawer, offered only while a
             selected inbound can carry users; "none" = import only. -->
        <Users v-if="!loading && assignable" :clients="pickerClients" :data="initUsers" />
        <div v-if="!loading && assignable && incomplete" class="text-caption text-error mt-1">{{ $t('node.pickClients') }}</div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">{{ $t('node.refresh') }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="emit('close')">{{ $t('actions.close') }}</v-btn>
        <v-btn color="primary" variant="tonal" :loading="adopting" :disabled="selected.length === 0 || (assignable && incomplete)" @click="adopt">
          {{ $t('node.adopt') }} ({{ selected.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import Data from '@/store/modules/data'
import HttpUtils from '@/plugins/httputil'
import type { RemoteInbound } from '@/plugins/cluster'
import Users from '@/components/Users.vue'
import { bindableClients, initUsersIncomplete, resolveInitUsers } from '@/plugins/inbounds'

const props = defineProps<{ visible: boolean, nodeId: number, nodeName: string }>()
const emit = defineEmits<{ close: [] }>()

const inbounds = ref<RemoteInbound[]>([])
const selected = ref<string[]>([])
const loading = ref(false)
const adopting = ref(false)
const loadError = ref('')
// Same shape the inbound drawer's Users picker edits (none/all/group/client).
const initUsers = ref({ model: 'none', values: <any[]>[] })

// @cluster clients belong to an upstream master and are never bound here.
const pickerClients = computed((): any[] => bindableClients(<any[]>(Data().clients ?? [])))
const assignable = computed((): boolean => inbounds.value.some(ib => !ib.adopted && ib.takesUsers && selected.value.includes(ib.tag)))
const incomplete = computed((): boolean => initUsersIncomplete(initUsers.value.model, initUsers.value.values))

// Tags are unique on the master: adopting a tag that already exists locally fails.
const localTags = computed((): string[] => (Data().inbounds ?? []).filter((i: any) => !i.node_id).map((i: any) => i.tag))

const toggle = (ib: RemoteInbound) => {
  if (ib.adopted) return
  const i = selected.value.indexOf(ib.tag)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(ib.tag)
}

const load = async () => {
  if (!props.nodeId) return
  loading.value = true
  loadError.value = ''
  selected.value = []
  initUsers.value = { model: 'none', values: [] }
  const msg = await HttpUtils.get('api/nodeInbounds', { id: props.nodeId }, { timeout: 60000 })
  loading.value = false
  if (msg.success) inbounds.value = Array.isArray(msg.obj) ? msg.obj : []
  else {
    inbounds.value = []
    loadError.value = msg.msg
  }
}

const adopt = async () => {
  adopting.value = true
  // Same comma-separated field api/save takes for a new local inbound; empty
  // means import only.
  const ids = assignable.value ? resolveInitUsers(initUsers.value.model, initUsers.value.values, pickerClients.value) : []
  const msg = await HttpUtils.post('api/adoptInbounds', { id: props.nodeId, tags: JSON.stringify(selected.value), initUsers: ids.join(',') }, { timeout: 60000 })
  adopting.value = false
  if (msg.success) {
    Data().lastLoad = 0
    await Data().loadData()
    emit('close')
  }
}

watch(() => props.visible, (v) => { if (v) { inbounds.value = []; load() } }, { immediate: true })
</script>
