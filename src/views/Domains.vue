<!-- Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus. -->
<template>
  <div class="sui-domains-page">
    <CertIssueModal
      :visible="issueOpen"
      :acmeEmail="settings.acmeEmail ?? ''"
      :nginx="nginx"
      :proxiedDomains="proxiedDomains"
      @close="issueOpen = false"
      @issued="loadCerts"
    />
    <CertManualModal
      :visible="manual.visible"
      :cert="manual.cert"
      @close="manual.visible = false"
      @saved="loadCerts"
    />
    <CertApplyModal
      :visible="apply.visible"
      :cert="apply.cert"
      :settings="settings"
      @close="apply.visible = false"
      @applied="onApplied"
      @restart="restartPanel('')"
    />

    <v-dialog v-model="renew.visible" max-width="460" :persistent="renew.busy">
      <v-card>
        <div class="sui-modal-header">
          <div class="d-flex align-center ga-2 min-width-0">
            <v-avatar color="primary" variant="tonal" size="34" rounded="md">
              <v-icon icon="mdi-autorenew" size="18" />
            </v-avatar>
            <div class="min-width-0">
              <div class="text-subtitle-1 font-weight-semibold text-truncate">
                {{ $t('cert.renew') }}
              </div>
              <div v-if="renew.cert?.domain" class="sui-mono text-caption text-medium-emphasis text-truncate" dir="ltr">
                {{ renew.cert.domain }}
              </div>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="renew.busy"
            :aria-label="$t('actions.close')"
            @click="renew.visible = false"
          />
        </div>
        <v-divider />
        <div class="sui-modal-body">
          <p class="text-body-2 text-medium-emphasis mb-3">{{ $t('cert.renewHint') }}</p>
          <v-switch
            v-model="renew.force"
            color="warning"
            :label="$t('cert.force')"
            :disabled="renew.busy"
            hide-details
          />
          <v-alert v-if="renew.force" type="warning" variant="outlined" density="compact" class="mt-3">
            {{ $t('cert.forceHint') }}
          </v-alert>
          <v-progress-linear v-if="renew.busy" indeterminate color="primary" class="mt-4" />
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn variant="text" :disabled="renew.busy" @click="renew.visible = false">
            {{ $t('actions.close') }}
          </v-btn>
          <v-btn color="primary" variant="flat" :loading="renew.busy" @click="doRenew">
            {{ $t('cert.renew') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="del.visible"
      :title="del.cert?.managed ? $t('cert.deleteTitle') : $t('cert.removeTitle')"
      :confirm-text="$t('actions.del')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="error"
      icon="mdi-delete-alert-outline"
      :loading="del.busy"
      @confirm="doDelete"
    >
      <template v-if="del.cert?.managed">
        <p class="mb-2">{{ $t('cert.deleteConfirm', { domain: del.cert?.domain }) }}</p>
        <v-alert type="warning" variant="outlined" density="compact">
          {{ $t('cert.deleteTlsHint') }}
        </v-alert>
      </template>
      <p v-else class="mb-0">{{ $t('cert.removeConfirm', { domain: del.cert?.domain }) }}</p>
    </ConfirmDialog>

    <v-overlay :model-value="restarting" persistent class="align-center justify-center">
      <v-card class="pa-6 text-center sui-restart-card">
        <v-progress-circular indeterminate color="primary" size="36" class="mb-3" />
        <div class="text-subtitle-1 font-weight-semibold">{{ $t('cert.restarting') }}</div>
        <div dir="ltr" class="sui-mono text-caption text-medium-emphasis mt-1">{{ restartTarget }}</div>
      </v-card>
    </v-overlay>

    <PageHeader :title="$t('pages.domains')" :count="certs.length">
      <template #actions>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="statusLoading || certsLoading"
          @click="refreshAll"
        >
          {{ $t('node.refresh') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-file-certificate-outline"
          @click="openManual(null)"
        >
          {{ $t('cert.register') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-certificate-outline"
          :disabled="!acme.supported"
          @click="issueOpen = true"
        >
          {{ $t('cert.issue') }}
        </v-btn>
      </template>
    </PageHeader>

    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card class="sui-resource-card fill-height d-flex flex-column" :loading="statusLoading">
          <div class="sui-env-card__head">
            <div class="d-flex align-center ga-3 min-width-0">
              <v-avatar :color="acme.installed ? 'primary' : 'secondary'" variant="tonal" size="36" rounded="md">
                <v-icon icon="mdi-certificate-outline" size="20" />
              </v-avatar>
              <div class="min-width-0">
                <div class="text-subtitle-1 font-weight-semibold sui-mono">acme.sh</div>
                <div v-if="acme.version" class="text-caption text-medium-emphasis sui-mono" dir="ltr">
                  {{ acme.version }}
                </div>
              </div>
            </div>
            <v-chip size="small" variant="flat" :color="acme.installed ? 'success' : 'grey'">
              {{ acme.installed ? $t('cert.installedYes') : $t('cert.installedNo') }}
            </v-chip>
          </div>

          <v-divider />

          <v-card-text class="flex-grow-1">
            <v-alert
              v-if="!acme.supported && statusLoaded"
              type="info"
              variant="outlined"
              density="compact"
              class="mb-3"
            >
              {{ $t('cert.linuxOnly') }}
            </v-alert>
            <dl class="sui-kv-list">
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.status') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip size="x-small" variant="outlined" :color="acme.installed ? 'success' : 'grey'">
                    {{ acme.installed ? $t('cert.installedYes') : $t('cert.installedNo') }}
                  </v-chip>
                </dd>
              </div>
              <div v-if="acme.version" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.version') }}</dt>
                <dd class="sui-kv-value sui-mono" dir="ltr">{{ acme.version }}</dd>
              </div>
              <div v-if="acme.certDir" class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.certDir') }}</dt>
                <dd class="sui-kv-value sui-mono text-caption" dir="ltr">{{ acme.certDir }}</dd>
              </div>
            </dl>
            <v-alert
              v-if="acme.supported && !acme.root"
              type="warning"
              variant="outlined"
              density="compact"
              class="mt-3"
            >
              {{ $t('cert.notRoot') }}
            </v-alert>
          </v-card-text>

          <template v-if="acme.supported && !acme.installed">
            <v-divider />
            <v-card-actions class="px-4 py-2">
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-download-outline"
                :loading="installing"
                @click="installAcme"
              >
                {{ $t('cert.installAcme') }}
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="sui-resource-card fill-height d-flex flex-column" :loading="statusLoading">
          <div class="sui-env-card__head">
            <div class="d-flex align-center ga-3 min-width-0">
              <v-avatar :color="nginx.active ? 'success' : 'secondary'" variant="tonal" size="36" rounded="md">
                <v-icon icon="mdi-server-network" size="20" />
              </v-avatar>
              <div class="text-subtitle-1 font-weight-semibold sui-mono">nginx</div>
            </div>
            <v-chip size="small" variant="flat" :color="nginx.active ? 'success' : 'grey'">
              {{ nginx.active ? $t('cert.runningYes') : $t('cert.runningNo') }}
            </v-chip>
          </div>

          <v-divider />

          <v-card-text class="flex-grow-1">
            <dl class="sui-kv-list">
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.status') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip size="x-small" variant="outlined" :color="nginx.installed ? 'success' : 'grey'">
                    {{ nginx.installed ? $t('cert.installedYes') : $t('cert.installedNo') }}
                  </v-chip>
                </dd>
              </div>
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.service') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip size="x-small" variant="outlined" :color="nginx.active ? 'success' : 'grey'">
                    {{ nginx.active ? $t('cert.runningYes') : $t('cert.runningNo') }}
                  </v-chip>
                </dd>
              </div>
              <div class="sui-kv-row">
                <dt class="sui-kv-label">{{ $t('cert.port80') }}</dt>
                <dd class="sui-kv-value">
                  <v-chip size="x-small" variant="outlined" :color="nginx.port80Busy ? 'warning' : 'success'">
                    {{ nginx.port80Busy ? $t('cert.port80Busy') : $t('cert.port80Free') }}
                  </v-chip>
                </dd>
              </div>
            </dl>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Certificates list: desktop card + table (and empty state) -->
    <v-card
      :loading="certsLoading"
      class="mb-4"
      :class="{ 'd-none d-md-block': certs.length > 0 }"
    >
      <div class="sui-cert-section__head">
        <div class="d-flex align-center ga-2">
          <span class="text-subtitle-1 font-weight-semibold">{{ $t('cert.listTitle') }}</span>
          <v-chip size="x-small" variant="outlined" color="secondary" class="sui-num">
            {{ certs.length }}
          </v-chip>
        </div>
      </div>

      <v-divider />

      <v-card-text v-if="!certsLoading && certs.length === 0" class="pa-4">
        <EmptyState
          icon="mdi-certificate-outline"
          :title="$t('cert.empty')"
          :description="$t('cert.emptyDesc')"
        >
          <template #action>
            <div class="d-flex flex-wrap justify-center ga-2">
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-certificate-outline"
                :disabled="!acme.supported"
                @click="issueOpen = true"
              >
                {{ $t('cert.issue') }}
              </v-btn>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-file-certificate-outline"
                @click="openManual(null)"
              >
                {{ $t('cert.register') }}
              </v-btn>
            </div>
          </template>
        </EmptyState>
      </v-card-text>

      <div v-else class="sui-table-wrap">
        <v-table density="comfortable" class="sui-cert-table">
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
              <td dir="ltr" class="py-3">
                <div class="sui-mono font-weight-semibold">{{ c.domain }}</div>
                <div class="sui-mono text-caption text-medium-emphasis sui-cert-path">{{ c.certFile }}</div>
              </td>
              <td>
                <v-chip
                  size="small"
                  variant="flat"
                  :color="certStatusColor(statusOf(c))"
                  :prepend-icon="certStatusIcon(statusOf(c))"
                >
                  {{ statusText(c) }}
                </v-chip>
              </td>
              <td class="sui-mono sui-num text-no-wrap" dir="ltr">{{ fmtDate(c.notAfter) }}</td>
              <td class="sui-mono sui-num text-no-wrap text-medium-emphasis" dir="ltr">
                {{ c.managed ? fmtDate(c.nextRenew) : '-' }}
              </td>
              <td>
                <v-chip size="small" variant="outlined" :color="c.managed ? 'primary' : 'secondary'">
                  {{ c.managed ? 'acme.sh' : $t('cert.manual') }}
                </v-chip>
                <div v-if="c.ca || c.keyType" class="text-caption text-medium-emphasis mt-1">
                  {{ [c.ca, c.keyType].filter(Boolean).join(' · ') }}
                </div>
              </td>
              <td>
                <div v-if="(c.usedBy ?? []).length > 0" class="d-flex flex-wrap ga-1">
                  <v-chip
                    v-for="u in c.usedBy"
                    :key="u"
                    size="small"
                    variant="outlined"
                    color="info"
                  >
                    {{ $t(u === 'sub' ? 'cert.targetSub' : 'cert.targetWeb') }}
                  </v-chip>
                </div>
                <span v-else class="text-medium-emphasis">-</span>
              </td>
              <td class="text-end text-no-wrap">
                <v-btn
                  icon="mdi-check-decagram-outline"
                  variant="text"
                  size="small"
                  color="primary"
                  :disabled="c.notAfter === 0"
                  :aria-label="$t('cert.apply')"
                  @click="openApply(c)"
                >
                  <v-icon icon="mdi-check-decagram-outline" />
                  <v-tooltip activator="parent" location="top" :text="$t('cert.apply')" />
                </v-btn>
                <v-btn
                  v-if="c.managed && !c.domain.startsWith('*.')"
                  icon="mdi-autorenew"
                  variant="text"
                  size="small"
                  :disabled="!acme.supported"
                  :aria-label="$t('cert.renew')"
                  @click="openRenew(c)"
                >
                  <v-icon icon="mdi-autorenew" />
                  <v-tooltip activator="parent" location="top" :text="$t('cert.renew')" />
                </v-btn>
                <v-btn
                  v-if="!c.managed"
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  :aria-label="$t('cert.editPaths')"
                  @click="openManual(c)"
                >
                  <v-icon icon="mdi-pencil-outline" />
                  <v-tooltip activator="parent" location="top" :text="$t('cert.editPaths')" />
                </v-btn>
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="small"
                  :aria-label="$t('cert.copyPaths')"
                  @click="copyPaths(c)"
                >
                  <v-icon icon="mdi-content-copy" />
                  <v-tooltip activator="parent" location="top" :text="$t('cert.copyPaths')" />
                </v-btn>
                <span class="d-inline-block">
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    size="small"
                    color="error"
                    :disabled="!canDelete(c)"
                    :aria-label="$t('actions.del')"
                    @click="openDelete(c)"
                  >
                    <v-icon icon="mdi-delete-outline" />
                  </v-btn>
                  <v-tooltip activator="parent" location="top" :text="canDelete(c) ? $t('actions.del') : $t('cert.inUse')" />
                </span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <!-- Mobile certificate cards (top-level depth 1 to avoid nested cards) -->
    <section v-if="certs.length > 0" class="d-md-none mb-4">
      <div class="sui-section-header">
        <span>{{ $t('cert.listTitle') }}</span>
        <v-chip size="x-small" variant="outlined" color="secondary" class="sui-num">
          {{ certs.length }}
        </v-chip>
      </div>
      <v-row>
        <v-col v-for="c in certs" :key="c.domain" cols="12">
          <v-card class="sui-resource-card">
            <div class="sui-env-card__head">
              <div class="min-width-0">
                <div class="sui-mono font-weight-semibold text-truncate" dir="ltr">{{ c.domain }}</div>
                <div class="sui-mono text-caption text-medium-emphasis sui-cert-path mt-1" dir="ltr">
                  {{ c.certFile }}
                </div>
              </div>
              <v-chip
                size="small"
                variant="flat"
                :color="certStatusColor(statusOf(c))"
                :prepend-icon="certStatusIcon(statusOf(c))"
                class="flex-shrink-0"
              >
                {{ statusText(c) }}
              </v-chip>
            </div>
            <v-divider />
            <v-card-text class="py-3">
              <dl class="sui-kv-list">
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('cert.source') }}</dt>
                  <dd class="sui-kv-value">
                    <span>{{ c.managed ? 'acme.sh' : $t('cert.manual') }}</span>
                    <span v-if="c.ca || c.keyType" class="text-caption text-medium-emphasis ms-1">
                      ({{ [c.ca, c.keyType].filter(Boolean).join(' · ') }})
                    </span>
                  </dd>
                </div>
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('cert.notAfter') }}</dt>
                  <dd class="sui-kv-value sui-mono sui-num" dir="ltr">{{ fmtDate(c.notAfter) }}</dd>
                </div>
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('cert.nextRenew') }}</dt>
                  <dd class="sui-kv-value sui-mono sui-num" dir="ltr">{{ c.managed ? fmtDate(c.nextRenew) : '-' }}</dd>
                </div>
                <div class="sui-kv-row">
                  <dt class="sui-kv-label">{{ $t('cert.usedBy') }}</dt>
                  <dd class="sui-kv-value">
                    <template v-if="(c.usedBy ?? []).length > 0">
                      <v-chip
                        v-for="u in c.usedBy"
                        :key="u"
                        size="x-small"
                        variant="outlined"
                        color="info"
                        class="ms-1"
                      >
                        {{ $t(u === 'sub' ? 'cert.targetSub' : 'cert.targetWeb') }}
                      </v-chip>
                    </template>
                    <span v-else class="text-medium-emphasis">-</span>
                  </dd>
                </div>
              </dl>
            </v-card-text>
            <v-divider />
            <v-card-actions class="px-3 py-2 flex-wrap ga-1">
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-check-decagram-outline"
                :disabled="c.notAfter === 0"
                @click="openApply(c)"
              >
                {{ $t('cert.apply') }}
              </v-btn>
              <v-btn
                v-if="c.managed && !c.domain.startsWith('*.')"
                variant="outlined"
                color="secondary"
                size="small"
                prepend-icon="mdi-autorenew"
                :disabled="!acme.supported"
                @click="openRenew(c)"
              >
                {{ $t('cert.renew') }}
              </v-btn>
              <v-spacer />
              <v-btn
                v-if="!c.managed"
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                :aria-label="$t('cert.editPaths')"
                @click="openManual(c)"
              />
              <v-btn
                icon="mdi-content-copy"
                variant="text"
                size="small"
                :aria-label="$t('cert.copyPaths')"
                @click="copyPaths(c)"
              />
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                color="error"
                :disabled="!canDelete(c)"
                :aria-label="$t('actions.del')"
                @click="openDelete(c)"
              />
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <div class="sui-nginx-wrapper">
      <NginxProxy
        :settings="settings"
        :certs="certs"
        :supported="acme.supported"
        :nginx="nginx"
        @restart="p => restartPanel(p.url)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { push } from 'notivue'
