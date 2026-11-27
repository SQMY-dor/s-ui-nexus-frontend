<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="860">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-export" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('actions.' + title) + ' ' + $t('objects.outbound') }}
            </div>
            <v-chip v-if="id > 0 && outbound.tag" size="small" variant="tonal" color="secondary" class="sui-mono">
              {{ outbound.tag }}
            </v-chip>
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <JsonObjectEditor v-model="outbound" />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="loading"
            :aria-label="$t('actions.close')"
            @click="closeModal"
          />
        </div>
      </div>

      <v-divider />

      <v-tabs v-model="tab" align-tabs="start" class="px-4">
        <v-tab value="t1">{{ $t('client.basics') }}</v-tab>
        <v-tab value="t2">{{ $t('client.external') }}</v-tab>
      </v-tabs>
      <v-divider />

      <div class="sui-modal-body">
        <v-window v-model="tab">
          <v-window-item value="t1">
            <div class="sui-section-header">
              <span>{{ $t('client.basics') }}</span>
            </div>

            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="outbound.type"
                  hide-details
                  :label="$t('type')"
                  :items="Object.keys(outTypes).map((key, index) => ({ title: key, value: Object.values(outTypes)[index] }))"
                  @update:model-value="changeType"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="outbound.tag" class="sui-mono" :label="$t('objects.tag')" hide-details />
              </v-col>
            </v-row>

            <v-row v-if="!NoServer.includes(outbound.type)" class="mt-2">
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="outbound.server"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('out.addr')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model.number="outbound.server_port"
                  :label="$t('out.port')"
                  type="number"
                  min="0"
                  hide-details
                />
              </v-col>
            </v-row>

            <div class="d-flex flex-column ga-3 mt-4">
              <Socks v-if="outbound.type == outTypes.SOCKS" :data="outbound" />
              <Http v-if="outbound.type == outTypes.HTTP" :data="outbound" />
              <Shadowsocks v-if="outbound.type == outTypes.Shadowsocks" direction="out" :data="outbound" />
              <Vmess v-if="outbound.type == outTypes.VMess" :data="outbound" />
              <Trojan v-if="outbound.type == outTypes.Trojan" :data="outbound" />
              <Hysteria v-if="outbound.type == outTypes.Hysteria" direction="out" :data="outbound" />
              <Naive v-if="outbound.type == outTypes.Naive" direction="out" :data="outbound" />
              <ShadowTls v-if="outbound.type == outTypes.ShadowTLS" :data="outbound" />
              <Vless v-if="outbound.type == outTypes.VLESS" :data="outbound" />
              <Tuic v-if="outbound.type == outTypes.TUIC" direction="out" :data="outbound" />
              <Hysteria2 v-if="outbound.type == outTypes.Hysteria2" direction="out" :data="outbound" />
              <AnyTls v-if="outbound.type == outTypes.AnyTls" :data="outbound" direction="out" />
              <Tor v-if="outbound.type == outTypes.Tor" :data="outbound" />
              <Ssh v-if="outbound.type == outTypes.SSH" :data="outbound" />
              <Selector v-if="outbound.type == outTypes.Selector" :data="outbound" :tags="tags" />
              <UrlTest v-if="outbound.type == outTypes.URLTest" :data="outbound" :tags="tags" />

              <Transport v-if="Object.hasOwn(outbound, 'transport')" :data="outbound" />
              <OutTLS v-if="Object.hasOwn(outbound, 'tls')" :outbound="outbound" />
              <Multiplex v-if="Object.hasOwn(outbound, 'multiplex')" direction="out" :data="outbound" />
              <Dial v-if="!NoDial.includes(outbound.type)" :dial="outbound" />
            </div>
          </v-window-item>

          <v-window-item value="t2">
            <div class="sui-section-header">
              <span>{{ $t('tools.shareLinkConverter') }}</span>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-3">
              {{ $t('tools.shareLinkSubtitle') }}
            </p>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="link"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('client.external')"
                  hide-details
                  @keydown.enter="linkConvert"
                />
              </v-col>
              <v-col cols="12" class="d-flex justify-end mt-1">
                <v-btn
                  color="primary"
                  variant="flat"
                  :loading="loading"
                  :disabled="!link.trim()"
                  @click="linkConvert"
                >
                  {{ $t('submit') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" :disabled="loading" @click="closeModal">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="loading"
          @click="saveChanges"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { OutTypes, createOutbound } from '@/types/outbounds'
import RandomUtil from '@/plugins/randomUtil'
import Dial from '@/components/Dial.vue'
import Multiplex from '@/components/Multiplex.vue'
import Transport from '@/components/Transport.vue'
import OutTLS from '@/components/tls/OutTLS.vue'
import Socks from '@/components/protocols/Socks.vue'
import Http from '@/components/protocols/Http.vue'
import Shadowsocks from '@/components/protocols/Shadowsocks.vue'
import Vmess from '@/components/protocols/Vmess.vue'
import Trojan from '@/components/protocols/Trojan.vue'
import Hysteria from '@/components/protocols/Hysteria.vue'
import Naive from '@/components/protocols/Naive.vue'
import ShadowTls from '@/components/protocols/OutShadowTls.vue'
import Vless from '@/components/protocols/Vless.vue'
import Tuic from '@/components/protocols/Tuic.vue'
import Hysteria2 from '@/components/protocols/Hysteria2.vue'
import Tor from '@/components/protocols/Tor.vue'
import Ssh from '@/components/protocols/Ssh.vue'
import Selector from '@/components/protocols/Selector.vue'
import UrlTest from '@/components/protocols/UrlTest.vue'
import HttpUtils from '@/plugins/httputil'
import AnyTls from '@/components/protocols/AnyTls.vue'
import Data from '@/store/modules/data'

export default {
  props: ['visible', 'data', 'id', 'tags'],
  emits: ['close'],
  data() {
    return {
      outbound: createOutbound('direct', { tag: '' }),
      title: 'add',
      tab: 't1',
      link: '',
      loading: false,
      outTypes: OutTypes,
      NoDial: [OutTypes.Selector, OutTypes.URLTest],
      NoServer: [OutTypes.Direct, OutTypes.Selector, OutTypes.URLTest, OutTypes.Tor],
    }
  },
  methods: {
    updateData(id: number) {
      if (id > 0) {
        const newData = JSON.parse(this.$props.data)
        this.outbound = createOutbound(newData.type, newData)
        this.title = 'edit'
      } else {
        this.outbound = createOutbound('direct', { tag: 'direct-' + RandomUtil.randomSeq(3) })
        this.title = 'add'
      }
      this.tab = 't1'
    },
    changeType() {
      // Tag change only in add outbound
      const tag = this.$props.id > 0 ? this.outbound.tag : this.outbound.type + '-' + RandomUtil.randomSeq(3)
      // Use previous data
      const prevConfig = { id: this.outbound.id, tag: tag, listen: this.outbound.listen, listen_port: this.outbound.listen_port }
      this.outbound = createOutbound(this.outbound.type, prevConfig)
    },
    closeModal() {
      this.updateData(0)
      this.$emit('close')
    },
    async saveChanges() {
      if (!this.$props.visible || this.loading) return
      // check duplicate tag
      const isDuplicatedTag = Data().checkTag('outbound', this.$props.id, this.outbound.tag)
      if (isDuplicatedTag) return

      // save data
      this.loading = true
      try {
        const success = await Data().save('outbounds', this.$props.id == 0 ? 'new' : 'edit', this.outbound)
        if (success) this.closeModal()
      } finally {
        this.loading = false
      }
    },
    async linkConvert() {
      if (this.link.length > 0) {
        this.loading = true
        const msg = await HttpUtils.post('api/linkConvert', { link: this.link })
        this.loading = false
        if (msg.success) {
          this.outbound = msg.obj
          if (this.$props.id > 0) this.outbound.id = this.$props.id
          this.tab = 't1'
          this.link = ''
        }
      }
    },
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        this.updateData(this.$props.id)
      }
    },
  },
  components: {
    Dial, Multiplex, Transport, OutTLS,
    Socks, Http, Shadowsocks, Vmess, Trojan,
    Hysteria, Naive, ShadowTls, Vless, Tuic,
    Hysteria2, AnyTls, Tor, Ssh, Selector, UrlTest,
  },
}
</script>
