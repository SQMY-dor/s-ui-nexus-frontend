<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="820">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-dns-outline" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.' + title) + ' ' + $t('objects.dnsserver') }}
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <JsonObjectEditor v-model="dnsServer" />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :aria-label="$t('actions.close')"
            @click="close"
          />
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <div class="sui-section-header">
          <span>{{ $t('client.basics') }}</span>
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="dnsServer.type"
              :items="dnsTypes"
              :label="$t('type')"
              hide-details
              @update:model-value="changeType"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="dnsServer.tag" class="sui-mono" :label="$t('objects.tag')" hide-details />
          </v-col>
        </v-row>

        <v-row v-if="HasServer.includes(dnsServer.type)" class="mt-2">
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="dnsServer.server" dir="ltr" class="sui-mono" :label="$t('in.addr')" hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model.number="dnsServer.server_port" type="number" min="0" :label="$t('in.port')" hide-details />
          </v-col>
        </v-row>

        <v-row v-if="HasHeaders.includes(dnsServer.type)" class="mt-2">
          <v-col cols="12" sm="8">
            <v-text-field v-model="dnsServer.path" dir="ltr" class="sui-mono" :label="$t('transport.path')" hide-details />
          </v-col>
        </v-row>

        <template v-if="dnsServer.type == 'hosts'">
          <v-row class="mt-2">
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="hostsPath"
                dir="ltr"
                class="sui-mono"
                :label="$t('transport.path') + ' ' + $t('commaSeparated')"
                hide-details
              />
            </v-col>
          </v-row>

          <div class="sui-section-header mt-5">
            <span>{{ $t('dns.rule.action.predefined') }}</span>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus"
              @click="addHostsPredefined"
            >
              {{ $t('actions.add') }}
            </v-btn>
          </div>

          <div v-if="hostsPredefined.length > 0" class="d-flex flex-column ga-2">
            <v-row v-for="(pd, index) in hostsPredefined" :key="index" align="center">
              <v-col cols="12" sm="5">
                <v-text-field
                  v-model="pd.name"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('setting.domain')"
                  hide-details
                  @input="update_pds_key(index, $event.target.value)"
                />
              </v-col>
              <v-col cols="12" sm="7">
                <v-text-field
                  v-model="pd.value"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('types.tun.addr') + ' ' + $t('commaSeparated')"
                  hide-details
                  @input="update_pds_value(index, $event.target.value)"
                >
                  <template #append>
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      size="small"
                      color="error"
                      :aria-label="$t('actions.del')"
                      @click="delHostsPredefined(index)"
                    />
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </div>
        </template>

        <v-row v-if="dnsServer.type == 'local'" class="mt-2">
          <v-col cols="12" sm="6" md="4">
            <v-switch v-model="dnsServer.prefer_go" color="primary" :label="$t('dns.local.preferGo')" hide-details />
          </v-col>
        </v-row>

        <v-row v-if="dnsServer.type == 'dhcp'" class="mt-2">
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="dnsServer.interface" class="sui-mono" :label="$t('types.tun.ifName')" hide-details />
          </v-col>
        </v-row>

        <v-row v-if="dnsServer.type == 'fakeip'" class="mt-2">
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="dnsServer.inet4_range" dir="ltr" class="sui-mono" :label="$t('dns.rule.inet4Range')" hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="dnsServer.inet6_range" dir="ltr" class="sui-mono" :label="$t('dns.rule.inet6Range')" hide-details />
          </v-col>
        </v-row>

        <v-row v-if="dnsServer.type == 'tailscale' || dnsServer.type == 'resolved'" class="mt-2">
          <v-col v-if="dnsServer.type == 'tailscale'" cols="12" sm="6" md="4">
            <v-select v-model="dnsServer.endpoint" :label="$t('objects.endpoint')" :items="tsTags" hide-details />
          </v-col>
          <v-col v-if="dnsServer.type == 'resolved'" cols="12" sm="6" md="4">
            <v-select v-model="dnsServer.service" :label="$t('objects.service')" :items="rslvdTags" hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="4" class="d-flex align-center">
            <v-switch v-model="dnsServer.accept_default_resolvers" :label="$t('dns.rule.acceptDefault')" hide-details />
          </v-col>
        </v-row>

        <div class="d-flex flex-column ga-3 mt-4">
          <DialVue v-if="!WithoutDial.includes(dnsServer.type)" :dial="dnsServer" />
          <oTlsVue v-if="HasTls.includes(dnsServer.type)" :outbound="dnsServer" />
          <Headers v-if="HasHeaders.includes(dnsServer.type)" :data="dnsServer" />
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="close">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn color="primary" variant="flat" @click="save">
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import DialVue from '@/components/Dial.vue'
import oTlsVue from '@/components/tls/OutTLS.vue'
import Headers from '@/components/Headers.vue'
import RandomUtil from '@/plugins/randomUtil'
import { DnsTypes, createDnsServer } from '@/types/dns'

