<template>
  <v-card class="mt-4" :loading="loading">
    <div class="sui-security-header">
      <div class="d-flex align-center ga-2 min-w-0">
        <v-avatar color="primary" variant="tonal" size="32" rounded="md">
          <v-icon icon="mdi-shield-account-outline" size="18" />
        </v-avatar>
        <span class="text-subtitle-1 font-weight-semibold text-truncate">
          {{ $t('security.title') }}
        </span>
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        :loading="loading"
        :aria-label="$t('actions.update')"
        :title="$t('actions.update')"
        @click="load"
      />
    </div>
    <v-divider />
    <v-list lines="two" class="py-0">
      <v-list-item
        prepend-icon="mdi-two-factor-authentication"
        :title="$t('security.totp')"
        :subtitle="security.totpEnabled ? $t('security.enabled') : $t('security.disabled')"
      >
        <template #append>
          <v-btn
            v-if="security.totpEnabled"
            color="warning"
            variant="outlined"
            size="small"
            @click="disableDialog = true"
          >
            {{ $t('actions.disable') }}
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="flat"
            size="small"
            @click="beginTotp"
          >
            {{ $t('enable') }}
          </v-btn>
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item
        prepend-icon="mdi-passkey"
        :title="$t('security.passkeys')"
        :subtitle="methods.passkey ? $t('security.passkeyEnabled') : $t('security.passkeyDisabledHint')"
      >
        <template #append>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            :disabled="!methods.passkey || !passkeySupported"
            @click="addPasskey"
          >
            {{ $t('security.addPasskey') }}
          </v-btn>
        </template>
      </v-list-item>
      <v-list-item
        v-for="passkey in passkeys"
        :key="passkey.id"
        class="ps-12"
        :title="passkey.name || $t('auth.passkey')"
        :subtitle="formatDate(passkey.createdAt)"
      >
        <template #append>
          <div class="d-flex align-center ga-1">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              :aria-label="$t('security.renamePasskey')"
              :title="$t('security.renamePasskey')"
              @click="openRename(passkey)"
            />
            <v-btn
              icon="mdi-delete-outline"
              color="error"
              variant="text"
              size="small"
              :aria-label="$t('actions.del')"
              :title="$t('actions.del')"
              @click="requestDeletePasskey(passkey.id)"
            />
          </div>
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item
        prepend-icon="mdi-badge-account-horizontal-outline"
        :title="$t('security.oidc')"
        :subtitle="methods.oidc ? $t('security.oidcEnabled') : $t('security.disabled')"
      />
    </v-list>
  </v-card>

  <v-dialog v-model="totpDialog" width="100%" max-width="520">
    <v-card>
      <div class="sui-modal-header">
        <span class="text-subtitle-1 font-weight-semibold">{{ $t('security.enableTotp') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="totpDialog = false"
        />
      </div>
      <v-divider />
      <div class="sui-modal-body text-center">
        <p class="text-body-2 text-medium-emphasis mb-4">{{ $t('security.scanTotp') }}</p>
        <div v-if="totp.uri" class="sui-qr-frame mb-4">
          <QrcodeVue :value="totp.uri" :size="220" level="M" />
        </div>
        <v-text-field
          v-model="totpCode"
          :label="$t('security.code6')"
          autocomplete="one-time-code"
          class="sui-mono"
        />
        <v-expansion-panels variant="accordion" flat class="sui-manual-panel">
          <v-expansion-panel :title="$t('security.manualKey')">
            <template #text>
              <code class="sui-mono sui-manual-secret" dir="ltr">{{ totp.secret }}</code>
            </template>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
      <v-divider />
      <div class="sui-modal-actions">
        <v-btn variant="text" @click="totpDialog = false">{{ $t('ui.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="enableTotp">{{ $t('enable') }}</v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="recoveryDialog" width="100%" max-width="520" persistent>
    <v-card>
      <div class="sui-modal-header">
        <span class="text-subtitle-1 font-weight-semibold">{{ $t('security.saveRecoveryCodes') }}</span>
      </div>
      <v-divider />
      <div class="sui-modal-body">
        <p class="text-body-2 text-medium-emphasis mb-3">{{ $t('security.recoveryHint') }}</p>
        <pre class="recovery-codes sui-mono" dir="ltr">{{ recoveryCodes.join('\n') }}</pre>
      </div>
      <v-divider />
      <div class="sui-modal-actions">
        <v-btn color="primary" variant="flat" @click="recoveryDialog = false">
          {{ $t('security.savedRecoveryCodes') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="disableDialog" width="100%" max-width="460">
    <v-card>
      <div class="sui-modal-header">
        <span class="text-subtitle-1 font-weight-semibold">{{ $t('security.disableTotp') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="disableDialog = false"
        />
      </div>
      <v-divider />
      <div class="sui-modal-body">
        <v-text-field
          v-model="password"
          :label="$t('security.currentPassword')"
          type="password"
          class="mb-2"
        />
        <v-text-field
          v-model="disableCode"
          :label="$t('security.totpOrRecovery')"
          class="sui-mono"
        />
      </div>
      <v-divider />
      <div class="sui-modal-actions">
        <v-btn variant="text" @click="disableDialog = false">{{ $t('ui.cancel') }}</v-btn>
        <v-btn color="warning" variant="flat" @click="disableTotp">{{ $t('actions.disable') }}</v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="renameDialog" width="100%" max-width="420">
    <v-card>
      <div class="sui-modal-header">
        <span class="text-subtitle-1 font-weight-semibold">{{ $t('security.renamePasskey') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="renameDialog = false"
        />
      </div>
      <v-divider />
      <div class="sui-modal-body">
        <v-text-field
          v-model="renameName"
          :label="$t('security.passkeyName')"
          hide-details
          autofocus
        />
      </div>
      <v-divider />
      <div class="sui-modal-actions">
        <v-btn variant="text" @click="renameDialog = false">{{ $t('actions.close') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="renamePasskey">{{ $t('actions.save') }}</v-btn>
      </div>
    </v-card>
  </v-dialog>

  <ConfirmDialog
    v-model="deleteDialog"
    :title="$t('ui.deleteTitle')"
    :message="$t('security.deletePasskey')"
    :confirm-text="$t('actions.del')"
    confirm-color="error"
    icon="mdi-delete-outline"
    :loading="deletingPasskey"
    @confirm="confirmDeletePasskey"
  />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { push } from 'notivue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import HttpUtils from '@/plugins/httputil'
import { registerPasskey } from '@/plugins/webauthn'
import { i18n } from '@/locales'

const loading = ref(false)
const security = ref<any>({ totpEnabled: false, passkeys: [], methods: {} })
const totp = ref<any>({})
const totpCode = ref('')
const recoveryCodes = ref<string[]>([])
const password = ref('')
const disableCode = ref('')
const totpDialog = ref(false)
const recoveryDialog = ref(false)
const disableDialog = ref(false)
const renameDialog = ref(false)
const renameId = ref<number | null>(null)
const renameName = ref('')
const deleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deletingPasskey = ref(false)
const methods = computed(() => security.value.methods ?? {})
const passkeys = computed(() => security.value.passkeys ?? [])
const passkeySupported = typeof window !== 'undefined' && !!window.PublicKeyCredential

const load = async () => {
  loading.value = true
  try {
    const response = await HttpUtils.get('api/security')
    if (response.success) security.value = response.obj ?? security.value
  } finally {
    loading.value = false
  }
}

const beginTotp = async () => {
  const response = await HttpUtils.get('api/totp-begin')
  if (response.success) {
    totp.value = response.obj
    totpCode.value = ''
    totpDialog.value = true
  }
}

const enableTotp = async () => {
  const response = await HttpUtils.post('api/totp-enable', { code: totpCode.value })
  if (response.success) {
    recoveryCodes.value = response.obj?.recoveryCodes ?? []
    totpDialog.value = false
    recoveryDialog.value = true
    await load()
  }
}

const disableTotp = async () => {
  const response = await HttpUtils.post('api/totp-disable', { password: password.value, code: disableCode.value })
  if (response.success) {
    disableDialog.value = false
    password.value = ''
    disableCode.value = ''
    await load()
  }
}

const addPasskey = async () => {
  try {
    const name = await registerPasskey()
    push.success({ message: i18n.global.t('security.passkeyRegistered', { name }) })
    await load()
  } catch (error: any) {
    push.error({ message: error?.message ?? String(error) })
  }
}

const requestDeletePasskey = (id: number) => {
  deleteTargetId.value = id
  deleteDialog.value = true
}

const confirmDeletePasskey = async () => {
  if (deleteTargetId.value == null) return
  deletingPasskey.value = true
  try {
    const response = await HttpUtils.post('api/passkey-delete', { id: deleteTargetId.value })
    if (response.success) {
      deleteDialog.value = false
      deleteTargetId.value = null
      await load()
    }
  } finally {
    deletingPasskey.value = false
  }
}

const openRename = (passkey: any) => {
  renameId.value = passkey.id
  renameName.value = passkey.name || i18n.global.t('auth.passkey')
  renameDialog.value = true
}

const renamePasskey = async () => {
  if (!renameId.value) return
  const response = await HttpUtils.post('api/passkey-rename', { id: renameId.value, name: renameName.value })
  if (response.success) {
    renameDialog.value = false
    await load()
  }
}

const formatDate = (value: number) =>
  value ? new Date(value * 1000).toLocaleString() : i18n.global.t('security.neverUsed')

onMounted(load)
</script>

<style scoped>
.sui-security-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}

.sui-manual-panel {
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-sm);
  overflow: hidden;
}

.sui-manual-secret {
  display: block;
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
  user-select: all;
}

.recovery-codes {
  margin: 0;
  padding: 14px 16px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background: rgb(var(--v-theme-surface-light));
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.7;
  user-select: all;
}

.min-w-0 {
  min-width: 0;
}
</style>
