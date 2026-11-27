<template>
  <div class="sui-settings">
    <ConfirmDialog
      v-model="restartConfirm"
      :title="$t('ui.restartConfirmTitle')"
      :message="$t('ui.restartConfirmMsg')"
      :confirm-text="$t('actions.restartApp')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="warning"
      icon="mdi-restart"
      :loading="loading"
      @confirm="confirmRestartApp"
    />

    <v-card class="mb-4" :loading="loading">
      <div class="sui-settings-toolbar">
        <v-tabs v-model="tab" color="primary" density="comfortable" show-arrows class="sui-settings-subtabs">
          <v-tab value="t1" prepend-icon="mdi-tune-variant">{{ $t('setting.interface') }}</v-tab>
          <v-tab value="t2" prepend-icon="mdi-rss">{{ $t('setting.sub') }}</v-tab>
          <v-tab value="t3" prepend-icon="mdi-code-json">{{ $t('setting.jsonSub') }}</v-tab>
          <v-tab value="t4" prepend-icon="mdi-file-code-outline">{{ $t('setting.clashSub') }}</v-tab>
          <v-tab value="t5" prepend-icon="mdi-shield-key-outline">{{ $t('security.title') }}</v-tab>
        </v-tabs>

        <div class="sui-settings-actions">
          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-undo"
            :disabled="!stateChange || loading"
            @click="resetChanges"
          >
            {{ $t('reset') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-content-save-outline"
            :loading="loading"
            :disabled="!stateChange"
            @click="save"
          >
            {{ $t('actions.save') }}
          </v-btn>
          <v-btn
            variant="outlined"
            color="warning"
            size="small"
            prepend-icon="mdi-restart"
            :loading="loading"
            :disabled="stateChange"
            @click="restartConfirm = true"
          >
            {{ $t('actions.restartApp') }}
          </v-btn>
        </div>
      </div>
    </v-card>

    <v-window v-model="tab" :touch="false">
      <!-- Interface -->
      <v-window-item value="t1">
        <div class="d-flex flex-column ga-4">
          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('setting.interface') }}</span>
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.webListen"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.addr')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="webPort"
                  min="1"
                  type="number"
                  dir="ltr"
                  class="sui-num"
                  :label="$t('setting.port')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.webPath"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.webPath')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.webURI"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.webUri')"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card>

          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('objects.tls') }}</span>
            </div>
            <v-alert
              v-if="settings.webNginx == 'true'"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              {{ $t('cert.settingsNginxNote', { side: $t('cert.targetWeb') }) }}
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.webDomain"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.domain')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.acmeEmail"
                  dir="ltr"
                  :label="$t('cert.email')"
                  placeholder="you@example.com"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.webCertFile"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.sslCert')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.webKeyFile"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.sslKey')"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card>

          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('pages.basics') }}</span>
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="sessionMaxAge"
                  type="number"
                  min="0"
                  dir="ltr"
                  class="sui-num"
                  :label="$t('setting.sessionAge')"
                  :suffix="$t('date.m')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="trafficAge"
                  type="number"
                  min="0"
                  dir="ltr"
                  class="sui-num"
                  :label="$t('setting.trafficAge')"
                  :suffix="$t('date.d')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.timeLocation"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.timeLoc')"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-window-item>

      <!-- Subscription -->
      <v-window-item value="t2">
        <div class="d-flex flex-column ga-4">
          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('setting.sub') }}</span>
            </div>
            <v-row>
              <v-col cols="12" sm="6">
                <v-switch v-model="subEncode" color="primary" :label="$t('setting.subEncode')" hide-details />
              </v-col>
              <v-col cols="12" sm="6">
                <v-switch v-model="subShowInfo" color="primary" :label="$t('setting.subInfo')" hide-details />
              </v-col>
            </v-row>

            <v-expand-transition>
              <div v-if="subShowInfo" class="sui-subinfo-box mt-4">
                <div class="sui-section-header">
                  <span>{{ $t('setting.subInfoFields') }}</span>
                </div>
                <v-row>
                  <v-col v-for="item in subInfoItems" :key="item.key" cols="12" sm="6" md="4">
                    <v-switch v-model="item.model.value" color="primary" :label="$t(item.labelKey)" hide-details />
                  </v-col>
                </v-row>
              </div>
            </v-expand-transition>
          </v-card>

          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('objects.listen') }}</span>
            </div>
            <v-alert
              v-if="settings.subNginx == 'true'"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              {{ $t('cert.settingsNginxNote', { side: $t('cert.targetSub') }) }}
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.subListen"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.addr')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="subPort"
                  type="number"
                  min="1"
                  dir="ltr"
                  class="sui-num"
                  :label="$t('setting.port')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.subDomain"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.domain')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.subPath"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.path')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.subURI"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.subUri')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="subUpdates"
                  type="number"
                  min="0"
                  dir="ltr"
                  class="sui-num"
                  :label="$t('setting.update')"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card>

          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('objects.tls') }}</span>
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.subCertFile"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.sslCert')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.subKeyFile"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.sslKey')"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-window-item>

      <!-- JSON Subscription -->
      <v-window-item value="t3">
        <v-card class="pa-4 pa-sm-5">
          <div class="sui-section-header">
            <span>{{ $t('setting.jsonSub') }}</span>
          </div>
          <div class="sui-embedded-ext">
            <SubJsonExtVue :settings="settings" />
          </div>
        </v-card>
      </v-window-item>

      <!-- Clash Subscription -->
      <v-window-item value="t4">
        <v-card class="pa-4 pa-sm-5">
          <div class="sui-section-header">
            <span>{{ $t('setting.clashSub') }}</span>
          </div>
          <div class="sui-embedded-ext">
            <SubClashExtVue :settings="settings" />
          </div>
        </v-card>
      </v-window-item>

      <!-- Login Security / Identity -->
      <v-window-item value="t5">
        <div class="d-flex flex-column ga-4">
          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('security.oidc') }}</span>
              <v-switch
                v-model="oidcEnabled"
                color="primary"
                :label="$t('setting.identity.enableOidc')"
                hide-details
              />
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.oidcIssuer"
                  dir="ltr"
                  :label="$t('setting.identity.oidcIssuer')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.oidcRedirectUrl"
                  dir="ltr"
                  :label="$t('setting.identity.oidcRedirect')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.oidcClientId"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.identity.oidcClientId')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.oidcClientSecret"
                  dir="ltr"
                  :type="showOidcSecret ? 'text' : 'password'"
                  :label="$t('setting.identity.oidcClientSecret')"
                  hide-details
                >
                  <template #append-inner>
                    <v-btn
                      type="button"
                      :icon="showOidcSecret ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                      variant="text"
                      width="28"
                      height="28"
                      :aria-label="showOidcSecret ? $t('ui.hidePassword') : $t('ui.showPassword')"
                      :aria-pressed="showOidcSecret"
                      @click="showOidcSecret = !showOidcSecret"
                    />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.oidcScopes"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.identity.oidcScopes')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.oidcUsernameClaim"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.identity.oidcUsernameClaim')"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="settings.oidcAllowedUsers"
                  dir="ltr"
                  :label="$t('setting.identity.oidcAllowedUsers')"
                  rows="2"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card>

          <v-card class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('security.passkeys') }}</span>
              <v-switch
                v-model="passkeyEnabled"
                color="primary"
                :label="$t('setting.identity.enablePasskeys')"
                hide-details
              />
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.passkeyRpId"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.identity.passkeyRpId')"
                  :hint="$t('setting.identity.passkeyOriginHint')"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="settings.passkeyOrigins"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.identity.passkeyOrigins')"
                  hint="https://panel.example.com"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts" setup>
