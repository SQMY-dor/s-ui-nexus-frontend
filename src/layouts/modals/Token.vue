<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="800">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-key-chain" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('admin.api.title') }}
            </div>
            <v-chip v-if="tokens.length > 0" size="small" color="primary" variant="tonal" class="sui-num">
              {{ tokens.length }}
            </v-chip>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="closeModal"
        />
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <v-alert
          v-if="newToken.token.length > 0"
          type="success"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <div class="text-body-2 mb-2">{{ $t('admin.api.msg') }}</div>
          <div class="sui-token-box">
            <code class="sui-mono sui-token-value" dir="ltr">{{ newToken.token }}</code>
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              prepend-icon="mdi-content-copy"
              class="flex-shrink-0"
              @click="copyToClipboard(newToken.token)"
            >
              {{ $t('copyToClipboard') }}
            </v-btn>
          </div>
        </v-alert>

        <div class="sui-table-wrap sui-tokens-table">
          <v-table density="compact">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ $t('admin.api.token') }}</th>
                <th>{{ $t('client.desc') }}</th>
                <th>{{ $t('date.expiry') }}</th>
                <th class="text-end">{{ $t('actions.del') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!loading && tokens.length === 0">
                <td colspan="5" class="text-center text-medium-emphasis py-6">
                  {{ $t('noData') }}
                </td>
              </tr>
              <tr v-for="(token, index) of tokens" :key="token.id">
                <td class="sui-num text-medium-emphasis">{{ token.id }}</td>
                <td class="sui-mono text-caption" dir="ltr">{{ token.token }}</td>
                <td>{{ token.desc || '-' }}</td>
                <td class="sui-num text-caption" dir="ltr">{{ dateFormatted(token.expiry) }}</td>
                <td class="text-end">
                  <v-menu
                    v-model="delOverlay[index]"
                    :close-on-content-click="false"
                    location="top end"
                  >
                    <template v-slot:activator="{ props }">
                      <v-btn
                        icon="mdi-delete-outline"
                        variant="text"
                        color="error"
                        size="small"
                        v-bind="props"
                        :aria-label="$t('actions.del')"
                      />
                    </template>
                    <v-card min-width="240" rounded="lg">
                      <div class="sui-modal-header py-3 px-4">
                        <span class="text-subtitle-2 font-weight-semibold">{{ $t('actions.del') }}</span>
                      </div>
                      <v-divider />
                      <div class="px-4 py-3 text-body-2">{{ $t('confirm') }}</div>
                      <v-divider />
                      <div class="sui-modal-actions py-2 px-3">
                        <v-btn variant="text" size="small" @click="delOverlay[index] = false">
                          {{ $t('no') }}
                        </v-btn>
                        <v-btn color="error" variant="flat" size="small" @click="deleteToken(token.id)">
                          {{ $t('yes') }}
                        </v-btn>
                      </div>
                    </v-card>
                  </v-menu>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <v-dialog v-model="showNewToken" width="100%" max-width="420">
          <v-card class="sui-modal-card">
            <div class="sui-modal-header">
              <div class="d-flex align-center ga-3 min-w-0">
                <v-avatar color="primary" variant="tonal" size="32" rounded="md" class="flex-shrink-0">
                  <v-icon icon="mdi-key-plus" size="18" />
                </v-avatar>
                <div class="text-subtitle-1 font-weight-semibold text-truncate">
                  {{ $t('actions.add') }} {{ $t('admin.api.token') }}
                </div>
              </div>
              <v-btn
                icon="mdi-close"
                variant="text"
                size="small"
                :aria-label="$t('actions.close')"
                @click="showNewToken = false"
              />
            </div>

            <v-divider />

            <div class="sui-modal-body">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="newToken.desc"
                    :label="$t('client.desc')"
                    hide-details
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model.number="newToken.expiry"
                    :label="$t('date.expiry')"
                    min="0"
                    type="number"
                    :suffix="$t('date.d')"
                    hide-details
                  />
                </v-col>
              </v-row>
            </div>

            <v-divider />

            <div class="sui-modal-actions">
              <v-btn variant="text" @click="showNewToken = false">
                {{ $t('actions.close') }}
              </v-btn>
              <v-btn color="primary" variant="flat" :loading="loading" @click="addToken">
                {{ $t('actions.add') }}
              </v-btn>
            </div>
          </v-card>
        </v-dialog>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="showAddToken()">
          {{ $t('actions.add') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="closeModal">
          {{ $t('actions.close') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { copyToClipboard } from '@/plugins/copy'

export default {
  props: ['visible', 'user'],
  emits: ['close'],
  data() {
    return {
      loading: false,
      tokens: <any[]>[],
      showNewToken: false,
      newToken: {
        desc: '',
        token: '',
        expiry: 0,
      },
      delOverlay: new Array<boolean>(0),
    }
  },
  computed: {
    locale() {
      const l = i18n.global.locale.value
      switch (l) {
        case 'zhHans':
          return 'zh-cn'
        case 'zhHant':
          return 'zh-tw'
        default:
          return l
      }
    },
  },
  methods: {
    async loadData() {
      this.loading = true
      const data = await HttpUtils.get('api/tokens')
      if (data.success) {
        this.tokens = data.obj ?? []
        this.delOverlay = new Array<boolean>(this.tokens.length).fill(false)
      }
      this.loading = false
    },
    resetNewToken() {
      this.newToken = {
        desc: '',
        token: '',
        expiry: 30,
      }
    },
    showAddToken() {
      this.resetNewToken()
      this.showNewToken = true
    },
    async addToken() {
      this.loading = true
      this.newToken.expiry = this.newToken.expiry > 0 ? this.newToken.expiry : 0
      const response = await HttpUtils.post('api/addToken', { desc: this.newToken.desc, expiry: this.newToken.expiry })
      if (response.success) {
        this.newToken.token = response.obj
        this.loadData()
        this.showNewToken = false
      }
      this.loading = false
    },
    async deleteToken(id: number) {
      this.loading = true
      const response = await HttpUtils.post('api/deleteToken', { id: id })
      if (response.success) {
        this.loadData()
      }
      this.loading = false
    },
    dateFormatted(expiry: number) {
      if (expiry == 0) return i18n.global.t('unlimited')
      const date = new Date(expiry * 1000)
      return date.toLocaleString(this.locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    },
    copyToClipboard,
    closeModal() {
      this.$emit('close')
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.resetNewToken()
        this.loadData()
      }
    },
  },
}
</script>

<style scoped>
.sui-token-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.sui-token-value {
  flex: 1 1 200px;
  min-width: 0;
  word-break: break-all;
  font-size: 0.8125rem;
}

.sui-tokens-table {
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-md);
}
</style>
