<template>
  <div class="sui-config-view">
    <div class="sui-subview-bar mb-4">
      <div class="sui-subview-bar__title">
        {{ $t('pages.basics') }}
      </div>
      <div class="sui-subview-bar__actions">
        <v-btn
          :color="stateChange ? 'secondary' : 'primary'"
          :variant="stateChange ? 'outlined' : 'flat'"
          prepend-icon="mdi-content-save-outline"
          :loading="loading"
          :disabled="stateChange"
          @click="saveConfig"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </div>

    <!-- Logs section -->
    <v-card v-if="appConfig.log" class="mb-4">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <span>{{ $t('basic.log.title') }}</span>
          <v-chip
            size="x-small"
            :variant="appConfig.log.disabled ? 'tonal' : 'outlined'"
            :color="appConfig.log.disabled ? 'secondary' : 'primary'"
          >
            {{ $t(appConfig.log.disabled ? 'disable' : 'enable') }}
          </v-chip>
        </div>

        <v-row align="center">
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="appConfig.log.disabled"
              color="primary"
              :label="$t('disable')"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="appConfig.log.level"
              hide-details
              :label="$t('basic.log.level')"
              :items="levels"
              clearable
              @click:clear="delete appConfig.log.level"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="appConfig.log.output"
              hide-details
              dir="ltr"
              class="sui-mono-input"
              :label="$t('basic.log.output')"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-switch
              v-model="appConfig.log.timestamp"
              color="primary"
              :label="$t('basic.log.timestamp')"
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- NTP section -->
    <v-card class="mb-4">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <span>NTP</span>
          <v-switch
            v-model="enableNtp"
            color="primary"
            :label="$t('enable')"
            hide-details
            class="sui-header-switch"
          />
        </div>

        <template v-if="appConfig.ntp?.enabled">
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="appConfig.ntp.server"
                hide-details
                dir="ltr"
                class="sui-mono-input"
                :label="$t('out.addr')"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model.number="appConfig.ntp.server_port"
                hide-details
                type="number"
                clearable
                class="sui-num"
                :label="$t('out.port')"
                @click:clear="delete appConfig.ntp?.server_port"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model.number="ntpInterval"
                hide-details
                :suffix="$t('date.m')"
                min="0"
                type="number"
                class="sui-num"
                :label="$t('ruleset.interval')"
              />
            </v-col>
          </v-row>

          <div class="mt-4">
            <Dial :dial="appConfig.ntp" />
          </div>
        </template>
      </v-card-text>
    </v-card>

    <!-- Experimental section -->
    <v-card v-if="appConfig.experimental">
      <v-card-text class="pa-4 pa-sm-5">
        <div class="sui-section-header">
          <span>Experimental</span>
        </div>

        <!-- Cache File -->
        <div class="sui-subsection">
          <div class="sui-subsection__head">
            <span class="sui-subsection__title">Cache File</span>
            <v-switch
              v-model="enableCacheFile"
              color="primary"
              :label="$t('enable')"
              hide-details
              class="sui-header-switch"
            />
          </div>
          <v-row v-if="appConfig.experimental.cache_file" align="center" class="mt-1">
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="appConfig.experimental.cache_file.path"
                hide-details
                dir="ltr"
                class="sui-mono-input"
                :label="$t('transport.path')"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="appConfig.experimental.cache_file.cache_id"
                hide-details
                dir="ltr"
                class="sui-mono-input"
                label="Cache ID"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-switch
                v-model="appConfig.experimental.cache_file.store_fakeip"
                color="primary"
                :label="$t('basic.exp.storeFakeIp')"
                hide-details
              />
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-4" />

        <!-- Clash API -->
        <div class="sui-subsection">
          <div class="sui-subsection__head">
            <span class="sui-subsection__title">Clash API</span>
            <v-switch
              v-model="enableClashApi"
              color="primary"
              :label="$t('enable')"
              hide-details
              class="sui-header-switch"
            />
          </div>
          <template v-if="appConfig.experimental.clash_api">
            <v-row class="mt-1">
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="appConfig.experimental.clash_api.external_controller"
                  hide-details
                  dir="ltr"
                  class="sui-mono-input"
                  :label="$t('basic.exp.extController')"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="appConfig.experimental.clash_api.secret"
                  hide-details
                  dir="ltr"
                  :type="showClashSecret ? 'text' : 'password'"
                  class="sui-mono-input"
                  :label="$t('basic.exp.secret')"
                >
                  <template #append-inner>
                    <v-btn
                      :icon="showClashSecret ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                      variant="text"
                      width="28"
                      height="28"
                      :aria-label="showClashSecret ? $t('ui.hidePassword') : $t('ui.showPassword')"
                      @click="showClashSecret = !showClashSecret"
                    />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="appConfig.experimental.clash_api.default_mode"
                  hide-details
                  :label="$t('basic.exp.defaultMode')"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="appConfig.experimental.clash_api.external_ui"
                  hide-details
                  dir="ltr"
                  class="sui-mono-input"
                  :label="$t('basic.exp.extUi')"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="appConfig.experimental.clash_api.external_ui_download_url"
                  hide-details
                  dir="ltr"
                  class="sui-mono-input"
                  :label="$t('basic.exp.extUiDownloadUrl')"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="appConfig.experimental.clash_api.external_ui_download_detour"
                  hide-details
                  :items="outboundTags"
                  clearable
                  :label="$t('basic.exp.extUiDownloadDetour')"
                  @click:clear="delete appConfig.experimental.clash_api.external_ui_download_detour"
                />
              </v-col>
              <v-col cols="12" sm="8" md="8">
                <v-text-field
                  v-model="origin"
                  hide-details
                  dir="ltr"
                  class="sui-mono-input"
                  :label="$t('basic.exp.allowOrigin') + ' ' + $t('commaSeparated')"
                />
              </v-col>
              <v-col cols="12" sm="4" md="4" class="d-flex align-center">
                <v-switch
                  v-model="appConfig.experimental.clash_api.access_control_allow_private_network"
                  color="primary"
                  :label="$t('basic.exp.allowPrivate')"
                  hide-details
                />
              </v-col>
            </v-row>
          </template>
        </div>

        <v-divider class="my-4" />

        <!-- V2Ray API -->
        <div class="sui-subsection">
          <div class="sui-subsection__head">
            <span class="sui-subsection__title">V2Ray API</span>
            <v-switch
              v-model="enableV2rayApi"
              color="primary"
              :label="$t('enable')"
              hide-details
              class="sui-header-switch"
            />
          </div>
          <template v-if="appConfig.experimental.v2ray_api">
            <v-row align="center" class="mt-1">
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="appConfig.experimental.v2ray_api.listen"
                  hide-details
                  dir="ltr"
                  class="sui-mono-input"
                  :label="$t('objects.listen')"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-switch
                  v-model="appConfig.experimental.v2ray_api.stats.enabled"
                  color="primary"
                  :label="$t('stats.enable')"
                  hide-details
                />
              </v-col>
            </v-row>
            <v-row v-if="appConfig.experimental.v2ray_api?.stats?.enabled" class="mt-1">
              <v-col cols="12" md="4">
                <v-select
                  v-model="appConfig.experimental.v2ray_api.stats.inbounds"
                  hide-details
                  :label="$t('pages.inbounds')"
                  multiple
                  chips
                  closable-chips
                  :items="inboundTags"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="appConfig.experimental.v2ray_api.stats.outbounds"
                  hide-details
                  :label="$t('pages.outbounds')"
                  multiple
                  chips
                  closable-chips
                  :items="outboundTags"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="appConfig.experimental.v2ray_api.stats.users"
                  hide-details
                  :label="$t('pages.clients')"
                  multiple
                  chips
                  closable-chips
                  :items="clientNames"
                />
              </v-col>
            </v-row>
          </template>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
