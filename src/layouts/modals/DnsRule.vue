<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="860">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-filter-variant" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.' + title) + ' ' + $t('objects.dnsrule') }}
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
            @click="ruleData.rules.push(<dnsRule>{})"
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
              :ruleSets="ruleSets"
            />
          </div>
        </template>
        <RuleOptions
          v-else
          :rule="ruleData.rules[0]"
          :clients="clients"
          :inTags="inTags"
          :ruleSets="ruleSets"
        />

        <div class="sui-section-header mt-5">
          <span>{{ $t('dns.rule.action.title') }}</span>
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="ruleData.action"
              :items="actions"
              :label="$t('dns.rule.action.title')"
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

        <div v-if="['route', 'route-options'].includes(ruleData.action)" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>{{ $t('dns.rule.action.route') }}</span>
          </div>
          <v-row v-if="ruleData.action == 'route'" class="mb-2">
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="ruleData.server"
                :items="serverTags"
                :label="$t('dns.server')"
                hide-details
              />
            </v-col>
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
          </v-row>
          <v-row>
            <v-col cols="12" sm="6" md="4" class="d-flex align-center">
              <v-switch v-model="ruleData.disable_cache" :label="$t('dns.disableCache')" hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model.number="ruleData.rewrite_ttl"
                type="number"
                min="0"
                :label="$t('dns.rule.action.rewriteTtl')"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="ruleData.client_subnet"
                dir="ltr"
                class="sui-mono"
                :label="$t('dns.rule.action.clientSubnet')"
                hide-details
              />
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

        <div v-if="ruleData.action == 'predefined'" class="sui-sub-panel mt-4">
          <div class="sui-section-header">
            <span>{{ $t('dns.rule.action.predefined') }}</span>
          </div>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="ruleData.rcode"
                :items="predefinedRcode"
                :label="$t('dns.rule.action.rcode')"
                clearable
                hide-details
                @click:clear="delete ruleData.rcode"
              />
            </v-col>
          </v-row>
          <v-row v-if="ruleData.rcode == 'NOERROR'" class="mt-2">
            <v-col cols="12">
              <v-text-field
                v-model="answer"
                dir="ltr"
                class="sui-mono"
                :label="$t('dns.rule.action.answer') + ' ' + $t('commaSeparated')"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="ns"
                dir="ltr"
                class="sui-mono"
                :label="$t('dns.rule.action.ns') + ' ' + $t('commaSeparated')"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="extra"
                dir="ltr"
                class="sui-mono"
                :label="$t('dns.rule.action.extra') + ' ' + $t('commaSeparated')"
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
import { logicalDnsRule, dnsRule, actionDnsRuleKeys } from '@/types/dns'
import RuleOptions from '@/components/DnsRule.vue'
import { i18n } from '@/locales'

export default {
  props: ['visible', 'data', 'index', 'clients', 'inTags', 'serverTags', 'ruleSets'],
  emits: ['close', 'save'],
  data() {
    return {
      title: 'add',
      loading: false,
      ruleData: <any>{
        type: 'logical',
        mode: 'and',
        rules: <dnsRule[]>[{}],
        invert: false,
        action: 'route',
        server: 'local',
      },
      actions: [
        { title: i18n.global.t('dns.rule.action.route'), value: 'route' },
        { title: i18n.global.t('dns.rule.action.routeOptions'), value: 'route-options' },
        { title: i18n.global.t('dns.rule.action.reject'), value: 'reject' },
        { title: i18n.global.t('dns.rule.action.predefined'), value: 'predefined' },
      ],
      strategies: [
        { title: 'Prefer IPv4', value: 'prefer_ipv4' },
        { title: 'Prefer IPv6', value: 'prefer_ipv6' },
        { title: 'IPv4 Only', value: 'ipv4_only' },
        { title: 'IPv6 Only', value: 'ipv6_only' },
      ],
      predefinedRcode: [
        { title: i18n.global.t('dns.rule.action.rcodes.noError'), value: 'NOERROR' },
        { title: i18n.global.t('dns.rule.action.rcodes.formerr'), value: 'FORMERR' },
        { title: i18n.global.t('dns.rule.action.rcodes.servFail'), value: 'SERVFAIL' },
        { title: i18n.global.t('dns.rule.action.rcodes.nxDomain'), value: 'NXDOMAIN' },
        { title: i18n.global.t('dns.rule.action.rcodes.notImp'), value: 'NOTIMP' },
        { title: i18n.global.t('dns.rule.action.rcodes.refused'), value: 'REFUSED' },
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
            rules: <dnsRule[]>[{}],
          }
          Object.keys(newData).forEach(key => {
            if (actionDnsRuleKeys.includes(key)) {
              this.ruleData[key] = newData[key]
            } else {
              this.ruleData.rules[0][key] = newData[key]
            }
          })
        }
        this.title = 'edit'
      } else {
        this.ruleData = <logicalDnsRule>{
          type: 'simple',
          mode: 'and',
          rules: <dnsRule[]>[{}],
          invert: false,
          action: 'route',
          server: this.$props.serverTags[0] ?? 'local',
        }
        this.title = 'add'
      }
    },
    closeModal() {
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
          newRule.server = this.ruleData.server
          newRule.strategy = this.ruleData.strategy?.length > 0 ? this.ruleData.strategy : undefined
          newRule.disable_cache = this.ruleData.disable_cache ? true : undefined
          newRule.rewrite_ttl = this.ruleData.rewrite_ttl > 0 ? this.ruleData.rewrite_ttl : undefined
          newRule.client_subnet = this.ruleData.client_subnet?.length > 0 ? this.ruleData.client_subnet : undefined
          break
        case 'route-options':
          newRule.disable_cache = this.ruleData.disable_cache ? true : undefined
          newRule.rewrite_ttl = this.ruleData.rewrite_ttl > 0 ? this.ruleData.rewrite_ttl : undefined
          newRule.client_subnet = this.ruleData.client_subnet?.length > 0 ? this.ruleData.client_subnet : undefined
          break
        case 'reject':
          newRule.method = this.ruleData.method?.length > 0 ? this.ruleData.method : undefined
          newRule.no_drop = this.ruleData.no_drop ? true : undefined
          break
        case 'predefined':
          newRule.rcode = this.ruleData.rcode?.length > 0 ? this.ruleData.rcode : undefined
          if (this.ruleData.rcode == 'NOERROR') {
            newRule.answer = this.ruleData.answer
            newRule.ns = this.ruleData.ns
            newRule.extra = this.ruleData.extra
          }
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
    answer: {
      get() { return this.ruleData.answer?.length > 0 ? this.ruleData.answer.join(',') : '' },
      set(v: string) { this.ruleData.answer = v.length > 0 ? v.split(',') : undefined },
    },
    ns: {
      get() { return this.ruleData.ns?.length > 0 ? this.ruleData.ns.join(',') : '' },
      set(v: string) { this.ruleData.ns = v.length > 0 ? v.split(',') : undefined },
    },
    extra: {
      get() { return this.ruleData.extra?.length > 0 ? this.ruleData.extra.join(',') : '' },
      set(v: string) { this.ruleData.extra = v.length > 0 ? v.split(',') : undefined },
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
