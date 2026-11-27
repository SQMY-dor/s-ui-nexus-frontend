<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="880" @after-enter="updateData(id)">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-import" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('actions.' + title) + ' ' + $t('objects.inbound') }}
            </div>
            <v-chip v-if="id > 0 && inbound.tag" size="small" variant="tonal" color="secondary" class="sui-mono">
              {{ inbound.tag }}
            </v-chip>
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <JsonObjectEditor v-model="inbound" />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="closeModal"
          />
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <v-skeleton-loader
          v-if="loading"
          type="article, divider, list-item-two-line, list-item-two-line"
        />

        <div v-show="!loading">
          <div class="sui-section-header">
            <span>{{ $t('client.basics') }}</span>
          </div>

          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="inbound.type"
                hide-details
                :label="$t('type')"
                :items="Object.keys(inTypes).map((key, index) => ({ title: key, value: Object.values(inTypes)[index] }))"
                @update:model-value="changeType"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field v-model="inbound.tag" class="sui-mono" :label="$t('objects.tag')" hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="4" class="d-flex align-center">
              <v-switch v-model="enable" color="primary" :label="$t('enable')" hide-details />
            </v-col>
          </v-row>

          <v-row
            v-if="inbound.type != inTypes.Tun && inbound.type != inTypes.Redirect && inbound.type != inTypes.TProxy"
            class="mt-2"
            align="center"
          >
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model.number="volumeGb"
                type="number"
                min="0"
                step="0.1"
                suffix="GiB"
                :label="$t('inbound.limit')"
                :hint="$t('inbound.limitHint')"
                persistent-hint
              />
            </v-col>
            <v-col v-if="$props.id > 0" cols="12" sm="6" md="8">
              <div class="sui-usage-inline d-flex align-center justify-space-between flex-wrap ga-2">
                <span dir="ltr" class="sui-num text-body-2">
                  <span class="text-medium-emphasis">{{ $t('inbound.used') }}:</span>
                  <strong class="ms-1">{{ HumanReadable.sizeFormat(usedBytes) }}</strong>
                  <span v-if="(inbound.volume ?? 0) > 0" class="text-medium-emphasis">
                    / {{ HumanReadable.sizeFormat(inbound.volume ?? 0) }}
                  </span>
                </span>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="warning"
                  prepend-icon="mdi-restore"
                  :loading="resetting"
                  @click="resetTraffic"
                >
                  {{ $t('inbound.resetTraffic') }}
                </v-btn>
              </div>
            </v-col>
          </v-row>

          <template v-if="HasInData.includes(inbound.type)">
            <v-tabs
              v-model="side"
              density="compact"
              align-tabs="start"
              class="mt-4 sui-inline-tabs"
            >
              <v-tab value="s">{{ $t('in.sSide') }}</v-tab>
              <v-tab value="c">{{ $t('in.cSide') }}</v-tab>
            </v-tabs>
            <v-divider class="mb-4" />
          </template>

          <v-window v-model="side" :class="{ 'mt-4': !HasInData.includes(inbound.type) }">
            <v-window-item value="s">
              <div class="d-flex flex-column ga-3">
                <Listen v-if="inbound.type != inTypes.Tun" :data="inbound" :inTags="inTags" />
                <Direct v-if="inbound.type == inTypes.Direct" :data="inbound" />
                <Shadowsocks v-if="inbound.type == inTypes.Shadowsocks" direction="in" :data="inbound" />
                <Hysteria v-if="inbound.type == inTypes.Hysteria" direction="in" :data="inbound" />
                <Hysteria2 v-if="inbound.type == inTypes.Hysteria2" direction="in" :data="inbound" />
                <Naive v-if="inbound.type == inTypes.Naive" direction="in" :data="inbound" />
                <ShadowTls v-if="inbound.type == inTypes.ShadowTLS" direction="in" :data="inbound" />
                <Tuic v-if="inbound.type == inTypes.TUIC" direction="in" :data="inbound" />
                <Tun v-if="inbound.type == inTypes.Tun" :data="inbound" />
                <AnyTls v-if="inbound.type == inTypes.AnyTls" :data="inbound" direction="in" />
                <TProxy v-if="inbound.type == inTypes.TProxy" :inbound="inbound" />
                <Transport v-if="Object.hasOwn(inbound, 'transport')" :data="inbound" />
                <Users v-if="hasUser" :clients="clients" :data="initUsers" />
                <InTls v-if="HasTls.includes(inbound.type)" :inbound="inbound" :tlsConfigs="tlsConfigs" :tls_id="inbound.tls_id" />
                <Multiplex v-if="MuxAvailable.includes(inbound.type)" direction="in" :data="inbound" />
              </div>
            </v-window-item>

            <v-window-item value="c">
              <div class="d-flex flex-column ga-3">
                <OutJsonVue :inData="inbound" :type="inbound.type" />
                <Multiplex v-if="Object.hasOwn(inbound, 'multiplex')" direction="out" :data="inbound.out_json" />
                <Dial v-if="inbound.out_json" :dial="inbound.out_json" mode="client" />

                <div class="sui-sub-panel">
                  <div class="sui-section-header">
                    <span>{{ $t('in.multiDomain') }}</span>
                    <v-btn
                      size="small"
                      variant="tonal"
                      color="primary"
                      prepend-icon="mdi-plus"
                      @click="add_addr"
                    >
                      {{ $t('actions.add') }}
                    </v-btn>
                  </div>

                  <div v-for="(addr, index) in inbound.addrs" :key="index" class="sui-addr-block">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption font-weight-semibold text-medium-emphasis sui-num">
                        {{ $t('in.addr') }} #{{ index + 1 }}
                      </span>
                      <v-btn
                        icon="mdi-delete-outline"
                        variant="text"
                        color="error"
                        size="small"
                        :aria-label="$t('actions.del')"
                        @click="inbound.addrs?.splice(index, 1)"
                      />
                    </div>
                    <AddrVue :addr="addr" :hasTls="HasTls.includes(inbound.type)" />
                  </div>
                </div>
              </div>
            </v-window-item>
          </v-window>
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="closeModal">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :loading="loading" @click="saveChanges">
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { InTypes, createInbound, Addr, ShadowTLS } from '@/types/inbounds'
import RandomUtil from '@/plugins/randomUtil'
import Dial from '@/components/Dial.vue'
import Listen from '@/components/Listen.vue'
import Direct from '@/components/protocols/Direct.vue'
import Users from '@/components/Users.vue'
import Shadowsocks from '@/components/protocols/Shadowsocks.vue'
import Hysteria from '@/components/protocols/Hysteria.vue'
import Hysteria2 from '@/components/protocols/Hysteria2.vue'
import Naive from '@/components/protocols/Naive.vue'
import ShadowTls from '@/components/protocols/ShadowTls.vue'
import Tuic from '@/components/protocols/Tuic.vue'
import Tun from '@/components/protocols/Tun.vue'
import AnyTls from '@/components/protocols/AnyTls.vue'
import InTls from '@/components/tls/InTLS.vue'
import TProxy from '@/components/protocols/TProxy.vue'
import Multiplex from '@/components/Multiplex.vue'
import Transport from '@/components/Transport.vue'
import AddrVue from '@/components/Addr.vue'
import OutJsonVue from '@/components/OutJson.vue'
import Data from '@/store/modules/data'
import { HumanReadable } from '@/plugins/utils'
import { bindableClients, bytesToGb, gbToBytes } from '@/plugins/inbounds'