import { i18n } from '@/locales'
import { Ref, computed, inject, onMounted, ref } from 'vue'
import HttpUtils from '@/plugins/httputil'
import { FindDiff } from '@/plugins/utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SubJsonExtVue from '@/components/SubJsonExt.vue'
import SubClashExtVue from '@/components/SubClashExt.vue'
import { push } from 'notivue'

const tab = ref('t1')
const loading: Ref = inject('loading') ?? ref(false)
const oldSettings = ref<Record<string, string>>({})
const showOidcSecret = ref(false)
const restartConfirm = ref(false)

const settings = ref({
  webListen: '',
  webDomain: '',
  webPort: '2095',
  webCertFile: '',
  webKeyFile: '',
  webPath: '/app/',
  webURI: '',
  sessionMaxAge: '0',
  trafficAge: '30',
  timeLocation: 'Asia/Tehran',
  subListen: '',
  subPort: '2096',
  subPath: '/sub/',
  subDomain: '',
  subCertFile: '',
  subKeyFile: '',
  subUpdates: '12',
  subEncode: 'true',
  subShowInfo: 'false',
  subInfoUpload: 'true',
  subInfoDownload: 'true',
  subInfoTotal: 'true',
  subInfoExpire: 'true',
  subInfoRemaining: 'true',
  oidcEnabled: 'false',
  oidcIssuer: '',
  oidcClientId: '',
  oidcClientSecret: '',
  oidcRedirectUrl: '',
  oidcScopes: 'openid profile email',
  oidcUsernameClaim: 'preferred_username',
  oidcAllowedUsers: '',
  passkeyEnabled: 'false',
  passkeyRpId: '',
  passkeyOrigins: '',
  subURI: '',
  subJsonExt: '',
  subClashExt: '',
  webNginx: 'false',
  subNginx: 'false',
  acmeEmail: '',
})

onMounted(async () => {
  loading.value = true
  await loadData()
  loading.value = false
})

const loadData = async () => {
  loading.value = true
  const msg = await HttpUtils.get('api/settings')
  loading.value = false
  if (msg.success) {
    setData(msg.obj)
  }
}

const setData = (data: any) => {
  settings.value = data
  oldSettings.value = { ...data }
}