export default {
  props: ['visible', 'data', 'index', 'tsTags', 'rslvdTags'],
  emits: ['close', 'save'],
  data() {
    return {
      title: 'add',
      dnsServer: createDnsServer('local', { tag: 'dns-' + RandomUtil.randomSeq(3) }),
      dnsTypes: Object.keys(DnsTypes).map((key, index) => ({ title: key, value: Object.values(DnsTypes)[index] })),
      HasServer: [DnsTypes.TCP, DnsTypes.UDP, DnsTypes.TLS, DnsTypes.QUIC, DnsTypes.HTTPS, DnsTypes.HTTP3],
      HasHeaders: [DnsTypes.HTTPS, DnsTypes.HTTP3],
      HasTls: [DnsTypes.TLS, DnsTypes.QUIC, DnsTypes.HTTPS, DnsTypes.HTTP3],
      WithoutDial: [DnsTypes.Hosts, DnsTypes.Tailscale, DnsTypes.FakeIP, DnsTypes.Resolved],
    }
  },
  methods: {
    updateData() {
      if (this.$props.index != -1) {
        this.dnsServer = JSON.parse(this.$props.data)
        this.title = 'edit'
      } else {
        this.dnsServer = createDnsServer('local', { tag: 'dns-' + RandomUtil.randomSeq(3) })
        this.title = 'add'
      }
    },
    changeType(dnsType: string) {
      this.dnsServer = createDnsServer(dnsType, { tag: this.dnsServer.tag })
    },
    close() {
      this.$emit('close')
    },
    save() {
      this.$emit('save', this.dnsServer)
    },
    addHostsPredefined() {
      const newPredefined = { name: 'localhost', value: '127.0.0.1,::1' }
      this.hostsPredefined = [...this.hostsPredefined, newPredefined]
    },
    delHostsPredefined(i: number) {
      const pds = this.hostsPredefined
      pds.splice(i, 1)
      this.hostsPredefined = pds
    },
    update_pds_key(i: number, k: string) {
      const pds = this.hostsPredefined
      pds[i].name = k
      this.hostsPredefined = pds
    },
    update_pds_value(i: number, v: string) {
      const pds = this.hostsPredefined
      pds[i].value = v
      this.hostsPredefined = pds
    },
  },
  computed: {
    hostsPath: {
      get() { return this.dnsServer.path },
      set(v: string) {
        this.dnsServer.path = v.length > 0 ? v.split(',').map((item: string) => item.trim()) : undefined
      },
    },
    hostsPredefined: {
      get(): any[] {
        const pds: any[] = []
        const h = this.dnsServer.predefined
        if (h) {
          Object.keys(h).forEach(key => {
            if (Array.isArray(h[key])) {
              pds.push({ name: key, value: h[key].join(',') })
            } else {
              pds.push({ name: key, value: h[key] })
            }
          })
        }
        return pds
      },
      set(v: any[]) {
        if (v.length > 0) {
          const pds: any = {}
          v.forEach((pd: any) => {
            pds[pd.name] = pd.value.split(',').map((item: string) => item.trim())
          })
          this.dnsServer.predefined = pds
        } else {
          this.dnsServer.predefined = undefined
        }
      },
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.updateData()
      }
    },
  },
  components: { DialVue, oTlsVue, Headers },
}
</script>