export default {
  props: ['visible', 'id', 'inTags', 'tlsConfigs'],
  emits: ['close'],
  data() {
    return {
      inbound: createInbound('direct', { id: 0, tag: '' }),
      title: 'add',
      loading: false,
      resetting: false,
      HumanReadable,
      side: 's',
      inTypes: InTypes,
      inboundWithUsers: ['mixed', 'socks', 'http', 'shadowsocks', 'vmess', 'trojan', 'naive', 'hysteria', 'shadowtls', 'tuic', 'hysteria2', 'vless', 'anytls'],
      initUsers: {
        model: 'none',
        values: <any>[],
      },
      HasInData: [
        InTypes.SOCKS,
        InTypes.HTTP,
        InTypes.Mixed,
        InTypes.Shadowsocks,
        InTypes.VMess,
        InTypes.ShadowTLS,
        InTypes.Trojan,
        InTypes.Hysteria,
        InTypes.VLESS,
        InTypes.AnyTls,
        InTypes.TUIC,
        InTypes.Hysteria2,
        InTypes.Naive,
      ],
      HasTls: [
        InTypes.HTTP,
        InTypes.VMess,
        InTypes.Trojan,
        InTypes.Naive,
        InTypes.Hysteria,
        InTypes.TUIC,
        InTypes.Hysteria2,
        InTypes.VLESS,
        InTypes.AnyTls,
      ],
      MuxAvailable: [
        InTypes.VLESS,
        InTypes.VMess,
        InTypes.Trojan,
        InTypes.Shadowsocks,
      ],
      OnlyTLS: [InTypes.Hysteria, InTypes.Hysteria2, InTypes.TUIC, InTypes.Naive, InTypes.AnyTls],
    }
  },
  methods: {
    async loadData(id: number) {
      this.loading = true
      const inboundArray = await Data().loadInbounds([id])
      this.inbound = inboundArray[0]
      if (this.HasInData.includes(this.inbound.type) && this.inbound.out_json == null) {
        this.inbound.out_json = {}
      }
      this.loading = false
    },
    updateData(id: number) {
      if (id > 0) {
        this.loadData(id)
        this.title = 'edit'
      } else {
        const port = RandomUtil.randomIntRange(10000, 60000)
        this.inbound = createInbound('direct', { id: 0, tag: 'direct-' + port, listen: '::', listen_port: port, enable: true })
        if (this.HasInData.includes(this.inbound.type)) {
          this.inbound.addrs = []
          this.inbound.out_json = {}
        } else {
          delete this.inbound.addrs
          delete this.inbound.out_json
        }
        this.title = 'add'
        this.loading = false
      }
      this.side = 's'
      this.initUsers = {
        model: 'none',
        values: [],
      }
    },
    changeType() {
      if (!this.inbound.listen_port) this.inbound.listen_port = RandomUtil.randomIntRange(10000, 60000)
      // Tag change only in add inbound
      const tag = this.$props.id > 0 ? this.inbound.tag : this.inbound.type + '-' + this.inbound.listen_port
      // The switch and the cap belong to the inbound, not its type: kept.
      const keep = { enable: this.inbound.enable ?? true, volume: this.inbound.volume ?? 0 }
      const prevConfig = { id: this.inbound.id, tag: tag, listen: this.inbound.listen ?? '::', listen_port: this.inbound.listen_port, ...keep }
      this.inbound = createInbound(this.inbound.type, this.inbound.type != this.inTypes.Tun ? prevConfig : { tag: tag, ...keep })
      if (this.HasInData.includes(this.inbound.type)) {
        this.inbound.addrs = []
        this.inbound.out_json = {}
      } else {
        delete this.inbound.addrs
        delete this.inbound.out_json
      }
      this.side = 's'
    },
    add_addr() {
      this.inbound.addrs?.push(<Addr>{ server: location.hostname, server_port: this.inbound.listen_port })
    },
    async resetTraffic() {
      // Zeroes the counters; an inbound the cap had switched off comes back on.
      this.resetting = true
      const success = await Data().save('inbounds', 'resetTraffic', this.inbound.tag)
      this.resetting = false
      if (success) {
        const fresh = await Data().loadInbounds([this.inbound.id])
        if (fresh?.[0]) {
          this.inbound.up = fresh[0].up ?? 0
          this.inbound.down = fresh[0].down ?? 0
          this.inbound.enable = fresh[0].enable ?? true
        }
      }
    },
    closeModal() {
      this.updateData(0)
      this.$emit('close')
    },
    async saveChanges() {
      if (!this.$props.visible) return
      // check duplicate tag
      const isDuplicatedTag = Data().checkTag('inbound', this.inbound.id, this.inbound.tag)
      if (isDuplicatedTag) return

      // save data
      this.loading = true
      let clientIds = []
      if (this.hasUser) {
        switch (this.initUsers.model) {
          case 'all':
            clientIds = this.clients.map((c: any) => c.id)
            break
          case 'group':
            clientIds = this.clients.filter((c: any) => this.initUsers.values.includes(c.group)).map((c: any) => c.id)
            break
          case 'client':
            clientIds = this.initUsers.values
        }
      }
      const success = await Data().save('inbounds', this.$props.id == 0 ? 'new' : 'edit', this.inbound, clientIds)
      if (success) this.closeModal()
      this.loading = false
    },
  },
  computed: {
    validate() {
      if (this.inbound == undefined) return false
      if (this.inbound.tag == '') return false
      if (this.inbound.listen_port > 65535 || this.inbound.listen_port < 1) return false
      if (this.OnlyTLS.includes(this.inbound.type) && this.inbound.tls_id == 0) return false
      return true
    },
    clients() {
      // @cluster clients are pushed here by an upstream master and are never
      // bound by this panel (the backend skips them too).
      return bindableClients(<any[]>(Data().clients ?? []))
    },
    enable: {
      get(): boolean { return this.inbound.enable !== false },
      set(v: boolean) { this.inbound.enable = v },
    },
    volumeGb: {
      get(): number { return bytesToGb(this.inbound.volume ?? 0) },
      set(v: unknown) { this.inbound.volume = gbToBytes(v) },
    },
    usedBytes(): number { return (this.inbound.up ?? 0) + (this.inbound.down ?? 0) },
    hasUser() {
      if (this.$props.id > 0) return false
      if (!this.inboundWithUsers.includes(this.inbound.type)) return false
      if (this.inbound.type == InTypes.ShadowTLS && (<ShadowTLS>this.inbound).version < 3) return false
      if ((<any>this.inbound).managed) return false
      return true
    },
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        this.loading = true
      }
    },
  },
  components: {
    Listen, InTls, Hysteria2, Naive, Direct, Shadowsocks,
    Users, Hysteria, ShadowTls, TProxy, Multiplex, Tuic, Tun,
    AnyTls, Transport, AddrVue, OutJsonVue, Dial,
  },
}
</script>

<style scoped>
.sui-usage-inline,
.sui-sub-panel {
  padding: 12px 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-addr-block + .sui-addr-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--sui-hairline);
}
</style>