import { i18n, locale } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { writeClipboard } from '@/plugins/clipboard'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CertIssueModal from '@/layouts/modals/CertIssue.vue'
import CertManualModal from '@/layouts/modals/CertManual.vue'
import CertApplyModal from '@/layouts/modals/CertApply.vue'
import NginxProxy from '@/components/NginxProxy.vue'
import {
  canDelete, certStatusColor, certStatusOf, daysLeft, panelURL,
  type AcmeStatus, type CertInfo, type CertStatus, type NginxStatus,
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
const certStatusIcon = (s: CertStatus): string => {
  switch (s) {
    case 'valid': return 'mdi-check-circle-outline'
    case 'expiring': return 'mdi-clock-alert-outline'
    case 'expired': return 'mdi-alert-circle-outline'
    default: return 'mdi-help-circle-outline'
  }
}
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

const refreshAll = async () => {
  await Promise.all([loadStatus(), loadCerts()])
}

onMounted(async () => {
  await refreshAll()
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

<style scoped>
.min-width-0 {
  min-width: 0;
}

.sui-env-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.sui-cert-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.sui-cert-table th {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
}

.sui-cert-path {
  overflow-wrap: anywhere;
}

.sui-restart-card {
  max-width: 420px;
}

/* Harmonize legacy NginxProxy card shell (elevation-5 / rounded-xl) with flat hairline system */
.sui-nginx-wrapper :deep(> .v-card) {
  box-shadow: none !important;
  border-radius: var(--sui-radius-md) !important;
  border: 1px solid var(--sui-hairline) !important;
}
</style>
