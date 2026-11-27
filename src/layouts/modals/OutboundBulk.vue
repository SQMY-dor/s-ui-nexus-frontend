<template>
  <v-dialog
    transition="dialog-bottom-transition"
    width="100%"
    max-width="840"
    :model-value="visible"
    @update:model-value="v => { if (!v) closeModal() }"
  >
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-playlist-plus" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('actions.addbulk') }} {{ $t('objects.outbound') }}
            </div>
            <v-chip v-if="outbounds.length > 0" size="small" variant="tonal" color="primary" class="sui-num">
              {{ outbounds.length }}
            </v-chip>
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
        <template v-if="outbounds.length == 0">
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ $t('tools.subscriptionSubtitle') }}
          </p>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="link"
                dir="ltr"
                class="sui-mono"
                :label="$t('client.sub')"
                placeholder="http[s]://<domain>[:]<port>/<path>"
                hide-details
                @keydown.enter="linkCheck"
              />
            </v-col>
            <v-col cols="12" class="d-flex align-center justify-space-between flex-wrap ga-2 mt-1">
              <v-checkbox
                v-model="addUrlTest"
                :label="$t('out.addUrlTest')"
                density="compact"
                hide-details
              />
              <v-btn
                color="primary"
                variant="flat"
                :loading="loading"
                :disabled="!link.trim()"
                @click="linkCheck"
              >
                {{ $t('submit') }}
              </v-btn>
            </v-col>
          </v-row>
        </template>

        <div v-else class="sui-table-wrap sui-preview-table">
          <v-data-table
            :items="outbounds"
            :loading="loading"
            :items-per-page="0"
            hide-default-footer
            density="compact"
            :headers="[
              { value: 'check', width: 48 },
              { title: $t('type'), value: 'type' },
              { title: $t('objects.tag'), value: 'tag' },
              { title: $t('out.addr'), value: 'server' },
              { title: $t('objects.tls'), value: 'tls' },
            ]"
          >
            <template v-slot:[`item.check`]="{ index }">
              <v-icon v-if="outChecks[index] == 1" color="success" icon="mdi-check-circle-outline" size="18" />
              <v-icon v-else-if="outChecks[index] == 2" color="error" icon="mdi-close-circle-outline" size="18" />
              <v-progress-circular v-else-if="outChecks[index] == 3" indeterminate size="18" width="2" color="primary" />
              <v-icon v-else icon="mdi-circle-outline" size="16" class="text-medium-emphasis" />
            </template>
            <template v-slot:[`item.type`]="{ item }">
              <v-chip size="small" variant="tonal" color="secondary">{{ item.type }}</v-chip>
            </template>
            <template v-slot:[`item.tag`]="{ item }">
              <span class="sui-mono text-caption">{{ item.tag }}</span>
            </template>
            <template v-slot:[`item.tls`]="{ item }">
              <span class="text-caption">
                {{ Object.hasOwn(item, 'tls') ? $t(item.tls?.enabled ? 'enable' : 'disable') : '-' }}
              </span>
            </template>
            <template v-slot:[`item.server`]="{ item }">
              <span class="sui-mono text-caption" dir="ltr">
                {{ item.server }}{{ item.server_port ? ':' + item.server_port : '' }}
              </span>
            </template>
          </v-data-table>
        </div>
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
          :disabled="outbounds.length == 0"
          @click="saveChanges"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import HttpUtils from '@/plugins/httputil'
import RandomUtil from '@/plugins/randomUtil'
import Data from '@/store/modules/data'
import { createOutbound, Outbound } from '@/types/outbounds'

export default {
  props: ['visible', 'outboundTags'],
  emits: ['close'],
  data() {
    return {
      loading: false,
      link: '',
      outbounds: <Outbound[]>[],
      outChecks: <number[]>[],
      addUrlTest: false,
    }
  },
  methods: {
    resetData() {
      this.outbounds = []
      this.outChecks = []
      this.link = ''
      this.addUrlTest = false
      this.loading = false
    },
    closeModal() {
      this.resetData()
      this.$emit('close')
    },
    async linkCheck() {
      this.loading = true
      this.outbounds = []
      const msg = await HttpUtils.post('api/subConvert', { link: this.link })
      if (msg.success) {
        if (msg.obj?.length > 0) {
          msg.obj.forEach((o: any, index: number) => {
            if (this.newOutboundTags.includes(o.tag)) o.tag = o.tag + '-' + (index + 1)
            this.outbounds.push(createOutbound(o.type, o))
            this.outChecks.push(0)
          })
          if (this.addUrlTest) {
            const urlTestTsg = 'urltest-' + RandomUtil.randomSeq(3)
            this.outbounds.push(createOutbound('urltest', {
              tag: urlTestTsg,
              outbounds: this.outbounds.map((o: Outbound) => o.tag),
              interrupt_exist_connections: false,
              interval: '30s',
            }))
          }
        }
      }
      this.loading = false
    },
    async saveChanges() {
      if (!this.$props.visible) return
      // check duplicate tag
      this.outbounds.forEach((o: Outbound, index: number) => {
        const isDuplicatedTag = Data().checkTag('outbound', 0, o.tag)
        this.outChecks[index] = isDuplicatedTag ? 2 : 0
      })

      // save data
      this.loading = true
      this.outbounds.forEach(async (o: Outbound, index: number) => {
        if (this.outChecks[index] == 2) return
        this.outChecks[index] = 3
        const success = await Data().save('outbounds', 'new', o)
        if (success) this.outChecks[index] = 1
        else this.outChecks[index] = 2
      })
      this.loading = false
    },
  },
  computed: {
    newOutboundTags(): string[] {
      return this.outbounds.map((o: Outbound) => o.tag)
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.resetData()
      }
    },
  },
}
</script>

<style scoped>
.sui-preview-table {
  border: 1px solid var(--sui-hairline);
  border-radius: var(--sui-radius-md);
}
</style>
