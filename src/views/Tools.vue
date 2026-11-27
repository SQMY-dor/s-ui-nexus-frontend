<template>
  <div class="sui-tools d-flex flex-column ga-5">
    <section v-for="group in groups" :key="group.title">
      <div class="sui-section-header">
        <span>{{ group.title }}</span>
      </div>
      <v-row>
        <v-col
          v-for="item in group.items"
          :key="item.id"
          cols="12"
          sm="6"
          lg="4"
        >
          <v-card class="sui-resource-card sui-tool-card d-flex flex-column fill-height">
            <div class="sui-tool-card__body flex-grow-1">
              <v-avatar
                :color="item.color"
                variant="tonal"
                size="40"
                rounded="md"
                class="flex-shrink-0"
              >
                <v-icon :icon="item.icon" size="22" />
              </v-avatar>
              <div class="sui-tool-card__content">
                <div class="text-subtitle-2 font-weight-semibold">{{ item.title }}</div>
                <div class="text-caption text-medium-emphasis mt-1">{{ item.subtitle }}</div>
              </div>
            </div>
            <v-divider />
            <v-card-actions class="px-4 py-2">
              <v-btn
                :color="item.color"
                variant="outlined"
                size="small"
                :prepend-icon="item.btnIcon"
                :loading="busyTool === item.id"
                @click="item.action"
              >
                {{ item.actionLabel }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <input
      ref="databaseInput"
      type="file"
      accept=".db,application/x-sqlite3"
      hidden
      @change="onDatabaseFilePicked"
    />

    <!-- Restart confirmation -->
    <ConfirmDialog
      v-model="restartDialog.visible"
      :title="restartDialog.title"
      :message="$t('tools.serviceUnavailableConfirm')"
      :confirm-text="$t('ui.confirm')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="warning"
      icon="mdi-restart"
      :loading="restartDialog.loading"
      @confirm="confirmRestart"
    />

    <!-- Restore DB confirmation -->
    <ConfirmDialog
      v-model="restoreDialog.visible"
      :title="$t('tools.restoreDatabase')"
      :message="$t('tools.restoreDatabaseConfirm')"
      :confirm-text="$t('ui.confirm')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="warning"
      icon="mdi-database-import-outline"
      :loading="restoreDialog.loading"
      @confirm="confirmRestore"
      @cancel="cancelRestore"
    >
      <v-chip
        v-if="restoreDialog.file"
        size="small"
        variant="outlined"
        color="secondary"
        prepend-icon="mdi-file-outline"
        class="sui-mono mt-3"
        dir="ltr"
      >
        {{ restoreDialog.file.name }}
      </v-chip>
    </ConfirmDialog>

    <!-- Link / Subscription Converter dialog -->
    <v-dialog v-model="convertDialog.visible" max-width="540" :persistent="convertDialog.loading">
      <v-card>
        <div class="sui-modal-header">
          <div class="d-flex align-center ga-2 min-width-0">
            <v-avatar color="primary" variant="tonal" size="34" rounded="md">
              <v-icon :icon="convertDialog.icon" size="18" />
            </v-avatar>
            <span class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ convertDialog.title }}
            </span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="convertDialog.loading"
            :aria-label="$t('actions.close')"
            @click="convertDialog.visible = false"
          />
        </div>
        <v-divider />
        <div class="sui-modal-body">
          <v-text-field
            v-model="convertDialog.value"
            :label="convertDialog.label"
            dir="ltr"
            class="sui-mono"
            autofocus
            hide-details
            @keydown.enter="submitConvert"
          />
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn variant="text" :disabled="convertDialog.loading" @click="convertDialog.visible = false">
            {{ $t('ui.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="convertDialog.loading"
            :disabled="!convertDialog.value.trim()"
            @click="submitConvert"
          >
            {{ $t('actions.submit') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Generate Key Pairs dialog -->
    <v-dialog v-model="keyDialog.visible" max-width="540" :persistent="keyDialog.loading">
      <v-card>
        <div class="sui-modal-header">
          <div class="d-flex align-center ga-2 min-width-0">
            <v-avatar color="primary" variant="tonal" size="34" rounded="md">
              <v-icon icon="mdi-key-variant" size="18" />
            </v-avatar>
            <span class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('tools.generateKeyPairs') }}
            </span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="keyDialog.loading"
            :aria-label="$t('actions.close')"
            @click="keyDialog.visible = false"
          />
        </div>
        <v-divider />
        <div class="sui-modal-body d-flex flex-column ga-3">
          <v-select
            v-model="keyDialog.type"
            :items="keyPairTypes"
            :label="$t('type')"
            hide-details
          />
          <v-text-field
            v-model="keyDialog.options"
            :label="$t('tools.keyOptions')"
            dir="ltr"
            class="sui-mono"
            hide-details
            @keydown.enter="submitKeypair"
          />
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn variant="text" :disabled="keyDialog.loading" @click="keyDialog.visible = false">
            {{ $t('ui.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="keyDialog.loading"
            :disabled="!keyDialog.type"
            @click="submitKeypair"
          >
            {{ $t('actions.generate') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Output result dialog -->
    <v-dialog v-model="resultVisible" max-width="720">
      <v-card>
        <div class="sui-modal-header">
          <span class="text-subtitle-1 font-weight-semibold text-truncate">{{ resultTitle }}</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="resultVisible = false"
          />
        </div>
        <v-divider />
        <div class="sui-modal-body">
          <pre class="sui-tool-result sui-mono" dir="ltr">{{ resultText }}</pre>
        </div>
        <v-divider />
        <div class="sui-modal-actions">
          <v-btn
            variant="outlined"
            color="primary"
            prepend-icon="mdi-content-copy"
            @click="copyResult"
          >
            {{ $t('copyToClipboard') }}
          </v-btn>
          <v-btn color="primary" variant="flat" @click="resultVisible = false">
            {{ $t('actions.close') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { push } from 'notivue'
import HttpUtils from '@/plugins/httputil'
import { writeClipboard } from '@/plugins/clipboard'
import { i18n } from '@/locales'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const t = (key: string, params?: any) => i18n.global.t(key, params)

const busyTool = ref('')
const resultVisible = ref(false)
const resultTitle = ref(t('tools.result'))
const resultText = ref('')
const databaseInput = ref<HTMLInputElement | null>(null)

const keyPairTypes = ['reality', 'wireguard', 'wireguard-psk', 'tls', 'ech']

const download = (path: string) => window.open(path, '_blank', 'noopener')

const showResult = (title: string, value: any) => {
  resultTitle.value = title
  resultText.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  resultVisible.value = true
}

const copyResult = async () => {
  const ok = await writeClipboard(resultText.value)
  if (ok) {
    push.success({
      title: t('success'),
      message: t('ui.copied'),
      duration: 3000,
    })
  }
}

// Restart flow
const restartDialog = ref<{
  visible: boolean
  target: 'restartSb' | 'restartApp'
  title: string
  loading: boolean
}>({
  visible: false,
  target: 'restartSb',
  title: '',
  loading: false,
})

const openRestart = (target: 'restartSb' | 'restartApp') => {
  restartDialog.value = {
    visible: true,
    target,
    title: target === 'restartSb' ? t('tools.restartSingbox') : t('tools.restartPanel'),
    loading: false,
  }
}

const confirmRestart = async () => {
  restartDialog.value.loading = true
  busyTool.value = restartDialog.value.target
  try {
    const res = await HttpUtils.post(`api/${restartDialog.value.target}`, {})
    if (res.success) {
      restartDialog.value.visible = false
      push.success({
        title: t('success'),
        message: restartDialog.value.title,
        duration: 4000,
      })
    }
  } finally {
    restartDialog.value.loading = false
    busyTool.value = ''
  }
}

// Restore database flow
const restoreDialog = ref<{
  visible: boolean
  file: File | null
  loading: boolean
}>({
  visible: false,
  file: null,
  loading: false,
})

const onDatabaseFilePicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  restoreDialog.value = { visible: true, file, loading: false }
}

const resetDbInput = () => {
  if (databaseInput.value) databaseInput.value.value = ''
  restoreDialog.value.file = null
}

const cancelRestore = () => {
  resetDbInput()
}

const confirmRestore = async () => {
  const file = restoreDialog.value.file
  if (!file) {
    restoreDialog.value.visible = false
    return
  }
  restoreDialog.value.loading = true
  busyTool.value = 'restoreDb'
  try {
    const form = new FormData()
    form.append('db', file)
    const res = await HttpUtils.post('api/importdb', form)
    if (res.success) {
      restoreDialog.value.visible = false
      push.success({
        title: t('success'),
        message: t('tools.restoreDatabase'),
        duration: 4000,
      })
    }
  } finally {
    restoreDialog.value.loading = false
    busyTool.value = ''
    resetDbInput()
  }
}

// Link / Subscription converter dialog
const convertDialog = ref<{
  visible: boolean
  endpoint: string
  title: string
  label: string
  icon: string
  value: string
  loading: boolean
}>({
  visible: false,
  endpoint: '',
  title: '',
  label: '',
  icon: 'mdi-link-variant',
  value: '',
  loading: false,
})

const openConvert = (endpoint: string, title: string, label: string, icon: string) => {
  convertDialog.value = {
    visible: true,
    endpoint,
    title,
    label,
    icon,
    value: '',
    loading: false,
  }
}

const submitConvert = async () => {
  const value = convertDialog.value.value.trim()
  if (!value || convertDialog.value.loading) return
  convertDialog.value.loading = true
  busyTool.value = convertDialog.value.endpoint
  try {
    const response = await HttpUtils.post(`api/${convertDialog.value.endpoint}`, { link: value })
    if (response.success) {
      convertDialog.value.visible = false
      showResult(convertDialog.value.label, response.obj)
    }
  } finally {
    convertDialog.value.loading = false
    busyTool.value = ''
  }
}

// Key pairs dialog
const keyDialog = ref({
  visible: false,
  type: 'reality',
  options: '',
  loading: false,
})

const openKeypair = () => {
  keyDialog.value = {
    visible: true,
    type: 'reality',
    options: '',
    loading: false,
  }
}

const submitKeypair = async () => {
  if (!keyDialog.value.type || keyDialog.value.loading) return
  keyDialog.value.loading = true
  busyTool.value = 'keypairs'
  try {
    const response = await HttpUtils.get('api/keypairs', {
      k: keyDialog.value.type,
      o: keyDialog.value.options,
    })
    if (response.success) {
      keyDialog.value.visible = false
      showResult(t('tools.keyPair', { type: keyDialog.value.type }), response.obj)
    }
  } finally {
    keyDialog.value.loading = false
    busyTool.value = ''
  }
}

const groups = computed(() => [
  {
    title: t('tools.backupRestore'),
    items: [
      {
        id: 'getdb',
        title: t('tools.downloadDatabase'),
        subtitle: t('tools.fullBackup'),
        actionLabel: t('tools.downloadDatabase'),
        icon: 'mdi-database-export-outline',
        btnIcon: 'mdi-download-outline',
        color: 'info',
        action: () => download('api/getdb'),
      },
      {
        id: 'restoreDb',
        title: t('tools.restoreDatabase'),
        subtitle: t('tools.restoreBackupSubtitle'),
        actionLabel: t('tools.restoreDatabase'),
        icon: 'mdi-database-import-outline',
        btnIcon: 'mdi-upload-outline',
        color: 'warning',
        action: () => databaseInput.value?.click(),
      },
      {
        id: 'sbConfig',
        title: t('tools.downloadSingboxConfig'),
        subtitle: t('tools.generatedRuntimeJson'),
        actionLabel: t('tools.downloadSingboxConfig'),
        icon: 'mdi-code-json',
        btnIcon: 'mdi-download-outline',
        color: 'info',
        action: () => download('api/singbox-config'),
      },
    ],
  },
  {
    title: t('tools.conversionKeys'),
    items: [
      {
        id: 'linkConvert',
        title: t('tools.shareLinkConverter'),
        subtitle: t('tools.shareLinkSubtitle'),
        actionLabel: t('tools.shareLinkConverter'),
        icon: 'mdi-link-variant',
        btnIcon: 'mdi-link-variant',
        color: 'primary',
        action: () => openConvert('linkConvert', t('tools.shareLinkConverter'), t('tools.shareLink'), 'mdi-link-variant'),
      },
      {
        id: 'subConvert',
        title: t('tools.subscriptionConverter'),
        subtitle: t('tools.subscriptionSubtitle'),
        actionLabel: t('tools.subscriptionConverter'),
        icon: 'mdi-playlist-plus',
        btnIcon: 'mdi-playlist-plus',
        color: 'primary',
        action: () => openConvert('subConvert', t('tools.subscriptionConverter'), t('tools.subscriptionUrl'), 'mdi-playlist-plus'),
      },
      {
        id: 'keypairs',
        title: t('tools.generateKeyPairs'),
        subtitle: t('tools.keyPairsSubtitle'),
        actionLabel: t('actions.generate'),
        icon: 'mdi-key-variant',
        btnIcon: 'mdi-key-variant',
        color: 'primary',
        action: openKeypair,
      },
    ],
  },
  {
    title: t('tools.serviceActions'),
    items: [
      {
        id: 'restartSb',
        title: t('tools.restartSingbox'),
        subtitle: t('tools.restartSingboxSubtitle'),
        actionLabel: t('tools.restartSingbox'),
        icon: 'mdi-restart',
        btnIcon: 'mdi-restart',
        color: 'warning',
        action: () => openRestart('restartSb'),
      },
      {
        id: 'restartApp',
        title: t('tools.restartPanel'),
        subtitle: t('tools.restartPanelSubtitle'),
        actionLabel: t('tools.restartPanel'),
        icon: 'mdi-power',
        btnIcon: 'mdi-power',
        color: 'error',
        action: () => openRestart('restartApp'),
      },
    ],
  },
])
</script>

<style scoped>
.min-width-0 {
  min-width: 0;
}

.sui-tool-card__body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
}

.sui-tool-card__content {
  min-width: 0;
  flex: 1 1 auto;
}

.sui-tool-result {
  margin: 0;
  padding: 14px 16px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background: rgb(var(--v-theme-surface-light));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8125rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
