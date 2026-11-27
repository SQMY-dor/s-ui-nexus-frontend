<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-dialog
    transition="dialog-bottom-transition"
    width="100%"
    max-width="640"
    :persistent="busy"
    :model-value="visible"
    @update:model-value="v => { if (!v && !busy) emit('close') }"
  >
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-shield-plus-outline" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('cert.issueTitle') }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="busy"
          :aria-label="$t('actions.close')"
          @click="emit('close')"
        />
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          {{ $t('cert.issueHint') }}
        </v-alert>

        <v-row>
          <v-col cols="12" sm="7">
            <v-text-field
              v-model="form.domain"
              dir="ltr"
              class="sui-mono"
              :label="$t('cert.domain')"
              placeholder="panel.example.com"
              :disabled="busy"
              :error-messages="form.domain && !domainOk ? $t('cert.err.domain') : ''"
            />
          </v-col>
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="form.email"
              dir="ltr"
              :label="$t('cert.email')"
              placeholder="you@example.com"
              :disabled="busy"
              :hint="$t('cert.emailHint')"
              persistent-hint
              :error-messages="!emailOk ? $t('cert.err.email') : ''"
            />
          </v-col>
        </v-row>

        <v-row class="mt-1">
          <v-col cols="12" sm="7">
            <v-select
              v-model="form.method"
              :items="methods"
              :label="$t('cert.method')"
              :disabled="busy"
              :hint="methodHint"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" sm="5" class="d-flex flex-column justify-center ga-1">
            <v-switch
              v-model="form.behindProxy"
              color="primary"
              :label="$t('cert.behindProxy')"
              :disabled="busy"
              hide-details
            />
            <v-switch
              v-model="form.force"
              color="warning"
              :label="$t('cert.force')"
              :disabled="busy"
              hide-details
            />
          </v-col>
        </v-row>

        <v-alert v-if="form.force" type="warning" variant="tonal" density="compact" class="mt-3">
          {{ $t('cert.forceHint') }}
        </v-alert>

        <div v-if="busy" class="mt-4 sui-progress-box">
          <v-progress-linear indeterminate color="primary" rounded />
          <div class="text-body-2 text-medium-emphasis mt-2 sui-num">
            {{ $t('cert.issuing', { seconds: elapsed }) }}
          </div>
        </div>

        <v-alert v-if="result" type="success" variant="tonal" density="compact" class="mt-4">
          <div class="font-weight-medium">{{ $t('cert.issuedVia', { method: result.method }) }}</div>
          <div dir="ltr" class="sui-mono text-caption mt-1 sui-wrap-anywhere">
            {{ result.certFile }}<br />{{ result.keyFile }}
          </div>
          <div v-if="form.behindProxy && !result.reloadCmd" class="mt-1 text-caption">
            {{ $t('cert.noReloadHook') }}
          </div>
        </v-alert>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-4 sui-pre-error sui-mono text-caption"
        >
          {{ errorMsg }}
        </v-alert>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" :disabled="busy" @click="emit('close')">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="busy"
          :disabled="!domainOk || !emailOk || !!result"
          @click="issue"
        >
          {{ $t('cert.issue') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { formBool, isValidDomain, isValidEmail, type NginxStatus } from '@/plugins/certs'

const props = defineProps<{
  visible: boolean
  acmeEmail: string
  nginx: NginxStatus
  /** Domains whose TLS nginx terminates per the saved settings. */
  proxiedDomains: string[]
}>()
const emit = defineEmits<{ close: [], issued: [domain: string] }>()

// acme.sh install + HTTP-01 can take minutes; the request is synchronous.
const ISSUE_TIMEOUT_MS = 10 * 60 * 1000

const form = ref({ domain: '', email: '', method: 'auto', force: false, behindProxy: false })
const busy = ref(false)
const elapsed = ref(0)
const result = ref<any>(null)
const errorMsg = ref('')
let timer: ReturnType<typeof setInterval> | undefined

const domainOk = computed(() => isValidDomain(form.value.domain.trim().toLowerCase()))
const emailOk = computed(() => isValidEmail(form.value.email))

const methods = computed(() => [
  { title: i18n.global.t('cert.methodAuto'), value: 'auto' },
  { title: i18n.global.t('cert.methodStandalone'), value: 'standalone' },
  { title: i18n.global.t('cert.methodNginx'), value: 'nginx' },
])

// Same decision order as resolveMethod on the server.
const methodHint = computed(() => {
  if (!props.nginx.port80Busy) return i18n.global.t('cert.hintPortFree')
  if (props.nginx.active) return i18n.global.t('cert.hintNginx')
  return i18n.global.t('cert.hintPortBusy')
})

watch(() => form.value.domain, (d) => {
  const v = d.trim().toLowerCase()
  form.value.behindProxy = props.proxiedDomains.some(p => p.toLowerCase() === v)
})

watch(() => props.visible, (v) => {
  if (v) {
    form.value = { domain: '', email: props.acmeEmail ?? '', method: 'auto', force: false, behindProxy: false }
    result.value = null
    errorMsg.value = ''
  }
})

const issue = async () => {
  if (!domainOk.value || busy.value) return
  busy.value = true
  errorMsg.value = ''
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value++ }, 1000)
  const domain = form.value.domain.trim().toLowerCase()
  const msg = await HttpUtils.post('api/issueCert', {
    domain,
    email: form.value.email.trim(),
    method: form.value.method,
    force: formBool(form.value.force),
    behindProxy: formBool(form.value.behindProxy),
  }, { timeout: ISSUE_TIMEOUT_MS })
  if (timer) clearInterval(timer)
  busy.value = false
  if (msg.success) {
    result.value = msg.obj ?? {}
    emit('issued', domain)
  } else {
    // A proxy/CDN in front of the panel may cut the request while acme.sh
    // keeps going: the parent refreshes the list either way.
    errorMsg.value = msg.msg
    emit('issued', '')
  }
}

onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.sui-progress-box {
  padding: 12px 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-wrap-anywhere {
  overflow-wrap: anywhere;
}

.sui-pre-error {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
