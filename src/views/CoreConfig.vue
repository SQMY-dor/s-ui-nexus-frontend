<template>
  <div class="sui-view">
    <PageHeader :title="$t('pages.config')" />

    <div class="sui-config-tabs mb-5">
      <v-tabs v-model="tab" show-arrows>
        <v-tab value="route" prepend-icon="mdi-routes">
          {{ $t('core.routing') }}
        </v-tab>
        <v-tab value="dns" prepend-icon="mdi-dns-outline">
          {{ $t('core.dns') }}
        </v-tab>
        <v-tab value="basics" prepend-icon="mdi-tune-variant">
          {{ $t('core.basics') }}
        </v-tab>
        <v-tab value="json" prepend-icon="mdi-code-json">
          {{ $t('core.rawJson') }}
        </v-tab>
      </v-tabs>
    </div>

    <v-window v-model="tab" :touch="false">
      <v-window-item value="route">
        <Rules />
      </v-window-item>
      <v-window-item value="dns">
        <Dns />
      </v-window-item>
      <v-window-item value="basics">
        <Basics />
      </v-window-item>
      <v-window-item value="json">
        <v-card class="sui-json-card">
          <v-card-text class="pa-4 pa-sm-5">
            <div class="sui-section-header">
              <span>{{ $t('ui.rawJsonEditor') }}</span>
              <div class="sui-json-actions">
                <v-btn
                  variant="outlined"
                  color="secondary"
                  size="small"
                  prepend-icon="mdi-code-braces"
                  @click="format"
                >
                  {{ $t('core.format') }}
                </v-btn>
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  prepend-icon="mdi-content-save-outline"
                  :loading="loading"
                  @click="save"
                >
                  {{ $t('core.saveJson') }}
                </v-btn>
              </div>
            </div>

            <v-alert v-if="error" type="error" variant="outlined" class="mb-3">
              {{ error }}
            </v-alert>

            <div dir="ltr" class="sui-json-editor-wrap">
              <v-textarea
                v-model="raw"
                dir="ltr"
                rows="24"
                auto-grow
                max-rows="36"
                hide-details
                class="raw-json sui-mono"
                spellcheck="false"
                :aria-label="$t('ui.rawJsonEditor')"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Data from '@/store/modules/data'
import HttpUtils from '@/plugins/httputil'
import PageHeader from '@/components/ui/PageHeader.vue'
import Basics from './Basics.vue'
import Dns from './Dns.vue'
import Rules from './Rules.vue'
import { i18n } from '@/locales'

const VALID_TABS = ['route', 'dns', 'basics', 'json'] as const

const route = useRoute()
const router = useRouter()

const tab = computed({
  get: () => {
    const q = String(route.query.tab ?? '')
    return (VALID_TABS as readonly string[]).includes(q) ? q : 'route'
  },
  set: (value: string) => {
    router.replace({ query: { ...route.query, tab: value } })
  },
})

const raw = ref('{}')
const error = ref('')
const loading = ref(false)

const load = async () => {
  const response = await HttpUtils.get('api/config')
  if (response.success) {
    raw.value = JSON.stringify(response.obj?.config ?? response.obj ?? {}, null, 2)
    error.value = ''
  }
}

const parse = () => {
  const value = JSON.parse(raw.value)
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(i18n.global.t('core.rootObjectRequired'))
  }
  return value
}

const format = () => {
  try {
    raw.value = JSON.stringify(parse(), null, 2)
    error.value = ''
  } catch (exception: any) {
    error.value = exception.message
  }
}

const save = async () => {
  if (loading.value) return
  try {
    loading.value = true
    const value = parse()
    const success = await Data().save('config', 'set', value)
    if (success) {
      raw.value = JSON.stringify(value, null, 2)
      error.value = ''
    }
  } catch (exception: any) {
    error.value = exception.message
  } finally {
    loading.value = false
  }
}

watch(
  tab,
  (value) => {
    if (value === 'json') load()
  },
  { immediate: true },
)
</script>

<style scoped>
.sui-view {
  width: 100%;
}

.sui-config-tabs {
  border-bottom: 1px solid var(--sui-hairline);
}

.sui-json-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-json-editor-wrap {
  direction: ltr;
  text-align: left;
}

:deep(.raw-json textarea) {
  font-family: var(--sui-font-mono);
  font-size: 0.8125rem;
  line-height: 1.55;
  direction: ltr;
  text-align: left;
  unicode-bidi: embed;
}
</style>
