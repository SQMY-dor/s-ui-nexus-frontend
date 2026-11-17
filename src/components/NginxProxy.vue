<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <v-card rounded="xl" elevation="5" class="mt-4">
    <v-card-title>{{ $t('cert.nginxTitle') }}</v-card-title>
    <v-card-subtitle style="margin-top: -10px;">{{ $t('cert.nginxSubtitle') }}</v-card-subtitle>
    <v-card-text>
      <v-alert v-if="!supported" type="info" variant="tonal" density="compact" class="mb-3">{{ $t('cert.linuxOnly') }}</v-alert>
      <v-alert v-else-if="!nginx.installed" type="info" variant="tonal" density="compact" class="mb-3">{{ $t('cert.nginxMissing') }}</v-alert>
      <v-row>
        <v-col v-for="side in sides" :key="side.key" cols="12" md="6">
          <v-card variant="tonal" rounded="lg">
            <v-card-title class="text-subtitle-1">{{ $t(side.key === 'web' ? 'cert.targetWeb' : 'cert.targetSub') }}</v-card-title>
            <v-card-text>
              <v-switch color="primary" v-model="form[side.key].enabled" :label="$t('cert.nginxEnable')" :disabled="!usable" hide-details />
              <v-text-field v-model="form[side.key].domain" dir="ltr" :label="$t('cert.domain')" :disabled="!usable || !form[side.key].enabled"
                :error-messages="form[side.key].enabled && !isValidDomain(form[side.key].domain.trim()) ? $t('cert.err.domain') : ''" class="mt-2" />
              <v-select
                :model-value="(null as string | null)"
                :items="certItems"
                :label="$t('cert.pickCert')"
                :disabled="!usable || !form[side.key].enabled || certItems.length === 0"
                @update:model-value="(d: string | null) => pickCert(side.key, d)"
                hide-details
                class="mb-3"
              />
              <v-text-field v-model="form[side.key].certFile" dir="ltr" :label="$t('setting.sslCert')" :disabled="!usable || !form[side.key].enabled" hide-details class="mb-3" />
              <v-text-field v-model="form[side.key].keyFile" dir="ltr" :label="$t('setting.sslKey')" :disabled="!usable || !form[side.key].enabled" hide-details />
              <template v-if="side.key === 'web' && form.web.enabled">
                <v-alert v-if="!isLoopbackListen(settings.webListen)" type="warning" variant="tonal" density="compact" class="mt-3">{{ $t('cert.listenWarn', { listen: settings.webListen || '0.0.0.0' }) }}</v-alert>
                <v-checkbox v-if="!isLoopbackListen(settings.webListen)" v-model="setLoopback" :label="$t('cert.setLoopback')" :disabled="!usable" hide-details />
              </template>
              <v-alert v-if="side.key === 'web' && !form.web.enabled && savedWebNginx && isLoopbackListen(settings.webListen)" type="error" variant="tonal" density="compact" class="mt-3">
                {{ $t('cert.disableLoopbackWarn') }}
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-row v-if="drift !== null">
        <v-col>
          <v-chip :color="drift ? 'warning' : 'success'" variant="tonal">{{ drift ? $t('cert.drift') : $t('cert.noDrift') }}</v-chip>
        </v-col>
      </v-row>
      <v-row v-if="vhosts.length > 0">
        <v-col>
          <v-alert type="success" variant="tonal" density="compact">
            <div v-for="v in vhosts" :key="v.confFile" dir="ltr">{{ v.domain }} → {{ v.confFile }} <span v-for="u in (v.urls ?? [])" :key="u"> · {{ u }}</span></div>
          </v-alert>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn variant="outlined" color="primary" :loading="checking" :disabled="!usable" @click="check">{{ $t('cert.nginxCheck') }}</v-btn>
      <v-btn variant="tonal" color="warning" :loading="applying" :disabled="!usable || !formOk || !changed" @click="confirmOpen = true">{{ $t('cert.nginxApply') }}</v-btn>
    </v-card-actions>
  </v-card>
  <v-dialog v-model="confirmOpen" width="480">
    <v-card class="rounded-lg">
      <v-card-title>{{ $t('cert.nginxApply') }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>{{ $t('cert.nginxApplyConfirm') }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="success" variant="outlined" @click="confirmOpen = false">{{ $t('no') }}</v-btn>
        <v-btn color="warning" variant="tonal" :loading="applying" @click="apply">{{ $t('yes') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import HttpUtils from '@/plugins/httputil'
import { formBool, isLoopbackListen, panelURL, isValidDomain, type CertInfo, type NginxStatus, type VhostResult } from '@/plugins/certs'

type Side = 'web' | 'sub'
interface SideForm { enabled: boolean, domain: string, certFile: string, keyFile: string }

const props = defineProps<{
  settings: Record<string, string>
  certs: CertInfo[]
  supported: boolean
  nginx: NginxStatus
}>()
const emit = defineEmits<{ restart: [payload: { url: string, panelChanged: boolean }] }>()

const sides: { key: Side }[] = [{ key: 'web' }, { key: 'sub' }]
const form = ref<Record<Side, SideForm>>({
  web: { enabled: false, domain: '', certFile: '', keyFile: '' },
  sub: { enabled: false, domain: '', certFile: '', keyFile: '' },
})
const setLoopback = ref(false)
const checking = ref(false)
const applying = ref(false)
const confirmOpen = ref(false)
const drift = ref<boolean | null>(null)
const vhosts = ref<VhostResult[]>([])

const usable = computed(() => props.supported && props.nginx.installed)
const savedWebNginx = computed(() => props.settings.webNginx === 'true')

const fromSettings = () => {
  const s = props.settings
  form.value = {
    web: { enabled: s.webNginx === 'true', domain: s.webDomain ?? '', certFile: s.webCertFile ?? '', keyFile: s.webKeyFile ?? '' },
    sub: { enabled: s.subNginx === 'true', domain: s.subDomain ?? '', certFile: s.subCertFile ?? '', keyFile: s.subKeyFile ?? '' },
  }
  setLoopback.value = false
  drift.value = null
}
watch(() => props.settings, fromSettings, { immediate: true, deep: true })

const certItems = computed(() => props.certs.filter(c => c.notAfter > 0).map(c => ({ title: c.domain, value: c.domain })))

const pickCert = (side: Side, domain: string | null) => {
  const c = props.certs.find(x => x.domain === domain)
  if (!c) return
  form.value[side].certFile = c.certFile
  form.value[side].keyFile = c.keyFile
  if (!form.value[side].domain && !c.domain.startsWith('*.')) form.value[side].domain = c.domain
}

const formOk = computed(() => (['web', 'sub'] as Side[]).every(k => {
  const f = form.value[k]
  return !f.enabled || (isValidDomain(f.domain.trim()) && f.certFile.trim() !== '' && f.keyFile.trim() !== '')
}))

const changed = computed(() => {
  const s = props.settings
  const f = form.value
  return f.web.enabled !== (s.webNginx === 'true') || f.sub.enabled !== (s.subNginx === 'true') ||
    (f.web.enabled && (f.web.domain !== s.webDomain || f.web.certFile !== s.webCertFile || f.web.keyFile !== s.webKeyFile)) ||
    (f.sub.enabled && (f.sub.domain !== s.subDomain || f.sub.certFile !== s.subCertFile || f.sub.keyFile !== s.subKeyFile)) ||
    (f.web.enabled && setLoopback.value)
})

// Form fields for syncNginxProxy/checkNginxProxy; anything not sent falls
// back to the saved settings on the server (api/certApi.go readProxyForm).
const proxyForm = (): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const k of ['web', 'sub'] as Side[]) {
    const f = form.value[k]
    out[k + 'Nginx'] = formBool(f.enabled)
    if (f.enabled) {
      out[k + 'Domain'] = f.domain.trim().toLowerCase()
      out[k + 'DomainSet'] = 'true'
      out[k + 'CertFile'] = f.certFile.trim()
      out[k + 'KeyFile'] = f.keyFile.trim()
      out[k + 'CertSet'] = 'true'
    }
  }
  if (form.value.web.enabled && setLoopback.value) {
    out.webListen = '127.0.0.1'
    out.webListenSet = 'true'
  }
  return out
}

const check = async () => {
  checking.value = true
  const msg = await HttpUtils.post('api/checkNginxProxy', proxyForm(), { timeout: 120000 })
  checking.value = false
  drift.value = msg.success ? !!msg.obj?.drift : null
}

const apply = async () => {
  confirmOpen.value = false
  applying.value = true
  try {
    // 1. Write and verify the vhosts first: only once nginx serves them is it
    //    safe to move a side to plain HTTP behind it.
    const synced = await HttpUtils.post('api/syncNginxProxy', proxyForm(), { timeout: 120000 })
    if (!synced.success) return
    vhosts.value = Array.isArray(synced.obj) ? synced.obj : []
    // 2. Persist the switches (and the paths/domains the vhosts were built
    //    from, so the startup reconciliation rebuilds the same thing).
    const current = await HttpUtils.get('api/settings')
    if (!current.success || !current.obj) return
    const next: Record<string, string> = { ...current.obj }
    for (const k of ['web', 'sub'] as Side[]) {
      const f = form.value[k]
      next[k + 'Nginx'] = formBool(f.enabled)
      if (f.enabled) {
        next[k + 'Domain'] = f.domain.trim().toLowerCase()
        next[k + 'CertFile'] = f.certFile.trim()
        next[k + 'KeyFile'] = f.keyFile.trim()
      }
    }
    if (form.value.web.enabled && setLoopback.value) next.webListen = '127.0.0.1'
    const saved = await HttpUtils.post('api/save', { object: 'settings', action: 'set', data: JSON.stringify(next) })
    if (!saved.success) return
    // 3. Restart so the listeners switch between TLS and plain HTTP.
    const panelChanged = (next.webNginx === 'true') !== savedWebNginx.value || next.webNginx === 'true'
    let url = ''
    if (next.webNginx === 'true') {
      url = panelURL({ domain: next.webDomain, port: '', path: next.webPath, tls: true, behindNginx: true, fallbackHost: window.location.hostname, page: 'domains' })
    }
    emit('restart', { url, panelChanged })
  } finally {
    applying.value = false
  }
}
</script>