import Data from '@/store/modules/data'
import Dial from '@/components/Dial.vue'
import { computed, ref, onBeforeMount } from 'vue'
import { Config, Ntp } from '@/types/config'
import { FindDiff } from '@/plugins/utils'

const oldConfig = ref<Record<string, any>>({})
const loading = ref(false)
const showClashSecret = ref(false)

const appConfig = computed((): Config => {
  return <Config> Data().config
})

onBeforeMount(async () => {
  loading.value = true
  while (Data().lastLoad === 0) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  oldConfig.value = JSON.parse(JSON.stringify(Data().config))
  loading.value = false
})

const stateChange = computed(() => {
  return FindDiff.deepCompare(appConfig.value, oldConfig.value)
})

const saveConfig = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const success = await Data().save('config', 'set', appConfig.value)
    if (success) oldConfig.value = JSON.parse(JSON.stringify(Data().config))
  } finally {
    loading.value = false
  }
}

const inboundTags = computed((): string[] => {
  return [
    ...(Data().inbounds ?? []).map((i: any) => i.tag),
    ...(Data().endpoints ?? []).filter((e: any) => e.listen_port > 0).map((e: any) => e.tag),
  ]
})

const clientNames = computed((): string[] => {
  const clients = <any[]>Data().clients ?? []
  return clients.map((c) => c.name)
})

