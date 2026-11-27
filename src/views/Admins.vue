<template>
  <div class="sui-admins-page">
    <AdminModal
      v-model="editModal.visible"
      :visible="editModal.visible"
      :user="editModal.user"
      @close="closeEditModal"
      @save="saveEditModal"
    />
    <ChangeModal
      v-model="changesModal.visible"
      :visible="changesModal.visible"
      :admins="users.map((u: any) => u.username)"
      :actor="changesModal.actor"
      @close="closeChangesModal"
    />
    <TokenModal
      v-model="tokenModal.visible"
      :visible="tokenModal.visible"
      @close="closeTokenModal"
    />

    <ConfirmDialog
      v-model="tokenDeleteDialog.visible"
      :title="$t('ui.deleteTitle')"
      :message="$t('ui.deleteConfirm')"
      :confirm-text="$t('actions.del')"
      :cancel-text="$t('ui.cancel')"
      confirm-color="error"
      icon="mdi-key-remove"
      :loading="tokenDeleteDialog.loading"
      @confirm="confirmDeleteToken"
    >
      <v-chip
        v-if="tokenDeleteDialog.label"
        size="small"
        variant="outlined"
        color="secondary"
        class="sui-mono mt-3"
        dir="ltr"
      >
        {{ tokenDeleteDialog.label }}
      </v-chip>
    </ConfirmDialog>

    <PageHeader :title="$t('pages.admins')" :count="users.length">
      <template #actions>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="refreshing"
          @click="refreshAll"
        >
          {{ $t('node.refresh') }}
        </v-btn>
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-history"
          @click="showChangesModal('')"
        >
          {{ $t('admin.changes') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-key-variant"
          @click="showTokenModal()"
        >
          {{ $t('admin.api.title') }}
        </v-btn>
      </template>
    </PageHeader>

    <div class="d-flex flex-column ga-4">
      <!-- Admin accounts -->
      <v-card :loading="usersLoading">
        <div class="sui-admin-section__head">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-account-supervisor-outline" size="20" color="primary" />
            <span class="text-subtitle-1 font-weight-semibold">{{ $t('pages.admins') }}</span>
            <v-chip size="x-small" variant="outlined" color="secondary" class="sui-num">
              {{ users.length }}
            </v-chip>
          </div>
        </div>

        <v-divider />

        <v-card-text v-if="!usersLoading && users.length === 0" class="pa-4">
          <EmptyState icon="mdi-account-off-outline" :title="$t('ui.noItems')" />
        </v-card-text>

        <div v-else class="sui-table-wrap">
          <v-table density="comfortable" class="sui-admin-table">
            <thead>
              <tr>
                <th>{{ $t('login.username') }}</th>
                <th>{{ $t('admin.lastLogin') }}</th>
                <th>IP</th>
                <th class="text-end">{{ $t('actions.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in users" :key="item.id">
                <td>
                  <div class="d-flex align-center ga-2 py-1">
                    <v-avatar color="primary" variant="tonal" size="30" rounded="md">
                      <v-icon icon="mdi-shield-account-outline" size="18" />
                    </v-avatar>
                    <span class="sui-mono font-weight-semibold" dir="ltr">{{ item.username }}</span>
                    <v-chip size="x-small" variant="outlined" color="primary">
                      {{ $t('objects.user') }}
                    </v-chip>
                  </div>
                </td>
                <td>
                  <div v-if="item.loginDate && item.loginDate !== '-'" class="d-flex flex-wrap align-center ga-2">
                    <span class="sui-mono sui-num text-body-2" dir="ltr">
                      {{ item.loginDate }} {{ item.loginTime }}
                    </span>
                  </div>
                  <span v-else class="text-medium-emphasis">-</span>
                </td>
                <td>
                  <v-chip
                    v-if="item.ip && item.ip !== '-'"
                    size="small"
                    variant="outlined"
                    color="secondary"
                    class="sui-mono"
                    dir="ltr"
                  >
                    {{ item.ip }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">-</span>
                </td>
                <td class="text-end text-no-wrap">
                  <v-btn
                    variant="outlined"
                    color="primary"
                    size="small"
                    prepend-icon="mdi-account-edit-outline"
                    class="me-1"
                    @click="showEditModal(item)"
                  >
                    {{ $t('actions.edit') }}
                    <v-tooltip activator="parent" location="top" :text="$t('admin.changeCred')" />
                  </v-btn>
                  <v-btn
                    icon="mdi-history"
                    variant="text"
                    size="small"
                    :aria-label="$t('admin.changes')"
                    @click="showChangesModal(item.username)"
                  >
                    <v-icon icon="mdi-history" />
                    <v-tooltip activator="parent" location="top" :text="$t('admin.changes')" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- API Tokens -->
      <v-card :loading="tokensLoading">
        <div class="sui-admin-section__head">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-key-variant" size="20" color="primary" />
            <span class="text-subtitle-1 font-weight-semibold">{{ $t('admin.api.title') }}</span>
            <v-chip size="x-small" variant="outlined" color="secondary" class="sui-num">
              {{ tokens.length }}
            </v-chip>
          </div>
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            @click="showTokenModal()"
          >
            {{ $t('actions.add') }}
          </v-btn>
        </div>

        <v-divider />

        <v-card-text v-if="!tokensLoading && tokens.length === 0" class="pa-4">
          <EmptyState
            icon="mdi-key-outline"
            :title="$t('ui.noItems')"
            :action-text="$t('actions.add')"
            @action="showTokenModal"
          />
        </v-card-text>

        <div v-else class="sui-table-wrap">
          <v-table density="comfortable" class="sui-admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ $t('admin.api.token') }}</th>
                <th>{{ $t('client.desc') }}</th>
                <th>{{ $t('date.expiry') }}</th>
                <th class="text-end">{{ $t('actions.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="token in tokens" :key="token.id">
                <td class="sui-num text-medium-emphasis">{{ token.id }}</td>
                <td class="sui-mono text-body-2" dir="ltr">{{ token.token }}</td>
                <td>{{ token.desc || '-' }}</td>
                <td>
                  <v-chip
                    size="small"
                    variant="flat"
                    :color="tokenExpiryColor(token.expiry)"
                    class="sui-mono sui-num"
                    dir="ltr"
                  >
                    {{ formatTokenExpiry(token.expiry) }}
                  </v-chip>
                </td>
                <td class="text-end text-no-wrap">
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    size="small"
                    color="error"
                    :aria-label="$t('actions.del')"
                    @click="askDeleteToken(token)"
                  >
                    <v-icon icon="mdi-delete-outline" />
                    <v-tooltip activator="parent" location="top" :text="$t('actions.del')" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Login security (TOTP, Passkeys, OIDC) -->
      <div class="sui-security-wrap">
        <SecuritySettings />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Ref, inject, onMounted, ref } from 'vue'
import AdminModal from '@/layouts/modals/Admin.vue'
import ChangeModal from '@/layouts/modals/Changes.vue'
import TokenModal from '@/layouts/modals/Token.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SecuritySettings from '@/components/SecuritySettings.vue'
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'

const loading: Ref = inject('loading') ?? ref(false)
const usersLoading = ref(false)
const tokensLoading = ref(false)
const refreshing = ref(false)

const users = ref<any[]>([])
const tokens = ref<any[]>([])

const resolvedLocale = (): string => {
  const l = i18n.global.locale.value
  switch (l) {
    case 'zhHans':
      return 'zh-cn'
    case 'zhHant':
      return 'zh-tw'
    default:
      return l
  }
}

const dateFormatted = (dt: number): string => {
  const locale = i18n.global.locale.value.replace('zh', 'zh-')
  const date = new Date(dt)
  return date.toLocaleString(locale)
}

const formatTokenExpiry = (expiry: number): string => {
  if (!expiry || expiry === 0) return i18n.global.t('unlimited')
  const nowSec = Math.floor(Date.now() / 1000)
  if (expiry <= nowSec) return i18n.global.t('date.expired')
  const date = new Date(expiry * 1000)
  return date.toLocaleDateString(resolvedLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const tokenExpiryColor = (expiry: number): string => {
  if (!expiry || expiry === 0) return 'info'
  const nowSec = Math.floor(Date.now() / 1000)
  if (expiry <= nowSec) return 'error'
  return 'success'
}

const loadData = async () => {
  usersLoading.value = true
  loading.value = true
  const msg = await HttpUtils.get('api/users')
  loading.value = false
  usersLoading.value = false
  if (msg.success && Array.isArray(msg.obj)) {
    users.value = []
    msg.obj.forEach((u: any) => {
      const lastLogin = (u.lastLogin ?? '').split(' ')
      const localLastLogin =
        lastLogin.length > 2 ? dateFormatted(Date.parse(lastLogin[0] + ' ' + lastLogin[1])) : '- -'
      const loginDateTime = localLastLogin.split(' ')
      users.value.push({
        id: u.id,
        username: u.username,
        loginDate: loginDateTime[0],
        loginTime: loginDateTime.slice(1).join(' '),
        ip: lastLogin[2] ?? '-',
      })
    })
  }
}

const loadTokens = async () => {
  tokensLoading.value = true
  const msg = await HttpUtils.get('api/tokens')
  tokensLoading.value = false
  if (msg.success) {
    tokens.value = Array.isArray(msg.obj) ? msg.obj : []
  }
}

const refreshAll = async () => {
  refreshing.value = true
  try {
    await Promise.all([loadData(), loadTokens()])
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  await refreshAll()
})

const editModal = ref({
  visible: false,
  user: {},
})

const showEditModal = (user: any) => {
  editModal.value.user = user
  editModal.value.visible = true
}
const closeEditModal = () => {
  editModal.value.visible = false
  editModal.value.user = {}
}
const saveEditModal = async (data: any) => {
  loading.value = true
  const response = await HttpUtils.post('api/changePass', data)
  if (response.success) {
    setTimeout(async () => {
      loading.value = false
      editModal.value.visible = false
      await loadData()
    }, 500)
  } else {
    loading.value = false
  }
}

const changesModal = ref({
  visible: false,
  actor: '',
})
const showChangesModal = (actor: string) => {
  changesModal.value.actor = actor
  changesModal.value.visible = true
}
const closeChangesModal = () => {
  changesModal.value.visible = false
  changesModal.value.actor = ''
}

const tokenModal = ref({
  visible: false,
})
const showTokenModal = () => {
  tokenModal.value.visible = true
}
const closeTokenModal = () => {
  tokenModal.value.visible = false
  loadTokens()
}

const tokenDeleteDialog = ref({
  visible: false,
  id: 0,
  label: '',
  loading: false,
})

const askDeleteToken = (token: any) => {
  tokenDeleteDialog.value = {
    visible: true,
    id: token.id,
    label: token.desc ? `${token.desc} (${token.token})` : String(token.token ?? ''),
    loading: false,
  }
}

const confirmDeleteToken = async () => {
  tokenDeleteDialog.value.loading = true
  const res = await HttpUtils.post('api/deleteToken', { id: tokenDeleteDialog.value.id })
  tokenDeleteDialog.value.loading = false
  if (res.success) {
    tokenDeleteDialog.value.visible = false
    await loadTokens()
  }
}
</script>

<style scoped>
.sui-admin-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.sui-admin-table th {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
}

.sui-security-wrap :deep(> .v-card) {
  margin-top: 0 !important;
}
</style>
