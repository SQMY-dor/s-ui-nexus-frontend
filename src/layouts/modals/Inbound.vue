<template>
  <v-dialog transition="dialog-bottom-transition" width="800" @after-enter="updateData(id)">
    <v-card class="rounded-lg" :loading="loading">
      <v-card-title>
        {{ $t('actions.' + title) + " " + $t('objects.inbound') }}
      </v-card-title>
      <v-divider></v-divider>
      <v-skeleton-loader
          class="mx-auto border"
          width="95%"
          type="card, text, divider, list-item-two-line"
          v-if="loading"
        ></v-skeleton-loader>
      <v-card-text style="padding: 0 16px; overflow-y: scroll;">
		<div class="d-flex justify-end pt-2"><JsonObjectEditor v-model="inbound" /></div>
        <v-container style="padding: 0;" :hidden="loading">
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-select
              hide-details
              :label="$t('type')"
              :items="Object.keys(inTypes).map((key,index) => ({title: key, value: Object.values(inTypes)[index]}))"
              v-model="inbound.type"
              @update:modelValue="changeType">
              </v-select>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field v-model="inbound.tag" :label="$t('objects.tag')" hide-details></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-switch color="primary" v-model="enable" :label="$t('enable')" hide-details></v-switch>
            </v-col>
          </v-row>
          <v-row v-if="inbound.type != inTypes.Tun && inbound.type != inTypes.Redirect && inbound.type != inTypes.TProxy">
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model.number="volumeGb"
                type="number"
                min="0"
                step="0.1"
                suffix="GiB"
                :label="$t('inbound.limit')"
                :hint="$t('inbound.limitHint')"
                persistent-hint>
              </v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="8" v-if="$props.id > 0" class="d-flex align-center">
              <span dir="ltr" class="me-2">{{ $t('inbound.used') }}: {{ HumanReadable.sizeFormat(usedBytes) }}<template v-if="(inbound.volume ?? 0) > 0"> / {{ HumanReadable.sizeFormat(inbound.volume ?? 0) }}</template></span>
              <v-btn size="small" variant="tonal" color="warning" :loading="resetting" @click="resetTraffic">{{ $t('inbound.resetTraffic') }}</v-btn>
            </v-col>
          </v-row>
          <v-tabs
            v-if="HasInData.includes(inbound.type)"
            v-model="side"
            density="compact"
            fixed-tabs
            align-tabs="center"
          >
            <v-tab value="s">{{ $t('in.sSide') }}</v-tab>
            <v-tab value="c">{{ $t('in.cSide') }}</v-tab>
          </v-tabs>
          <v-window v-model="side" style="margin-top: 10px;">
            <v-window-item value="s">
              <Listen :data="inbound" :inTags="inTags" v-if="inbound.type != inTypes.Tun" />
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
              <Transport v-if="Object.hasOwn(inbound,'transport')" :data="inbound" />
              <Users v-if="hasUser" :clients="clients" :data="initUsers" />
              <InTls v-if="HasTls.includes(inbound.type)"  :inbound="inbound" :tlsConfigs="tlsConfigs" :tls_id="inbound.tls_id" />
              <Multiplex v-if="MuxAvailable.includes(inbound.type)" direction="in" :data="inbound" />
            </v-window-item>
            <v-window-item value="c">
              <OutJsonVue :inData="inbound" :type="inbound.type" />
              <Multiplex v-if="Object.hasOwn(inbound,'multiplex')" direction="out" :data="inbound.out_json" />
              <Dial v-if="inbound.out_json" :dial="inbound.out_json" mode="client" />
              <v-card>
                <v-card-text>
                  <v-card-subtitle>{{ $t('in.multiDomain') }}
                    <v-chip color="primary" density="compact" variant="elevated" @click="add_addr"><v-icon icon="mdi-plus" /></v-chip>
                  </v-card-subtitle>
                  <template v-for="addr,index in inbound.addrs" :key="index">
                    {{ $t('in.addr') }} #{{ (index+1) }} <v-icon icon="mdi-delete" color="error" @click="inbound.addrs?.splice(index,1)" />
                    <v-divider></v-divider>
                    <AddrVue :addr="addr" :hasTls="HasTls.includes(inbound.type)" />
                  </template>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="outlined"
          @click="closeModal"
        >
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :loading="loading"
          @click="saveChanges"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </v-card-actions>
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
      inbound: createInbound("direct",{ id:0, "tag": "" }),
      title: "add",
      loading: false,
      resetting: false,
      HumanReadable,
      side: "s",
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
      OnlyTLS: [InTypes.Hysteria, InTypes.Hysteria2, InTypes.TUIC, InTypes.Naive, InTypes.AnyTls ],
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
        this.title = "edit"
      }
      else {
        const port = RandomUtil.randomIntRange(10000, 60000)
        this.inbound = createInbound("direct",{ id: 0, tag: "direct-"+port ,listen: "::", listen_port: port, enable: true })
        if (this.HasInData.includes(this.inbound.type)){
          this.inbound.addrs = []
          this.inbound.out_json = {}
        } else {
          delete this.inbound.addrs
          delete this.inbound.out_json
        }
        this.title = "add"
        this.loading = false
      }
      this.side = "s"
      this.initUsers = {
        model: 'none',
        values: [],
      }
    },
    changeType() {
      if (!this.inbound.listen_port) this.inbound.listen_port = RandomUtil.randomIntRange(10000, 60000)
      // Tag change only in add inbound
      const tag = this.$props.id > 0 ? this.inbound.tag : this.inbound.type + "-" + this.inbound.listen_port
      // Use previous data
      // The switch and the cap belong to the inbound, not its type: kept.
      const keep = { enable: this.inbound.enable ?? true, volume: this.inbound.volume ?? 0 }
      const prevConfig = { id: this.inbound.id, tag: tag, listen: this.inbound.listen?? "::", listen_port: this.inbound.listen_port, ...keep }
      this.inbound = createInbound(this.inbound.type, this.inbound.type != this.inTypes.Tun ? prevConfig : { tag: tag, ...keep })
      if (this.HasInData.includes(this.inbound.type)){
        this.inbound.addrs = []
        this.inbound.out_json = {}
      } else {
        delete this.inbound.addrs
        delete this.inbound.out_json
      }
      this.side = "s"
    },
    add_addr() {
      this.inbound.addrs?.push(<Addr>{ server: location.hostname, server_port: this.inbound.listen_port })
    },
    async resetTraffic() {
      // Zeroes the counters; an inbound the cap had switched off comes back on.
      this.resetting = true
      const success = await Data().save("inbounds", "resetTraffic", this.inbound.tag)
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
      this.updateData(0) // reset
      this.$emit('close')
    },
    async saveChanges() {
      if (!this.$props.visible) return
      // check duplicate tag
      const isDuplicatedTag = Data().checkTag("inbound", this.inbound.id, this.inbound.tag)
      if (isDuplicatedTag) return

      // save data
      this.loading = true
      let clientIds = []
      if (this.hasUser) {
        switch (this.initUsers.model) {
          case 'all':
            clientIds = this.clients.map((c:any) => c.id)
            break
          case 'group':
            clientIds = this.clients.filter((c:any) => this.initUsers.values.includes(c.group)).map((c:any) => c.id)
            break
          case 'client':
            clientIds = this.initUsers.values
        }
      }
      const success = await Data().save("inbounds", this.$props.id == 0 ? "new" : "edit", this.inbound, clientIds)
      if (success) this.closeModal()
      this.loading = false
    },
  },
  computed: {
    validate() {
      if (this.inbound == undefined) return false
      if (this.inbound.tag == "") return false
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
      if (this.inbound.type == InTypes.ShadowTLS && (<ShadowTLS>this.inbound).version < 3 ) return false
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
    AnyTls, Transport, AddrVue, OutJsonVue, Dial
  }
}
</script>
