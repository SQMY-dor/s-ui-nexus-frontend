<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="860">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-routes" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.' + title) + ' ' + $t('objects.rule') }}
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <JsonObjectEditor v-model="ruleData" />
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
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
          <v-switch v-model="logical" color="primary" :label="$t('rule.logical')" hide-details />
          <v-btn
            v-if="logical"
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-plus"
            @click="ruleData.rules.push(<rule>{})"
          >
            {{ $t('actions.add') + ' ' + $t('objects.rule') }}
          </v-btn>
        </div>

        <template v-if="ruleData.type == 'logical'">
          <div v-for="(r, index) in ruleData.rules" :key="index" class="sui-sub-panel mb-3">
            <div class="sui-section-header">
              <span>{{ $t('objects.rule') + ' ' + (Number(index) + 1) }}</span>
              <v-btn
                v-if="ruleData.rules.length > 1"
                icon="mdi-delete-outline"
                variant="text"
                color="error"
                size="small"
                :aria-label="$t('actions.del')"
                @click="ruleData.rules.splice(index, 1)"
              />
            </div>
            <RuleOptions
              :rule="r"
              :clients="clients"
              :inTags="inTags"
              :outTags="outTags"
              :rsTags="rsTags"
            />
          </div>
        </template>
        <RuleOptions
          v-else
          :rule="ruleData.rules[0]"
          :clients="clients"
          :inTags="inTags"
          :outTags="outTags"
          :rsTags="rsTags"
        />

        <div class="sui-section-header mt-5">
          <span>{{ $t('admin.action') }}</span>
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="ruleData.action"
              :items="actions"
              :label="$t('admin.action')"
              hide-details
            />
          </v-col>
          <v-col v-if="logical" cols="12" sm="6" md="4">
            <v-combobox
              v-model="ruleData.mode"
              :items="['and', 'or']"
              :label="$t('rule.mode')"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="4" class="d-flex align-center">
            <v-switch v-model="ruleData.invert" color="primary" :label="$t('rule.invert')" hide-details />
          </v-col>
        </v-row>

        <div v-if="ruleData.action == 'route'" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>{{ $t('dns.rule.action.route') }}</span>
          </div>
          <v-row>
            <v-col cols="12" sm="6" md="5">
              <v-select
                v-model="ruleData.outbound"
                :items="outTags"
                :label="$t('objects.outbound')"
                hide-details
              />
            </v-col>
          </v-row>
        </div>

        <div v-if="ruleData.action == 'route-options'" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>{{ $t('dns.rule.action.routeOptions') }}</span>
          </div>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="ruleData.override_address"
                dir="ltr"
                class="sui-mono"
                :label="$t('types.direct.overrideAddr')"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model.number="ruleData.override_port"
                type="number"
                min="0"
                max="65534"
                :label="$t('types.direct.overridePort')"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="ruleData.udp_timeout"
                dir="ltr"
                class="sui-mono"
                :label="$t('rule.udpTimeout')"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4" class="d-flex align-center">
              <v-switch v-model="ruleData.udp_disable_domain_unmapping" :label="$t('rule.udpDisableDomainUnmapping')" hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="4" class="d-flex align-center">
              <v-switch v-model="ruleData.udp_connect" :label="$t('rule.udpConnect')" hide-details />
            </v-col>
          </v-row>
        </div>

        <div v-if="ruleData.action == 'reject'" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>{{ $t('dns.rule.action.reject') }}</span>
          </div>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="ruleData.method"
                :items="[{ title: 'Default', value: 'default' }, { title: 'Drop', value: 'drop' }]"
                :label="$t('rule.method')"
                clearable
                hide-details
                @click:clear="delete ruleData.method"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4" class="d-flex align-center">
              <v-switch v-model="ruleData.no_drop" :label="$t('rule.noDrop')" hide-details />
            </v-col>
          </v-row>
        </div>

        <div v-if="ruleData.action == 'sniff'" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>{{ $t('rule.sniffer') }}</span>
          </div>
          <v-row>
            <v-col cols="12" sm="8">
              <v-select
                v-model="ruleData.sniffer"
                :items="sniffers"
                :label="$t('rule.sniffer')"
                multiple
                chips
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="ruleData.timeout"
                dir="ltr"
                class="sui-mono"
                :label="$t('rule.timeout')"
                hide-details
              />
            </v-col>
          </v-row>
        </div>

        <div v-if="ruleData.action == 'resolve'" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>Resolve</span>
          </div>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="ruleData.strategy"
                :items="strategies"
                :label="$t('rule.strategy')"
                clearable
                hide-details
                @click:clear="delete ruleData.strategy"
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="ruleData.server"
                class="sui-mono"
                :label="$t('dns.server')"
                hide-details
              />
            </v-col>
          </v-row>
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
import { logicalRule, rule, actionKeys } from '@/types/rules'
import RuleOptions from '@/components/Rule.vue'

