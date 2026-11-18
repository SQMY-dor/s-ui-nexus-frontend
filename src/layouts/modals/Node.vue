<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-dialog transition="dialog-bottom-transition" width="640" :model-value="visible" @update:model-value="v => { if (!v) emit('close') }">
    <v-card class="rounded-lg" :loading="loading">
      <v-card-title>
        {{ isNew ? $t('actions.add') + ' ' + $t('objects.node') : $t('actions.edit') + ' ' + (original?.name ?? '') }}
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field v-model="node.name" :label="$t('node.name')" placeholder="jp-tokyo-1" :hint="$t('node.nameHint')" persistent-hint />
          </v-col>
          <v-col cols="12" sm="6" class="d-flex align-center">
            <v-switch color="primary" v-model="node.enable" :label="$t('enable')" hide-details />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" sm="8">
            <v-text-field v-model="node.baseUrl" dir="ltr" :label="$t('node.baseUrl')" placeholder="https://node.example.com:2095" :hint="$t('node.baseUrlHint')" persistent-hint />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field v-model="node.webPath" dir="ltr" :label="$t('node.webPath')" placeholder="/app/" hide-details />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="node.token"
              dir="ltr"
              :type="showToken ? 'text' : 'password'"
              :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showToken = !showToken"
              :label="$t('node.token')"
              :placeholder="!isNew && original?.tokenSet ? $t('node.tokenKeep') : ''"
              :hint="!isNew && original?.tokenSet ? $t('node.tokenKeep') : $t('node.tokenHint')"
              persistent-hint
              autocomplete="new-password"
            />
          </v-col>
        </v-row>
        <template v-if="isHttps">
          <v-row>
            <v-col cols="12" sm="5" class="d-flex align-center">
              <v-switch color="warning" v-model="node.insecure" :label="$t('node.insecure')" hide-details />
            </v-col>
            <v-col cols="12" sm="7">
              <v-text-field v-model="node.certPin" dir="ltr" :label="$t('node.certPin')" :hint="$t('node.certPinHint')" persistent-hint placeholder="sha256 hex" />
            </v-col>
          </v-row>
        </template>
        <v-alert v-else-if="isHttp" type="warning" variant="tonal" density="compact" class="mt-2">{{ $t('node.httpWarn') }}</v-alert>
        <v-row>
          <v-col cols="12">
            <v-text-field v-model="node.desc" :label="$t('node.desc')" hide-details />
          </v-col>
        </v-row>
        <v-alert v-if="errors.length > 0 && triedSave" type="error" variant="tonal" density="compact" class="mt-4">
          <div v-for="e in errors" :key="e">{{ $t(e) }}</div>
        </v-alert>
        <v-row class="mt-2" align="center">
          <v-col cols="auto">
            <v-btn variant="tonal" prepend-icon="mdi-lan-connect" :loading="testing" :disabled="!canTest" @click="testConnection">{{ $t('node.test') }}</v-btn>
          </v-col>
          <v-col v-if="testResult" style="min-width: 0;">
            <template v-if="testResult.state === 'online'">
              <v-chip color="success" size="small" variant="flat">{{ $t('node.status.online') }}</v-chip>
              <span class="ms-2" dir="ltr">{{ testResult.latency }} {{ $t('date.ms') }} · {{ testResult.appVersion || '-' }} / {{ testResult.coreVersion || '-' }}</span>
            </template>
            <template v-else-if="testResult.state === 'core-stopped'">
              <v-chip color="warning" size="small" variant="flat">{{ $t('node.status.coreStopped') }}</v-chip>
              <span class="ms-2">{{ $t('node.testReachable') }}</span>
            </template>
            <template v-else>
              <v-chip color="error" size="small" variant="flat">{{ $t('node.status.offline') }}</v-chip>
              <span class="ms-2 text-error" style="word-break: break-word;">{{ testResult.error || '-' }}</span>
            </template>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="emit('close')">{{ $t('actions.close') }}</v-btn>
        <v-btn color="primary" variant="tonal" :loading="loading" @click="saveChanges">{{ $t('actions.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import Data from '@/store/modules/data'
import HttpUtils from '@/plugins/httputil'
import { defaultNode, nodePayload, validateNode, type Node, type NodeStatus } from '@/plugins/cluster'

const props = defineProps<{ visible: boolean, id: number }>()
const emit = defineEmits<{ close: [] }>()

const node = ref<Node>(defaultNode())
const original = ref<Node | null>(null)
const loading = ref(false)
const testing = ref(false)
const triedSave = ref(false)
const showToken = ref(false)
const testResult = ref<NodeStatus | null>(null)

const isNew = computed(() => !(props.id > 0))
const isHttps = computed(() => (node.value.baseUrl ?? '').trim().toLowerCase().startsWith('https://'))
const isHttp = computed(() => (node.value.baseUrl ?? '').trim().toLowerCase().startsWith('http://'))
const errors = computed(() => validateNode({ ...node.value, tokenSet: original.value?.tokenSet }, isNew.value, original.value?.name ?? ''))
const canTest = computed(() => /^https?:\/\/[^/\s]+/i.test((node.value.baseUrl ?? '').trim()))

const reset = () => {
  triedSave.value = false
  testResult.value = null
  showToken.value = false
  if (props.id > 0) {
    const found = Data().nodes.find(n => n.id == props.id)
    original.value = found ? { ...found } : null
    // The server never returns the token; an empty field on save keeps it.
    node.value = { ...defaultNode(), ...(found ?? {}), token: '' }
  } else {
    original.value = null
    node.value = defaultNode()
  }
}

watch(() => props.visible, (v) => { if (v) reset() }, { immediate: true })

const saveChanges = async () => {
  if (!props.visible) return
  triedSave.value = true
  if (errors.value.length > 0) return
  loading.value = true
  const success = await Data().save('nodes', isNew.value ? 'new' : 'edit', nodePayload(node.value))
  loading.value = false
  if (success) emit('close')
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  const msg = await HttpUtils.post('api/testNode', { data: JSON.stringify(nodePayload(node.value)) }, { timeout: 60000 })
  testing.value = false
  if (msg.success && msg.obj) {
    testResult.value = <NodeStatus>msg.obj
  } else {
    testResult.value = <NodeStatus>{ state: 'offline', error: msg.msg, latency: 0, cpu: 0, mem: { current: 0, total: 0 }, appVersion: '', coreVersion: '', checkedAt: 0, lastOnline: 0 }
  }
}
</script>