const outboundTags = computed((): string[] => {
  return [
    ...(Data().outbounds ?? []).map((o: any) => o.tag),
    ...(Data().endpoints ?? []).map((e: any) => e.tag),
  ]
})

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'panic']

const enableNtp = computed({
  get() {
    return appConfig.value.ntp?.enabled ?? false
  },
  set(v: boolean) {
    if (v) {
      appConfig.value.ntp = <Ntp>{ enabled: true, server: 'time.apple.com', server_port: 123, interval: '30m' }
    } else {
      appConfig.value.ntp = <Ntp>{}
    }
  },
})

const ntpInterval = computed({
  get(): any {
    return appConfig.value.ntp?.interval ? parseInt(appConfig.value.ntp.interval.replace('m', '')) : null
  },
  set(v: number) {
    if (!appConfig.value.ntp) return
    if (v > 0) appConfig.value.ntp.interval = v + 'm'
    else delete appConfig.value.ntp.interval
  },
})

const enableCacheFile = computed({
  get() {
    return appConfig.value.experimental?.cache_file?.enabled ?? false
  },
  set(v: boolean) {
    if (!appConfig.value.experimental) return
    if (v) {
      appConfig.value.experimental.cache_file = { enabled: true }
    } else {
      delete appConfig.value.experimental.cache_file
    }
  },
})

const enableClashApi = computed({
  get() {
    return appConfig.value.experimental?.clash_api != undefined
  },
  set(v: boolean) {
    if (!appConfig.value.experimental) return
    appConfig.value.experimental.clash_api = v ? { external_controller: '127.0.0.1:9090' } : undefined
  },
})

const enableV2rayApi = computed({
  get() {
    return appConfig.value.experimental?.v2ray_api != undefined
  },
  set(v: boolean) {
    if (!appConfig.value.experimental) return
    appConfig.value.experimental.v2ray_api = v
      ? { listen: '127.0.0.1:8080', stats: { enabled: false, inbounds: [], outbounds: [], users: [] } }
      : undefined
  },
})

const origin = computed({
  get() {
    const origins = appConfig.value.experimental?.clash_api?.access_control_allow_origin
    return origins && origins.length > 0 ? origins.join(',') : ''
  },
  set(v: string) {
    if (appConfig.value.experimental?.clash_api) {
      appConfig.value.experimental.clash_api.access_control_allow_origin = v.length > 0 ? v.split(',') : undefined
    }
  },
})
</script>

<style scoped>
.sui-config-view {
  width: 100%;
}

.sui-subview-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sui-subview-bar__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.sui-subview-bar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-header-switch {
  flex: 0 0 auto;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}

.sui-subsection__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.sui-subsection__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

:deep(.sui-mono-input input) {
  font-family: var(--sui-font-mono);
  font-size: 0.875rem;
}
</style>
