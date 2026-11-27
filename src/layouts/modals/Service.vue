<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="860">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-cog-outline" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.' + title) + ' ' + $t('objects.service') }}
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <JsonObjectEditor v-model="srv" />
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
        <div class="sui-section-header">
          <span>{{ $t('client.basics') }}</span>
        </div>

        <v-row class="mb-3">
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="srv.type"
              hide-details
              :label="$t('type')"
              :items="Object.keys(srvTypes).map((key, index) => ({ title: key, value: Object.values(srvTypes)[index] }))"
              @update:model-value="changeType"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="srv.tag" class="sui-mono" :label="$t('objects.tag')" hide-details />
          </v-col>
        </v-row>

        <div class="d-flex flex-column ga-3">
          <Listen :data="srv" :inTags="inTags" />
          <Derp v-if="srv.type == srvTypes.DERP" :data="srv" :inTags="inTags" :tsTags="tsTags" />
          <SSMapi v-if="srv.type == srvTypes.SSMAPI" :data="srv" :ssTags="ssTags" />
          <Ocm v-if="srv.type == srvTypes.OCM" :data="srv" />
          <Ccm v-if="srv.type == srvTypes.CCM" :data="srv" />
          <InTLS v-if="HasTls.includes(srv.type)" :inbound="srv" :tlsConfigs="tlsConfigs" :tls_id="srv.tls_id" />
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
import { SrvTypes, createSrv } from '@/types/services'
import RandomUtil from '@/plugins/randomUtil'
import Listen from '@/components/Listen.vue'
import Derp from '@/components/services/Derp.vue'
import Ocm from '@/components/services/Ocm.vue'
import Ccm from '@/components/services/Ccm.vue'
import InTLS from '@/components/tls/InTLS.vue'
import SSMapi from '@/components/services/SSMAPI.vue'
import Data from '@/store/modules/data'

export default {
  props: ['visible', 'data', 'id', 'inTags', 'tsTags', 'ssTags', 'tlsConfigs'],
  emits: ['close'],
  data() {
    return {
      srv: createSrv('derp', { tag: '' }),
      title: 'add',
      tab: 't1',
      loading: false,
      srvTypes: SrvTypes,
      HasTls: [SrvTypes.DERP, SrvTypes.SSMAPI, SrvTypes.OCM, SrvTypes.CCM],
    }
  },
  methods: {
    async updateData(id: number) {
      if (id > 0) {
        const newData = JSON.parse(this.$props.data)
        this.srv = createSrv(newData.type, newData)
        this.title = 'edit'
      } else {
        const port = RandomUtil.randomIntRange(10000, 60000)
        this.srv = createSrv('derp', {
          tag: 'derp-' + RandomUtil.randomSeq(3),
          listen: '::',
          listen_port: port,
        })
        this.title = 'add'
      }
      this.tab = 't1'
    },
    changeType() {
      // Tag change only in add service
      const tag = this.$props.id > 0 ? this.srv.tag : this.srv.type + '-' + RandomUtil.randomSeq(3)
      // Use previous data
      const prevConfig = { id: this.srv.id, tag: tag, listen: this.srv.listen, listen_port: this.srv.listen_port }
      this.srv = createSrv(this.srv.type, prevConfig)
    },
    closeModal() {
      this.updateData(0)
      this.$emit('close')
    },
    async saveChanges() {
      if (!this.$props.visible) return

      // check duplicate tag
      const isDuplicatedTag = Data().checkTag('service', this.srv.id, this.srv.tag)
      if (isDuplicatedTag) return

      // save data
      this.loading = true
      const success = await Data().save('services', this.$props.id == 0 ? 'new' : 'edit', this.srv)
      if (success) this.closeModal()
      this.loading = false
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.updateData(this.$props.id)
      }
    },
  },
  components: { Listen, InTLS, Derp, Ocm, Ccm, SSMapi },
}
</script>
