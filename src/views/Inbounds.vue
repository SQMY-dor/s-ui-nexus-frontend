<template>
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
  <v-row>
    <v-col cols="12" justify="center" align="center">
      <v-btn color="primary" @click="showModal(0)">{{ $t('actions.add') }}</v-btn>
    </v-col>
  </v-row>
  <v-row>
    <v-col cols="12" sm="4" md="3" lg="2" v-for="(item, index) in <any[]>inbounds" :key="item.tag">
      <v-card rounded="xl" elevation="5" min-width="200" :title="item.tag" :class="{ 'inbound-off': !inboundEnabled(item) }">
        <template v-slot:append v-if="!item.node_id">
          <v-switch
            color="primary"
            density="compact"
            hide-details
            :model-value="inboundEnabled(item)"
            :loading="switching[item.id]"
            :disabled="switching[item.id]"
            @update:model-value="(v: any) => setEnable(item, !!v)">
            <v-tooltip activator="parent" location="top" :text="inboundEnabled(item) ? $t('inbound.switchOff') : $t('inbound.switchOn')"></v-tooltip>
          </v-switch>
        </template>
        <v-card-subtitle style="margin-top: -15px;">
          <v-row>
            <v-col>
              {{ item.type }}
              <v-chip v-if="!inboundEnabled(item) && inboundDepleted(item)" density="compact" size="small" color="error" variant="tonal" class="ms-1">
                {{ $t('inbound.depleted') }}
              </v-chip>
              <v-chip v-else-if="!inboundEnabled(item)" density="compact" size="small" color="grey" variant="tonal" class="ms-1">
                {{ $t('inbound.off') }}
              </v-chip>
              <v-chip v-if="item.node_id" density="compact" size="small" color="info" variant="tonal" prepend-icon="mdi-server-network" class="ms-1">
                {{ nodeName(item) }}
                <v-tooltip activator="parent" location="top" :text="$t('node.replicaHint')"></v-tooltip>
              </v-chip>
            </v-col>
          </v-row>
        </v-card-subtitle>
        <v-card-text>
          <v-row>
            <v-col>{{ $t('in.addr') }}</v-col>
            <v-col>
              {{ item.listen }}
            </v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('in.port') }}</v-col>
            <v-col>
              {{ item.listen_port }}
            </v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('objects.tls') }}</v-col>
            <v-col>
              {{ item.tls_id > 0 ? $t('enable') : $t('disable') }}
            </v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('pages.clients') }}</v-col>
            <v-col>
              <template v-if="item.users">
                <v-tooltip activator="parent" dir="ltr" location="bottom" v-if="item.users.length > 0">
                  <span v-for="u in item.users" :key="u">{{ u }}<br /></span>
                </v-tooltip>
                {{ item.users.length }}
              </template>
              <template v-else>-</template>
            </v-col>
          </v-row>
          <v-row v-if="!item.node_id && (item.volume ?? 0) > 0">
            <v-col>{{ $t('inbound.traffic') }}</v-col>
            <v-col>
              <div dir="ltr" style="font-size: 0.8rem;">{{ HumanReadable.sizeFormat((item.up ?? 0) + (item.down ?? 0)) }} / {{ HumanReadable.sizeFormat(item.volume ?? 0) }}</div>
              <v-progress-linear :model-value="inboundUsagePercent(item)" :color="inboundDepleted(item) ? 'error' : 'primary'" rounded height="4"></v-progress-linear>
            </v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('online') }}</v-col>
            <v-col>
              <template v-if="onlines.includes(item.tag)">
                <v-chip density="comfortable" size="small" color="success" variant="flat">{{ $t('online') }}</v-chip>
              </template>
              <template v-else>-</template>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions style="padding: 0;">
          <v-btn v-if="!item.node_id" icon="mdi-file-edit" @click="showModal(item.id)">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('actions.edit')"></v-tooltip>
          </v-btn>
          <span v-else class="d-inline-block">
            <v-btn icon="mdi-file-lock" disabled>
              <v-icon />
            </v-btn>
            <v-tooltip activator="parent" location="top" :text="$t('node.manageOnNode')"></v-tooltip>
          </span>
          <v-btn :icon="item.node_id ? 'mdi-link-variant-remove' : 'mdi-file-remove'" style="margin-inline-start:0;" color="warning" @click="delOverlay[index] = true">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="item.node_id ? $t('node.unadopt') : $t('actions.del')"></v-tooltip>
          </v-btn>
          <v-overlay
            v-model="delOverlay[index]"
            contained
            class="align-center justify-center"
          >
            <v-card :title="item.node_id ? $t('node.unadopt') : $t('actions.del')" rounded="lg" max-width="320">
              <v-divider></v-divider>
              <v-card-text>{{ item.node_id ? $t('node.unadoptConfirm') : $t('confirm') }}</v-card-text>
              <v-card-actions>
                <v-btn color="error" variant="outlined" @click="delInbound(item.id)">{{ $t('yes') }}</v-btn>
                <v-btn color="success" variant="outlined" @click="delOverlay[index] = false">{{ $t('no') }}</v-btn>
              </v-card-actions>
            </v-card>
          </v-overlay>
          <v-btn v-if="!item.node_id" icon="mdi-content-duplicate" :loading="cloneLoading" @click="clone(item.id)">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('actions.clone')"></v-tooltip>
          </v-btn>
          <v-btn icon="mdi-chart-line" @click="showStats(item.tag)" v-if="Data().enableTraffic && !item.node_id">
            <v-icon />
            <v-tooltip activator="parent" location="top" :text="$t('stats.graphTitle')"></v-tooltip>
          </v-btn>
        </v-card-actions>
      </v-card>      
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
import Data from '@/store/modules/data'
import InboundVue from '@/layouts/modals/Inbound.vue'
import Stats from '@/layouts/modals/Stats.vue'
import { computed, ref } from 'vue'
import { createInbound, Inbound } from '@/types/inbounds'
import RandomUtil from '@/plugins/randomUtil'
import { replicaNodeName } from '@/plugins/cluster'
import { inboundEnabled, inboundDepleted, inboundUsagePercent } from '@/plugins/inbounds'
import { HumanReadable } from '@/plugins/utils'

