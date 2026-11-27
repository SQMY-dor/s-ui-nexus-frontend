<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-dialog
    transition="dialog-bottom-transition"
    width="100%"
    max-width="660"
    :model-value="visible"
    @update:model-value="v => { if (!v) emit('close') }"
  >
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-server-network" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ isNew ? $t('actions.add') + ' ' + $t('objects.node') : $t('actions.edit') + ' ' + (original?.name ?? '') }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="emit('close')"
        />
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <div class="sui-section-header">
          <span>{{ $t('client.basics') }}</span>
        </div>

        <v-row>
          <v-col cols="12" sm="7">
            <v-text-field
              v-model="node.name"
              :label="$t('node.name')"
              placeholder="jp-tokyo-1"
              :hint="$t('node.nameHint')"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" sm="5" class="d-flex align-center">
            <v-switch v-model="node.enable" color="primary" :label="$t('enable')" hide-details />
          </v-col>
        </v-row>

        <v-row class="mt-1">
          <v-col cols="12" sm="8">
            <v-text-field
              v-model="node.baseUrl"
              dir="ltr"
              class="sui-mono"
              :label="$t('node.baseUrl')"
              placeholder="https://node.example.com:2095"
              :hint="$t('node.baseUrlHint')"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="node.webPath"
              dir="ltr"
              class="sui-mono"
              :label="$t('node.webPath')"
              placeholder="/app/"
              hide-details
            />
          </v-col>
        </v-row>

        <v-row class="mt-1">
          <v-col cols="12">
            <v-text-field
              v-model="node.token"
              dir="ltr"
              class="sui-mono"
              :type="showToken ? 'text' : 'password'"
              :label="$t('node.token')"
              :placeholder="!isNew && original?.tokenSet ? $t('node.tokenKeep') : ''"
              :hint="!isNew && original?.tokenSet ? $t('node.tokenKeep') : $t('node.tokenHint')"
              persistent-hint
              autocomplete="new-password"
            >
              <template #append-inner>
                <v-btn
                  :icon="showToken ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="text"
                  width="28"
                  height="28"
                  :aria-label="showToken ? $t('ui.hidePassword') : $t('ui.showPassword')"
                  @click="showToken = !showToken"
                />
              </template>
            </v-text-field>
          </v-col>
        </v-row>

        <template v-if="isHttps">
          <div class="sui-section-header mt-5">
            <span>{{ $t('objects.tls') }}</span>
          </div>
          <v-row align="start">
            <v-col cols="12" sm="5" class="d-flex align-center">
              <v-switch v-model="node.insecure" color="warning" :label="$t('node.insecure')" hide-details />
            </v-col>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="node.certPin"
                dir="ltr"
                class="sui-mono"
                :label="$t('node.certPin')"
                :hint="$t('node.certPinHint')"
                persistent-hint
                placeholder="sha256 hex"
              />
            </v-col>
          </v-row>
        </template>
        <v-alert v-else-if="isHttp" type="warning" variant="tonal" density="compact" class="mt-3">
          {{ $t('node.httpWarn') }}
        </v-alert>

        <v-row class="mt-2">
          <v-col cols="12">
            <v-text-field v-model="node.desc" :label="$t('node.desc')" hide-details />
          </v-col>
        </v-row>

        <v-alert v-if="errors.length > 0 && triedSave" type="error" variant="tonal" density="compact" class="mt-4">
          <div v-for="e in errors" :key="e">{{ $t(e) }}</div>
        </v-alert>

        <div class="sui-test-bar mt-4 d-flex align-center flex-wrap ga-3">
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            prepend-icon="mdi-lan-connect"
            :loading="testing"
            :disabled="!canTest"
            @click="testConnection"
          >
            {{ $t('node.test') }}
          </v-btn>
          <div v-if="testResult" class="d-flex align-center flex-wrap ga-2 min-w-0">
            <template v-if="testResult.state === 'online'">
              <v-chip color="success" size="small" variant="flat">{{ $t('node.status.online') }}</v-chip>
              <span class="sui-mono text-caption" dir="ltr">
                {{ testResult.latency }} {{ $t('date.ms') }} · {{ testResult.appVersion || '-' }} / {{ testResult.coreVersion || '-' }}
              </span>
            </template>
            <template v-else-if="testResult.state === 'core-stopped'">
              <v-chip color="warning" size="small" variant="flat">{{ $t('node.status.coreStopped') }}</v-chip>
              <span class="text-body-2">{{ $t('node.testReachable') }}</span>
            </template>
            <template v-else>
              <v-chip color="error" size="small" variant="flat">{{ $t('node.status.offline') }}</v-chip>
              <span class="text-body-2 text-error sui-wrap-anywhere">{{ testResult.error || '-' }}</span>
            </template>
          </div>
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="emit('close')">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :loading="loading" @click="saveChanges">
          {{ $t('actions.save') }}
        </v-btn>
      </div>
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

<style scoped>
.sui-test-bar {
  padding: 10px 12px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-wrap-anywhere {
  overflow-wrap: anywhere;
}
</style>