export default {
  props: ['visible', 'data', 'index', 'clients', 'inTags', 'outTags', 'rsTags'],
  emits: ['close', 'save'],
  data() {
    return {
      title: 'add',
      loading: false,
      ruleData: <any>{
        type: 'logical',
        mode: 'and',
        rules: <rule[]>[{}],
        invert: false,
        action: 'route',
        outbound: 'direct',
      },
      actions: [
        { title: 'Route', value: 'route' },
        { title: 'Route Options', value: 'route-options' },
        { title: 'Bypass', value: 'bypass' },
        { title: 'Reject', value: 'reject' },
        { title: 'Hijack DNS', value: 'hijack-dns' },
        { title: 'Sniff', value: 'sniff' },
        { title: 'Resolve', value: 'resolve' },
      ],
      sniffers: [
        { title: 'HTTP', value: 'http' },
        { title: 'TLS', value: 'tls' },
        { title: 'QUIC', value: 'quic' },
        { title: 'STUN', value: 'stun' },
        { title: 'DNS', value: 'dns' },
        { title: 'BitTorrent', value: 'bittorrent' },
        { title: 'DTLS', value: 'dtls' },
        { title: 'SSH', value: 'ssh' },
        { title: 'RDP', value: 'rdp' },
        { title: 'NTP', value: 'ntp' },
      ],
      strategies: [
        { title: 'Prefer IPv4', value: 'prefer_ipv4' },
        { title: 'Prefer IPv6', value: 'prefer_ipv6' },
        { title: 'IPv4 Only', value: 'ipv4_only' },
        { title: 'IPv6 Only', value: 'ipv6_only' },
      ],
    }
  },
  methods: {
    updateData() {
      if (this.$props.index != -1) {
        const newData = JSON.parse(this.$props.data)
        if (newData.type) {
          this.ruleData = newData
        } else {
          this.ruleData = {
            type: 'simple',
            mode: 'and',
            rules: <rule[]>[{}],
          }
          Object.keys(newData).forEach(key => {
            if (actionKeys.includes(key)) {
              this.ruleData[key] = newData[key]
            } else {
              this.ruleData.rules[0][key] = newData[key]
            }
          })
        }
        this.title = 'edit'
      } else {
        this.ruleData = <logicalRule>{
          type: 'simple',
          mode: 'and',
          rules: <rule[]>[{}],
          invert: false,
          action: 'route',
          outbound: this.$props.outTags[0] ?? 'direct',
        }
        this.title = 'add'
      }
    },
    closeModal() {
      this.updateData()
      this.$emit('close')
    },
    saveChanges() {
      this.loading = true
      let newRule = <any>{
        action: this.ruleData.action,
        invert: this.ruleData.invert ? this.ruleData.invert : undefined,
      }

      // Filter action data
      switch (newRule.action) {
        case 'route':
          newRule.outbound = this.ruleData.outbound
          break
        case 'route-options':
          newRule.override_address = this.ruleData.override_address?.length > 0 ? this.ruleData.override_address : undefined
          newRule.override_port = this.ruleData?.override_port > 0 ? this.ruleData.override_port : undefined
          newRule.network_strategy = this.ruleData.network_strategy?.length > 0 ? this.ruleData.network_strategy : undefined
          newRule.fallback_delay = this.ruleData.fallback_delay?.length > 0 ? this.ruleData.fallback_delay : undefined
          newRule.udp_disable_domain_unmapping = this.ruleData.udp_disable_domain_unmapping ? true : undefined
          newRule.udp_connect = this.ruleData.udp_connect ? true : undefined
          newRule.udp_timeout = this.ruleData.udp_timeout?.length > 0 ? this.ruleData.udp_timeout : undefined
          break
        case 'reject':
          newRule.method = this.ruleData.method?.length > 0 ? this.ruleData.method : undefined
          newRule.no_drop = this.ruleData.no_drop ? true : undefined
          break
        case 'sniff':
          newRule.sniffer = this.ruleData.sniffer?.length > 0 ? this.ruleData.sniffer : undefined
          newRule.timeout = this.ruleData.timeout?.length > 0 ? this.ruleData.timeout : undefined
          break
        case 'resolve':
          newRule.strategy = this.ruleData.strategy?.length > 0 ? this.ruleData.strategy : undefined
          newRule.server = this.ruleData.server?.length > 0 ? this.ruleData.server : undefined
          break
      }

      // Add rules
      if (this.ruleData.type == 'simple') {
        newRule = { ...this.ruleData.rules[0], ...newRule }
      } else {
        newRule.type = 'logical'
        newRule.mode = this.ruleData.mode
        newRule.rules = this.ruleData.rules
      }
      this.$emit('save', newRule)
      this.loading = false
    },
    deleteRule(index: number) {
      this.ruleData.rules.splice(index, 1)
    },
  },
  computed: {
    logical: {
      get() { return this.ruleData.type == 'logical' },
      set(v: boolean) {
        this.ruleData.type = v ? 'logical' : 'simple'
      },
    },
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        this.updateData()
      }
    },
  },
  components: { RuleOptions },
}
</script>

<style scoped>
.sui-sub-panel {
  padding: 12px 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}
</style>
