<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="520">
    <v-card id="qrcode-modal" class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-qrcode" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('types.wg.qrTitle') }}
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

      <div class="sui-modal-body">
        <v-skeleton-loader
          v-if="loading"
          type="heading, image, text"
        />

        <v-alert
          v-else-if="wgLinks.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          :text="$t('types.wg.noExportablePeers')"
        />

        <div v-else class="d-flex flex-column ga-4">
          <div
            v-for="item in wgLinks"
            :key="item.filename"
            class="sui-qr-item"
          >
            <template v-if="item.config.length > 0">
              <div class="sui-section-header">
                <span class="sui-mono text-truncate">{{ item.name }}</span>
                <div class="d-flex align-center ga-2 flex-shrink-0">
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-content-copy"
                    @click="copyToClipboard(item.config)"
                  >
                    {{ $t('types.wg.copySecret') }}
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="primary"
                    icon="mdi-download"
                    :aria-label="item.filename"
                    @click="download(item.config, item.filename)"
                  />
                </div>
              </div>

              <div class="d-flex justify-center my-2">
                <button
                  type="button"
                  class="sui-qr-frame sui-qr-btn"
                  :aria-label="$t('copyToClipboard')"
                  @click="copyToClipboard(item.config)"
                >
                  <QrcodeVue :value="item.config" :size="size" :margin="1" />
                </button>
              </div>

              <pre class="sui-mono sui-wg-config mt-3" dir="ltr">{{ item.config }}</pre>
            </template>
          </div>
        </div>
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
import { copyToClipboard } from '@/plugins/copy'
import HttpUtils from '@/plugins/httputil'

export default {
  props: ['data', 'visible'],
  emits: ['close'],
  data() {
    return {
      wgData: <any>{},
      wgLinks: <Array<{ name: string, filename: string, config: string }>>[],
      loading: false,
    }
  },
  methods: {
    async load() {
      this.wgData = this.$props.data
      this.wgLinks = []
      this.loading = true
      for (let index = 0; index < (this.wgData.peers || []).length; index++) {
        const peer = this.wgData.peers[index]
        const hasLegacyKey = (this.wgData.ext?.keys || []).some((key: any) => key.public_key === peer.public_key)
        if (peer.peer_key_mode === 'existing_peer' || (!peer.client_private_key && !peer.client_private_key_set && !hasLegacyKey)) continue
        const response = await HttpUtils.post('api/wireguardExport', { tag: this.wgData.tag, peerIndex: index })
        if (response.success && response.obj?.config) this.wgLinks.push(response.obj)
      }
      this.loading = false
    },
    copyToClipboard,
    download(text: string, filename: string) {
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      element.setAttribute('download', filename)

      element.style.display = 'none'
      document.body.appendChild(element)

      element.click()
      document.body.removeChild(element)
    },
  },
  computed: {
    size() {
      if (window.innerWidth > 380) return 240
      if (window.innerWidth > 330) return 220
      return 200
    },
  },
  watch: {
    visible(v) {
      if (v) {
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

.sui-wg-config {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 180px;
  white-space: pre;
}
</style>
