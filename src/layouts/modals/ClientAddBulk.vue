<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="780">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-account-multiple-plus-outline" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.addbulk') }}
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
        <div class="sui-section-header">
          <span>{{ $t('client.basics') }}</span>
        </div>
        <v-row>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="count"
              type="number"
              min="1"
              max="100"
              :label="$t('count')"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="8">
            <v-combobox
              v-model="bulkData.group"
              :items="groups"
              :label="$t('client.group')"
              hide-details
            />
          </v-col>
          <v-col cols="12">
            <v-combobox
              v-model="bulkData.name"
              chips
              multiple
              :items="patterns"
              :label="$t('client.name')"
              hide-details
            />
          </v-col>
          <v-col cols="12">
            <v-combobox
              v-model="bulkData.desc"
              chips
              multiple
              :items="patterns"
              :label="$t('client.desc')"
              hide-details
            />
          </v-col>
        </v-row>

        <div class="sui-section-header mt-5">
          <span>{{ $t('stats.volume') }} &amp; {{ $t('date.expiry') }}</span>
        </div>
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model.number="bulkData.Volume"
              type="number"
              min="0"
              :label="$t('stats.volume')"
              suffix="GiB"
              hide-details
            />
          </v-col>
          <v-col v-if="!(bulkData.delayStart && !bulkData.autoReset)" cols="12" sm="6" md="4">
            <DatePick :expiry="bulkData.expiry" @submit="setDate" />
          </v-col>
          <v-col v-if="bulkData.autoReset || bulkData.delayStart" cols="12" sm="6" md="4">
            <v-text-field
              v-model.number="bulkData.resetDays"
              type="number"
              min="1"
              :label="$t('client.resetDays')"
              hide-details
            />
          </v-col>
        </v-row>
        <v-row class="mt-1">
          <v-col cols="12" sm="6" md="4">
            <v-switch
              v-model="bulkData.delayStart"
              color="primary"
              :label="$t('client.delayStart')"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-switch
              v-model="bulkData.autoReset"
              color="primary"
              :label="$t('client.autoReset')"
              hide-details
            />
          </v-col>
        </v-row>

        <div class="sui-section-header mt-5">
          <span>{{ $t('client.inboundTags') }}</span>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-set-all"
            @click="setAllInbounds"
          >
            {{ $t('all') }}
          </v-btn>
        </div>
        <v-row>
          <v-col cols="12">
            <v-select
              v-model="bulkData.clientInbounds"
              :items="inboundTags"
              :label="$t('client.inboundTags')"
              multiple
              chips
              hide-details
            />
          </v-col>
        </v-row>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="closeModal">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          @click="saveChanges"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import DatePick from '@/components/DateTime.vue'
import { push } from 'notivue'
import RandomUtil from '@/plugins/randomUtil'
import { Client, createClient, randomConfigs } from '@/types/clients'
import { i18n } from '@/locales'
import Data from '@/store/modules/data'

export default {
  props: ['visible', 'inboundTags', 'groups'],
  emits: ['close'],
  data() {
    return {
      count: 1,
      clients: <Client[]>[],
      bulkData: {
        name: <any[]>[],
        desc: <any[]>[],
        group: '',
        clientInbounds: [],
        expiry: 0,
        Volume: 0,
        delayStart: false,
        autoReset: false,
        resetDays: 0,
      },
      patterns: [
        { title: i18n.global.t('bulk.random'), value: 'random' },
        { title: i18n.global.t('bulk.order'), value: 'order' },
      ],
      loading: false,
    }
  },
  methods: {
    resetData() {
      this.count = 1
      this.clients = []
      this.bulkData = {
        name: [this.patterns[1], '-', this.patterns[0]],
        desc: [],
        group: '',
        clientInbounds: [],
        expiry: 0,
        Volume: 0,
        delayStart: false,
        autoReset: false,
        resetDays: 0,
      }
    },
    closeModal() {
      this.$emit('close')
    },
    async saveChanges() {
      if (!this.$props.visible) return
      if (this.bulkData.name.findIndex(n => typeof n == 'object') == -1) {
        push.error(i18n.global.t('error.dplData'))
        return
      }
      this.clients = []
      this.loading = true
      for (let i = 0; i < this.count; i++) {
        const name = this.genByPattern(this.bulkData.name, i)
        this.clients.push(createClient({
          enable: true,
          name: name,
          config: randomConfigs(name),
          inbounds: this.bulkData.clientInbounds.length > 0 ? this.bulkData.clientInbounds.sort() : [],
          links: [],
          volume: this.bulkData.Volume * (1024 ** 3),
          expiry: (this.bulkData.delayStart && !this.bulkData.autoReset) ? 0 : this.bulkData.expiry,
          up: 0,
          down: 0,
          desc: this.genByPattern(this.bulkData.desc, i),
          group: this.bulkData.group,
          delayStart: this.bulkData.delayStart,
          autoReset: this.bulkData.autoReset,
          resetDays: this.bulkData.resetDays,
        }))
      }
      // Check duplicate names
      const isDuplicateName = Data().checkBulkClientNames(this.clients.map(c => c.name))
      if (isDuplicateName) {
        this.loading = false
        return
      }
      const success = await Data().save('clients', 'addbulk', this.clients)
      if (success) this.closeModal()
      this.loading = false
    },
    genByPattern(pattern: any[], order: number) {
      if (pattern.length == 0) return RandomUtil.randomSeq(8)
      let result = ''
      pattern.forEach(p => {
        switch (typeof p) {
          case 'object':
            switch (p.value) {
              case 'random':
                result += RandomUtil.randomSeq(8)
                break
              case 'order':
                result += order + 1
            }
            break
          default:
            result += p
        }
      })
      return result
    },
    setDate(v: number) {
      this.bulkData.expiry = v
    },
    setAllInbounds() {
      this.bulkData.clientInbounds = this.inboundTags.map((i: any) => i.value).sort()
    },
  },
  computed: {},
  watch: {
    visible(newValue) {
      if (newValue) {
        this.resetData()
      }
    },
  },
  components: { DatePick },
}
</script>
