<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-dialog transition="dialog-bottom-transition" width="600" :model-value="visible" @update:model-value="v => { if (!v) emit('close') }">
    <v-card class="rounded-lg" :loading="busy">
      <v-card-title>{{ $t('cert.applyTitle', { domain: cert?.domain ?? '' }) }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <div class="text-medium-emphasis mb-2">{{ $t('cert.applyHint') }}</div>
        <v-row>
          <v-col cols="12" sm="6">
            <v-checkbox v-model="targets" value="web" :label="$t('cert.targetWeb')" :hint="$t('cert.currentDomain', { domain: settings.webDomain || '-' })" persistent-hint :disabled="!!result" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-checkbox v-model="targets" value="sub" :label="$t('cert.targetSub')" :hint="$t('cert.currentDomain', { domain: settings.subDomain || '-' })" persistent-hint :disabled="!!result" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" sm="6">
            <v-switch color="primary" v-model="setDomain" :label="$t('cert.setDomain')" :disabled="isWildcard || !!result" hide-details />
          </v-col>
          <v-col cols="12" sm="6">
            <v-switch color="warning" v-model="force" :label="$t('cert.forceApply')" :disabled="!!result" hide-details />
          </v-col>
        </v-row>
        <v-alert v-if="setDomain" type="warning" variant="tonal" density="compact" class="mt-2">{{ $t('cert.setDomainHint', { domain: cert?.domain ?? '' }) }}</v-alert>
        <v-alert v-if="mismatch.length > 0 && !setDomain" type="warning" variant="tonal" density="compact" class="mt-2">
          {{ $t('cert.mismatchHint', { names: mismatch.join(', ') }) }}
        </v-alert>
        <template v-if="result">
          <v-alert type="success" variant="tonal" density="compact" class="mt-4">
            <div v-if="(result.hotReloaded ?? []).length > 0">{{ $t('cert.hotReloaded', { targets: targetNames(result.hotReloaded) }) }}</div>
            <div v-if="(result.restartRequired ?? []).length > 0">{{ $t('cert.restartRequired', { targets: targetNames(result.restartRequired) }) }}</div>
            <div v-if="(result.hotReloaded ?? []).length === 0 && (result.restartRequired ?? []).length === 0">{{ $t('cert.applied') }}</div>
          </v-alert>
          <v-alert v-for="w in (result.warnings ?? [])" :key="w" type="warning" variant="tonal" density="compact" class="mt-2" style="word-break: break-word;">{{ w }}</v-alert>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="emit('close')">{{ $t('actions.close') }}</v-btn>
        <v-btn v-if="!result" color="primary" variant="tonal" :loading="busy" :disabled="targets.length === 0" @click="apply">{{ $t('cert.apply') }}</v-btn>
        <v-btn v-else-if="(result.restartRequired ?? []).length > 0" color="warning" variant="tonal" prepend-icon="mdi-restart" @click="emit('restart', result)">{{ $t('actions.restartApp') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { domainCovers, formBool, targetsField, type ApplyResult, type CertInfo, type CertTarget } from '@/plugins/certs'

const props = defineProps<{ visible: boolean, cert: CertInfo | null, settings: Record<string, string> }>()
const emit = defineEmits<{ close: [], applied: [result: ApplyResult], restart: [result: ApplyResult] }>()

const targets = ref<CertTarget[]>(['web'])
const setDomain = ref(false)
const force = ref(false)
const busy = ref(false)
const result = ref<ApplyResult | null>(null)

const isWildcard = computed(() => (props.cert?.domain ?? '').startsWith('*.'))

const targetNames = (list: string[] | null): string =>
  (list ?? []).map(t => i18n.global.t(t === 'sub' ? 'cert.targetSub' : 'cert.targetWeb')).join(', ')

// Configured domains this certificate would not cover (the server refuses
// those unless force is set).
const mismatch = computed((): string[] => {
  const d = props.cert?.domain ?? ''
  const out: string[] = []
  for (const t of targets.value) {
    const current = t === 'web' ? props.settings.webDomain : props.settings.subDomain
    if (current && !domainCovers(d, current)) out.push(current)
  }
  return out
})

watch(() => props.visible, (v) => {
  if (!v) return
  result.value = null
  force.value = false
  const used = props.cert?.usedBy ?? []
  targets.value = used.length > 0 ? [...used] : ['web']
  // Suggest pointing the panel at this domain when nothing is configured yet.
  setDomain.value = !isWildcard.value && !props.settings.webDomain && targets.value.includes('web')
})

const apply = async () => {
  if (!props.cert) return
  busy.value = true
  const msg = await HttpUtils.post('api/applyCert', {
    domain: props.cert.domain,
    targets: targetsField(targets.value),
    setDomain: formBool(setDomain.value),
    force: formBool(force.value),
  })
  busy.value = false
  if (msg.success && msg.obj) {
    result.value = <ApplyResult>msg.obj
    emit('applied', result.value)
  }
}
</script>
