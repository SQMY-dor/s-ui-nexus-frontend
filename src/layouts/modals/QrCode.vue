<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="500">
    <v-card id="qrcode-modal" class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-qrcode" size="18" />
          </v-avatar>
          <div class="min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('ui.qrTitle') }}
            </div>
            <div v-if="client?.name" class="text-caption text-medium-emphasis sui-mono text-truncate">
              {{ client.name }}
            </div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="$emit('close')"
        />
      </div>

      <v-divider />

      <template v-if="!loading">
        <v-tabs v-model="tab" density="compact" fixed-tabs align-tabs="center">
          <v-tab value="sub">{{ $t('setting.sub') }}</v-tab>
          <v-tab value="link">{{ $t('client.links') }}</v-tab>
        </v-tabs>
        <v-divider />
      </template>

      <div class="sui-modal-body">
        <v-skeleton-loader
          v-if="loading"
          type="heading, image, divider, heading, image"
        />

        <v-window v-show="!loading" v-model="tab">
          <v-window-item value="sub">
            <div class="d-flex flex-column ga-4">
              <div class="sui-qr-item">
                <div class="sui-section-header">
                  <span>{{ $t('setting.sub') }}</span>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-content-copy"
                    @click="copyToClipboard(clientSub)"
                  >
                    {{ $t('ui.copyUrl') }}
                  </v-btn>
                </div>
                <div class="d-flex justify-center my-2">
                  <button
                    type="button"
                    class="sui-qr-frame sui-qr-btn"
                    :aria-label="$t('copyToClipboard')"
                    @click="copyToClipboard(clientSub)"
                  >
                    <QrcodeVue :value="clientSub" :size="size" :margin="1" />
                  </button>
                </div>
                <div class="sui-mono sui-url-box text-caption mt-2" dir="ltr">
                  {{ clientSub }}
                </div>
              </div>

              <div class="sui-qr-item">
                <div class="sui-section-header">
                  <span>{{ $t('setting.jsonSub') }}</span>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-content-copy"
                    @click="copyToClipboard(clientSub + '?format=json')"
                  >
                    {{ $t('ui.copyUrl') }}
                  </v-btn>
                </div>
                <div class="d-flex justify-center my-2">
                  <button
                    type="button"
                    class="sui-qr-frame sui-qr-btn"
                    :aria-label="$t('copyToClipboard')"
                    @click="copyToClipboard(clientSub + '?format=json')"
                  >
                    <QrcodeVue :value="clientSub + '?format=json'" :size="size" :margin="1" />
                  </button>
                </div>
                <div class="sui-mono sui-url-box text-caption mt-2" dir="ltr">
                  {{ clientSub + '?format=json' }}
                </div>
              </div>

              <div class="sui-qr-item">
                <div class="sui-section-header">
                  <span>{{ $t('setting.clashSub') }}</span>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-content-copy"
                    @click="copyToClipboard(clientSub + '?format=clash')"
                  >
                    {{ $t('ui.copyUrl') }}
                  </v-btn>
                </div>
                <div class="d-flex justify-center my-2">
                  <button
                    type="button"
                    class="sui-qr-frame sui-qr-btn"
                    :aria-label="$t('copyToClipboard')"
                    @click="copyToClipboard(clientSub + '?format=clash')"
                  >
                    <QrcodeVue :value="clientSub + '?format=clash'" :size="size" :margin="1" />
                  </button>
                </div>
                <div class="sui-mono sui-url-box text-caption mt-2" dir="ltr">
                  {{ clientSub + '?format=clash' }}
                </div>
              </div>

              <div class="sui-qr-item">
                <div class="sui-section-header">
                  <span>SING-BOX</span>
                </div>
                <div class="d-flex justify-center my-2">
                  <div class="sui-qr-frame">
                    <QrcodeVue :value="singbox" :size="size" :margin="1" />
                  </div>
                </div>
              </div>
            </div>
          </v-window-item>

          <v-window-item value="link">
            <v-alert v-if="clientLinks.length === 0" type="info" variant="tonal" density="compact">
              {{ $t('noData') }}
            </v-alert>
            <div v-else class="d-flex flex-column ga-4">
              <div v-for="l in clientLinks" :key="l.uri" class="sui-qr-item">
                <div class="sui-section-header">
                  <span class="text-truncate">{{ l.remark ?? $t('client.' + l.type) }}</span>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-content-copy"
                    @click="copyToClipboard(l.uri)"
                  >
                    {{ $t('ui.copyUrl') }}
                  </v-btn>
                </div>
                <div class="d-flex justify-center my-2">
                  <button
                    type="button"
                    class="sui-qr-frame sui-qr-btn"
                    :aria-label="$t('copyToClipboard')"
                    @click="copyToClipboard(l.uri)"
                  >
                    <QrcodeVue :value="l.uri" :size="size" :margin="1" />
                  </button>
                </div>
                <div class="sui-mono sui-url-box text-caption mt-2" dir="ltr">
                  {{ l.uri }}
                </div>
              </div>
            </div>
          </v-window-item>
        </v-window>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="$emit('close')">
          {{ $t('actions.close') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import QrcodeVue from 'qrcode.vue'
import Data from '@/store/modules/data'
import { copyToClipboard } from '@/plugins/copy'

export default {
  props: ['id', 'visible'],
  emits: ['close'],
  data() {
    return {
      tab: 'sub',
      client: <any>{},
      loading: false,
    }
  },
  methods: {
    async load() {
      this.loading = true
      const newData = await Data().loadClients(this.$props.id)
      this.client = newData
      this.loading = false
    },
    copyToClipboard,
  },
  computed: {
    clientSub() {
      return Data().subURI + encodeURIComponent(this.client.subId || this.client.name)
    },
    singbox() {
      const url = Data().subURI + encodeURIComponent(this.client.subId || this.client.name) + '?format=json'
      return 'sing-box://import-remote-profile?url=' + encodeURIComponent(url) + '#' + this.client.name
    },
    clientLinks() {
      return this.client.links ?? []
    },
    size() {
      if (window.innerWidth > 380) return 240
      if (window.innerWidth > 330) return 220
      return 200
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.tab = 'sub'
        this.load()
      }
    },
  },
  components: { QrcodeVue },
}
</script>

<style scoped>
.sui-qr-item {
  padding: 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-qr-btn {
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.sui-qr-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--sui-shadow-card);
}

.sui-qr-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.sui-url-box {
  padding: 8px 10px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  word-break: break-all;
  max-height: 72px;
  overflow-y: auto;
}
</style>