const resetChanges = () => {
  if (Object.keys(oldSettings.value).length === 0) return
  settings.value = { ...oldSettings.value } as typeof settings.value
}

const save = async () => {
  loading.value = true
  const msg = await HttpUtils.post('api/save', { object: 'settings', action: 'set', data: JSON.stringify(settings.value) })
  if (msg.success) {
    push.success({
      title: i18n.global.t('success'),
      duration: 5000,
      message: i18n.global.t('actions.set') + ' ' + i18n.global.t('pages.settings'),
    })
    if (msg.obj?.settings) setData(msg.obj.settings)
    else await loadData()
  }
  loading.value = false
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const confirmRestartApp = async () => {
  restartConfirm.value = false
  await restartApp()
}

const restartApp = async () => {
  loading.value = true
  const msg = await HttpUtils.post('api/restartApp', {})
  if (msg.success) {
    let url = settings.value.webURI
    if (url !== '') {
      const isTLS = settings.value.webCertFile !== '' || settings.value.webKeyFile !== ''
      url = buildURL(settings.value.webDomain, settings.value.webPort.toString(), isTLS, settings.value.webPath)
    }
    await sleep(3000)
    window.location.replace(url)
  }
  loading.value = false
}

const buildURL = (host: string, port: string, isTLS: boolean, path: string) => {
  if (!host || host.length == 0) host = window.location.hostname
  if (!port || port.length == 0) port = window.location.port

  const protocol = isTLS ? 'https:' : 'http:'

  if (port === '' || (isTLS && port === '443') || (!isTLS && port === '80')) {
    port = ''
  } else {
    port = `:${port}`
  }

  return `${protocol}//${host}${port}${path}settings`
}

const subEncode = computed({
  get: () => settings.value.subEncode == 'true',
  set: (v: boolean) => { settings.value.subEncode = v ? 'true' : 'false' },
})

const subShowInfo = computed({
  get: () => settings.value.subShowInfo == 'true',
  set: (v: boolean) => { settings.value.subShowInfo = v ? 'true' : 'false' },
})

const boolSetting = (key: string) => computed({
  get: () => (settings.value as any)[key] == 'true',
  set: (value: boolean) => { (settings.value as any)[key] = value ? 'true' : 'false' },
})
const subInfoUpload = boolSetting('subInfoUpload')
const subInfoDownload = boolSetting('subInfoDownload')
const subInfoTotal = boolSetting('subInfoTotal')
const subInfoExpire = boolSetting('subInfoExpire')
const subInfoRemaining = boolSetting('subInfoRemaining')
const oidcEnabled = boolSetting('oidcEnabled')
const passkeyEnabled = boolSetting('passkeyEnabled')
const subInfoItems = [
  { key: 'upload', labelKey: 'setting.subInfoUpload', model: subInfoUpload },
  { key: 'download', labelKey: 'setting.subInfoDownload', model: subInfoDownload },
  { key: 'total', labelKey: 'setting.subInfoTotal', model: subInfoTotal },
  { key: 'expire', labelKey: 'setting.subInfoExpire', model: subInfoExpire },
  { key: 'remaining', labelKey: 'setting.subInfoRemaining', model: subInfoRemaining },
]

const webPort = computed({
  get: () => ((settings.value.webPort ?? '').length > 0 ? parseInt(settings.value.webPort) : 2095),
  set: (v: number) => { settings.value.webPort = v > 0 ? v.toString() : '2095' },
})

const sessionMaxAge = computed({
  get: () => ((settings.value.sessionMaxAge ?? '').length > 0 ? parseInt(settings.value.sessionMaxAge) : 0),
  set: (v: number) => { settings.value.sessionMaxAge = v > 0 ? v.toString() : '0' },
})

const trafficAge = computed({
  get: () => ((settings.value.trafficAge ?? '').length > 0 ? parseInt(settings.value.trafficAge) : 0),
  set: (v: number) => { settings.value.trafficAge = v > 0 ? v.toString() : '0' },
})

const subPort = computed({
  get: () => ((settings.value.subPort ?? '').length > 0 ? parseInt(settings.value.subPort) : 2096),
  set: (v: number) => { settings.value.subPort = v > 0 ? v.toString() : '2096' },
})

const subUpdates = computed({
  get: () => ((settings.value.subUpdates ?? '').length > 0 ? parseInt(settings.value.subUpdates) : 12),
  set: (v: number) => { settings.value.subUpdates = v > 0 ? v.toString() : '12' },
})

const stateChange = computed(() => {
  return !FindDiff.deepCompare(settings.value, oldSettings.value)
})
</script>

<style scoped>
.sui-settings-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 6px 12px;
}

.sui-settings-subtabs {
  flex: 1 1 auto;
  min-width: 0;
}

.sui-settings-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.sui-subinfo-box {
  padding: 14px 16px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background: rgb(var(--v-theme-surface-light));
}

/* Strip inner border/radius on legacy SubJsonExt / SubClashExt root cards to prevent double borders */
.sui-embedded-ext :deep(> .v-card) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
