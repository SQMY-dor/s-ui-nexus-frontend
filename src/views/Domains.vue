<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <CertIssueModal :visible="issueOpen" :acmeEmail="settings.acmeEmail ?? ''" :nginx="nginx" :proxiedDomains="proxiedDomains"
    @close="issueOpen = false" @issued="loadCerts" />
  <CertManualModal :visible="manual.visible" :cert="manual.cert" @close="manual.visible = false" @saved="loadCerts" />
  <CertApplyModal :visible="apply.visible" :cert="apply.cert" :settings="settings" @close="apply.visible = false"
    @applied="onApplied" @restart="restartPanel('')" />

  <v-dialog v-model="renew.visible" width="460" :persistent="renew.busy">
    <v-card class="rounded-lg">
      <v-card-title>{{ $t('cert.renew') }} {{ renew.cert?.domain }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <div>{{ $t('cert.renewHint') }}</div>
        <v-switch color="warning" v-model="renew.force" :label="$t('cert.force')" :disabled="renew.busy" hide-details />
        <v-alert v-if="renew.force" type="warning" variant="tonal" density="compact">{{ $t('cert.forceHint') }}</v-alert>
        <v-progress-linear v-if="renew.busy" indeterminate color="primary" class="mt-3" />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" :disabled="renew.busy" @click="renew.visible = false">{{ $t('actions.close') }}</v-btn>
        <v-btn color="primary" variant="tonal" :loading="renew.busy" @click="doRenew">{{ $t('cert.renew') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="del.visible" width="460">
    <v-card class="rounded-lg">
      <v-card-title>{{ del.cert?.managed ? $t('cert.deleteTitle') : $t('cert.removeTitle') }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <template v-if="del.cert?.managed">
          <p>{{ $t('cert.deleteConfirm', { domain: del.cert?.domain }) }}</p>
          <p class="mt-2 text-medium-emphasis">{{ $t('cert.deleteTlsHint') }}</p>
        </template>
        <p v-else>{{ $t('cert.removeConfirm', { domain: del.cert?.domain }) }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="success" variant="outlined" @click="del.visible = false">{{ $t('no') }}</v-btn>
        <v-btn color="error" variant="tonal" :loading="del.busy" @click="doDelete">{{ $t('yes') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-overlay :model-value="restarting" persistent class="align-center justify-center">
    <v-card class="pa-6 text-center" rounded="lg">
      <v-progress-circular indeterminate color="primary" class="mb-3" />
      <div>{{ $t('cert.restarting') }}</div>
      <div dir="ltr" class="text-caption mt-1">{{ restartTarget }}</div>
    </v-card>
  </v-overlay>

  <v-row>
    <v-col cols="12" md="6">
      <v-card rounded="xl" elevation="5" :loading="statusLoading">
        <v-card-title>acme.sh</v-card-title>
        <v-card-text>
          <v-alert v-if="!acme.supported && statusLoaded" type="info" variant="tonal" density="compact" class="mb-3">{{ $t('cert.linuxOnly') }}</v-alert>
          <v-row>
            <v-col>{{ $t('cert.acmeInstalled') }}</v-col>
            <v-col>
              <v-chip size="small" variant="flat" :color="acme.installed ? 'success' : 'grey'">{{ acme.installed ? $t('yes') : $t('no') }}</v-chip>
            </v-col>
          </v-row>
          <v-row v-if="acme.version">
            <v-col>{{ $t('cert.version') }}</v-col>
            <v-col dir="ltr">{{ acme.version }}</v-col>
          </v-row>
          <v-row v-if="acme.certDir">
            <v-col>{{ $t('cert.certDir') }}</v-col>
            <v-col dir="ltr" style="word-break: break-all;">{{ acme.certDir }}</v-col>
          </v-row>
          <v-row v-if="acme.supported && !acme.root">
            <v-col cols="12" class="text-warning">{{ $t('cert.notRoot') }}</v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="acme.supported && !acme.installed" variant="tonal" color="primary" :loading="installing" @click="installAcme">{{ $t('cert.installAcme') }}</v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" prepend-icon="mdi-refresh" :loading="statusLoading" @click="loadStatus">{{ $t('node.refresh') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card rounded="xl" elevation="5" :loading="statusLoading" class="fill-height">
        <v-card-title>nginx</v-card-title>
        <v-card-text>
          <v-row>
            <v-col>{{ $t('cert.nginxInstalled') }}</v-col>
            <v-col><v-chip size="small" variant="flat" :color="nginx.installed ? 'success' : 'grey'">{{ nginx.installed ? $t('yes') : $t('no') }}</v-chip></v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('cert.nginxActive') }}</v-col>
            <v-col><v-chip size="small" variant="flat" :color="nginx.active ? 'success' : 'grey'">{{ nginx.active ? $t('yes') : $t('no') }}</v-chip></v-col>
          </v-row>
          <v-row>
            <v-col>{{ $t('cert.port80') }}</v-col>
            <v-col><v-chip size="small" variant="flat" :color="nginx.port80Busy ? 'warning' : 'success'">{{ nginx.port80Busy ? $t('cert.port80Busy') : $t('cert.port80Free') }}</v-chip></v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <v-row>
    <v-col cols="12" justify="center" align="center">
      <v-btn color="primary" class="ma-1" prepend-icon="mdi-certificate" :disabled="!acme.supported" @click="issueOpen = true">{{ $t('cert.issue') }}</v-btn>
      <v-btn color="primary" variant="tonal" class="ma-1" prepend-icon="mdi-file-certificate-outline" @click="openManual(null)">{{ $t('cert.register') }}</v-btn>
    </v-col>
  </v-row>

  <v-card rounded="xl" elevation="5" :loading="certsLoading">
    <v-card-title>{{ $t('cert.listTitle') }}</v-card-title>
    <v-card-text>
      <div v-if="!certsLoading && certs.length === 0" class="text-center text-medium-emphasis pa-4">
        <div class="text-subtitle-1">{{ $t('cert.empty') }}</div>
        <div>{{ $t('cert.emptyDesc') }}</div>
      </div>
      <v-table v-else density="comfortable">
        <thead>
          <tr>
            <th>{{ $t('cert.domain') }}</th>
            <th>{{ $t('cert.status') }}</th>
            <th>{{ $t('cert.notAfter') }}</th>
            <th>{{ $t('cert.nextRenew') }}</th>
            <th>{{ $t('cert.source') }}</th>
            <th>{{ $t('cert.usedBy') }}</th>
            <th class="text-end">{{ $t('actions.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in certs" :key="c.domain">
            <td dir="ltr">
              <div class="font-weight-medium">{{ c.domain }}</div>
              <div class="text-caption text-medium-emphasis" style="word-break: break-all;">{{ c.certFile }}</div>
            </td>
            <td>
              <v-chip size="small" variant="flat" :color="certStatusColor(statusOf(c))">{{ statusText(c) }}</v-chip>
            </td>
            <td>{{ fmtDate(c.notAfter) }}</td>
            <td>{{ c.managed ? fmtDate(c.nextRenew) : '-' }}</td>
            <td>
              <v-chip size="small" variant="tonal" :color="c.managed ? 'primary' : ''">{{ c.managed ? 'acme.sh' : $t('cert.manual') }}</v-chip>
              <div v-if="c.ca || c.keyType" class="text-caption text-medium-emphasis">{{ [c.ca, c.keyType].filter(Boolean).join(' · ') }}</div>
            </td>
            <td>
              <template v-if="(c.usedBy ?? []).length > 0">
                <v-chip v-for="u in c.usedBy" :key="u" size="small" variant="tonal" color="info" class="me-1">{{ $t(u === 'sub' ? 'cert.targetSub' : 'cert.targetWeb') }}</v-chip>
              </template>
              <template v-else>-</template>
            </td>
            <td class="text-end" style="white-space: nowrap;">
              <v-btn icon="mdi-check-decagram" variant="text" size="small" :disabled="c.notAfter === 0" @click="openApply(c)">
                <v-icon />
                <v-tooltip activator="parent" location="top" :text="$t('cert.apply')"></v-tooltip>
              </v-btn>
              <v-btn v-if="c.managed && !c.domain.startsWith('*.')" icon="mdi-autorenew" variant="text" size="small" :disabled="!acme.supported" @click="openRenew(c)">
                <v-icon />
                <v-tooltip activator="parent" location="top" :text="$t('cert.renew')"></v-tooltip>
              </v-btn>
              <v-btn v-if="!c.managed" icon="mdi-file-edit" variant="text" size="small" @click="openManual(c)">
                <v-icon />
                <v-tooltip activator="parent" location="top" :text="$t('cert.editPaths')"></v-tooltip>
              </v-btn>
              <v-btn icon="mdi-content-copy" variant="text" size="small" @click="copyPaths(c)">
                <v-icon />
                <v-tooltip activator="parent" location="top" :text="$t('cert.copyPaths')"></v-tooltip>
              </v-btn>
              <span class="d-inline-block">
                <v-btn icon="mdi-delete" variant="text" size="small" color="error" :disabled="!canDelete(c)" @click="openDelete(c)">
                  <v-icon />
                </v-btn>
                <v-tooltip activator="parent" location="top" :text="canDelete(c) ? $t('actions.del') : $t('cert.inUse')"></v-tooltip>
              </span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>

  <NginxProxy :settings="settings" :certs="certs" :supported="acme.supported" :nginx="nginx" @restart="p => restartPanel(p.url)" />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { push } from 'notivue'
import { i18n, locale } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { writeClipboard } from '@/plugins/clipboard'
import CertIssueModal from '@/layouts/modals/CertIssue.vue'
import CertManualModal from '@/layouts/modals/CertManual.vue'
import CertApplyModal from '@/layouts/modals/CertApply.vue'
import NginxProxy from '@/components/NginxProxy.vue'
import {
  canDelete, certStatusColor, certStatusOf, daysLeft, panelURL,
  type AcmeStatus, type CertInfo, type NginxStatus,
} from '@/plugins/certs'

const acme = ref<AcmeStatus>({ supported: true, installed: false, path: '', version: '', certDir: '', root: false })
const nginx = ref<NginxStatus>({ installed: false, active: false, port80Busy: false })
const certs = ref<CertInfo[]>([])
const settings = ref<Record<string, string>>({})
const statusLoading = ref(false)
const statusLoaded = ref(false)
const certsLoading = ref(false)
const installing = ref(false)

const nowSec = () => Math.floor(Date.now() / 1000)
const statusOf = (c: CertInfo) => certStatusOf(c, nowSec())
const statusText = (c: CertInfo): string => {
  const s = statusOf(c)
  if (s === 'expiring') return i18n.global.t('cert.statusExpiring', { days: Math.max(0, daysLeft(c.notAfter, nowSec())) })
  return i18n.global.t('cert.status_' + s)
}
const fmtDate = (unix: number): string => {
  if (!unix) return '-'
  try {
    return new Date(unix * 1000).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return new Date(unix * 1000).toLocaleDateString()
  }
}

// Domains nginx terminates TLS for (saved settings), for issueCert behindProxy.
const proxiedDomains = computed((): string[] => {
  const out: string[] = []
  if (settings.value.webNginx === 'true' && settings.value.webDomain) out.push(settings.value.webDomain)
  if (settings.value.subNginx === 'true' && settings.value.subDomain) out.push(settings.value.subDomain)
  return out
})

const loadStatus = async () => {
  statusLoading.value = true
  const [a, n] = await Promise.all([HttpUtils.get('api/acmeStatus'), HttpUtils.get('api/detectNginx')])
  if (a.success && a.obj) acme.value = a.obj
  if (n.success && n.obj) nginx.value = n.obj
  statusLoading.value = false
  statusLoaded.value = true
}

const loadCerts = async () => {
  certsLoading.value = true
  const msg = await HttpUtils.get('api/certs')
  certsLoading.value = false
  if (msg.success) certs.value = Array.isArray(msg.obj) ? msg.obj : []
  await loadSettings()
}

const loadSettings = async () => {
  const msg = await HttpUtils.get('api/settings')
  if (msg.success && msg.obj) settings.value = msg.obj
}

onMounted(async () => {
  await Promise.all([loadStatus(), loadCerts()])
})

const installAcme = async () => {
  installing.value = true
  const msg = await HttpUtils.post('api/installAcme', {}, { timeout: 10 * 60 * 1000 })
  installing.value = false
  if (msg.success && msg.obj) {
    acme.value = msg.obj
    push.success({ title: i18n.global.t('success'), duration: 5000, message: i18n.global.t('cert.acmeInstalledOk') })
  }
}

const issueOpen = ref(false)

const manual = ref<{ visible: boolean, cert: CertInfo | null }>({ visible: false, cert: null })
const openManual = (c: CertInfo | null) => { manual.value = { visible: true, cert: c } }

const apply = ref<{ visible: boolean, cert: CertInfo | null }>({ visible: false, cert: null })
const openApply = (c: CertInfo) => { apply.value = { visible: true, cert: c } }
const onApplied = async () => { await loadCerts() }

const renew = ref<{ visible: boolean, cert: CertInfo | null, force: boolean, busy: boolean }>({ visible: false, cert: null, force: false, busy: false })
const openRenew = (c: CertInfo) => { renew.value = { visible: true, cert: c, force: false, busy: false } }
const doRenew = async () => {
  if (!renew.value.cert) return
  renew.value.busy = true
  const msg = await HttpUtils.post('api/renewCert', { domain: renew.value.cert.domain, force: renew.value.force ? 'true' : 'false' }, { timeout: 10 * 60 * 1000 })
  renew.value.busy = false
  if (msg.success) {
    push.success({
      title: i18n.global.t('success'),
      duration: 6000,
      message: msg.obj?.renewed ? i18n.global.t('cert.renewed') : i18n.global.t('cert.notDue'),
    })
    renew.value.visible = false
  }
  await loadCerts()
}

const del = ref<{ visible: boolean, cert: CertInfo | null, busy: boolean }>({ visible: false, cert: null, busy: false })
const openDelete = (c: CertInfo) => {
  if (!canDelete(c)) return
  del.value = { visible: true, cert: c, busy: false }
}
const doDelete = async () => {
  if (!del.value.cert) return
  del.value.busy = true
  const msg = await HttpUtils.post('api/deleteCert', { domain: del.value.cert.domain })
  del.value.busy = false
  if (msg.success) del.value.visible = false
  await loadCerts()
}

const copyPaths = async (c: CertInfo) => {
  const ok = await writeClipboard(c.certFile + '\n' + c.keyFile)
  if (ok) push.success({ message: i18n.global.t('success') + ': ' + i18n.global.t('copyToClipboard') })
}

// ---------- restart ----------
const restarting = ref(false)
const restartTarget = ref('')
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const restartPanel = async (url: string) => {
  apply.value.visible = false
  // Settings were saved by applyCert / save; re-read them to know where the
  // panel will listen after the restart.
  await loadSettings()
  const s = settings.value
  if (!url) {
    const behindNginx = s.webNginx === 'true'
    url = panelURL({
      domain: s.webDomain ?? '',
      port: s.webPort ?? '',
      path: s.webPath ?? '/',
      tls: behindNginx || ((s.webCertFile ?? '') !== '' && (s.webKeyFile ?? '') !== ''),
      behindNginx,
      fallbackHost: window.location.hostname,
      page: 'domains',
    })
  }
  restartTarget.value = url
  restarting.value = true
  const msg = await HttpUtils.post('api/restartApp', {})
  if (!msg.success) {
    restarting.value = false
    return
  }
  await sleep(4000)
  window.location.replace(url)
}
</script>