const nodeName = (inbound: any): string => replicaNodeName(inbound, Data().nodes ?? [])

const inbounds = computed((): Inbound[] => {
  return <Inbound[]> Data().inbounds
})

const tlsConfigs = computed((): any[] => {
  return <any[]> Data().tlsConfigs
})

const inTags = computed((): string[] => {
  return [
    ...(inbounds.value ?? []).map(i => i.tag),
    ...(Data().endpoints ?? []).filter((e:any) => e.listen_port > 0).map((e:any) => e.tag),
  ]
})

const onlines = computed(() => {
  return Data().onlines.inbound?? []
})

const modal = ref({
  visible: false,
  id: 0,
})

const delOverlay = ref(new Array<boolean>)

const showModal = (id: number) => {
  modal.value.id = id
  modal.value.visible = true
}
const closeModal = () => {
  modal.value.visible = false
}

const delInbound = async (id: number) => {
  const index = inbounds.value.findIndex(i => i.id == id)
  const tag = inbounds.value[index].tag

  const success = await Data().save("inbounds", "del", tag)
  if (success) delOverlay.value[index] = false
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
    await Data().save("inbounds", "edit", { ...inbound, enable })
  } finally {
    switching.value[item.id] = false
  }
}

const cloneLoading = ref(false)

const clone = async (id: number) => {
  cloneLoading.value = true
  const inboundArray = await Data().loadInbounds([id])
  const inbound = inboundArray[0]
  const newTag = inbound.type + "-" + RandomUtil.randomSeq(3)
  // A clone starts enabled and with its own (zero) traffic counters.
  const newInbound = createInbound(inbound.type, { ...inbound,
    id: 0,
    enable: true,
    up: 0,
    down: 0,
    tag: newTag,
    listen_port: RandomUtil.randomIntRange(10000, 60000),
  })
  await Data().save("inbounds", "new", newInbound)
  cloneLoading.value = false
}

const stats = ref({
  visible: false,
  resource: "inbound",
  tag: "",
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
.inbound-off {
  opacity: 0.6;
}
</style>
