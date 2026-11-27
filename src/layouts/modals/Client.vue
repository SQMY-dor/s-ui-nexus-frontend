<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="840">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-account-outline" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('actions.' + title) + ' ' + $t('objects.client') }}
            </div>
            <v-chip v-if="id > 0 && client.name" size="small" variant="tonal" color="secondary" class="sui-mono">
              {{ client.name }}
            </v-chip>
          </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
          <JsonObjectEditor v-model="client" />
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

      <template v-if="!loading">
        <v-tabs v-model="tab" align-tabs="start" class="px-4 sui-modal-tabs">
          <v-tab value="t1">{{ $t('client.basics') }}</v-tab>
          <v-tab value="t2">{{ $t('client.config') }}</v-tab>
          <v-tab value="t3">{{ $t('client.links') }}</v-tab>
        </v-tabs>
        <v-divider />
      </template>

      <div class="sui-modal-body">
        <v-skeleton-loader
          v-if="loading"
          type="article, divider, list-item-two-line, list-item-two-line"
        />

        <v-window v-show="!loading" v-model="tab">
          <v-window-item value="t1">
            <div class="sui-section-header">
              <span>{{ $t('client.basics') }}</span>
            </div>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="client.name" :label="$t('client.name')" hide-details />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-combobox v-model="client.group" :items="groups" :label="$t('client.group')" hide-details />
              </v-col>
              <v-col cols="12" sm="6" md="4" class="d-flex align-center">
                <v-switch v-model="client.enable" color="primary" :label="$t('enable')" hide-details />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="client.desc" :label="$t('client.desc')" hide-details />
              </v-col>
            </v-row>

            <div class="sui-section-header mt-5">
              <span>{{ $t('stats.volume') }} &amp; {{ $t('date.expiry') }}</span>
            </div>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model.number="Volume"
                  type="number"
                  min="0"
                  :label="$t('stats.volume')"
                  suffix="GiB"
                  hide-details
                />
              </v-col>
              <v-col v-if="!(client.delayStart && !client.autoReset)" cols="12" sm="6" md="4">
                <DatePick :expiry="expDate" @submit="setDate" />
              </v-col>
              <v-col v-if="client.autoReset || client.delayStart" cols="12" sm="6" md="4">
                <v-text-field
                  v-model.number="resetDays"
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
                  v-model="delayStart"
                  color="primary"
                  :disabled="client.up + client.down > 0"
                  :label="$t('client.delayStart')"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-switch
                  v-model="autoReset"
                  color="primary"
                  :label="$t('client.autoReset')"
                  hide-details
                />
              </v-col>
            </v-row>

            <template v-if="id > 0">
              <div class="sui-section-header mt-5">
                <span>{{ $t('stats.usage') }}</span>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="warning"
                  prepend-icon="mdi-restore"
                  @click="resetUsage"
                >
                  {{ $t('reset') }}
                </v-btn>
              </div>
              <div class="sui-usage-panel">
                <v-row align="center">
                  <v-col cols="12" sm="6">
                    <div class="d-flex justify-space-between align-baseline mb-1">
                      <span class="text-caption text-medium-emphasis">{{ $t('stats.usage') }}</span>
                      <span class="sui-num font-weight-semibold text-body-2" dir="ltr">
                        {{ total }}<span v-if="percent > 0" class="text-caption text-medium-emphasis ms-1">({{ percent }}%)</span>
                      </span>
                    </div>
                    <v-progress-linear
                      v-if="client.volume > 0"
                      v-model="percent"
                      :color="percentColor"
                      height="6"
                      rounded
                    />
                  </v-col>
                  <v-col cols="12" sm="6" class="d-flex align-center justify-sm-end ga-4 sui-num text-body-2" dir="ltr">
                    <span class="d-inline-flex align-center ga-1 text-upload font-weight-medium">
                      <v-icon icon="mdi-arrow-up" size="15" />
                      {{ up }}
                    </span>
                    <span class="d-inline-flex align-center ga-1 text-download font-weight-medium">
                      <v-icon icon="mdi-arrow-down" size="15" />
                      {{ down }}
                    </span>
                  </v-col>
                </v-row>
                <v-row v-if="client.autoReset" class="mt-2 pt-2 sui-usage-divider">
                  <v-col cols="12" sm="6">
                    <div class="text-caption text-medium-emphasis">{{ $t('client.nextReset') }}</div>
                    <div class="sui-mono text-body-2" dir="ltr">{{ nextResetFormatted }}</div>
                  </v-col>
                  <v-col cols="12" sm="6" class="text-sm-end">
                    <div class="text-caption text-medium-emphasis">{{ $t('main.stats.totalUsage') }}</div>
                    <div class="d-inline-flex align-center ga-3 sui-num text-body-2" dir="ltr">
                      <span class="text-upload font-weight-medium">↑ {{ totalUp }}</span>
                      <span class="text-download font-weight-medium">↓ {{ totalDown }}</span>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </template>

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
                  v-model="clientInbounds"
                  :items="inboundTags"
                  :label="$t('client.inboundTags')"
                  clearable
                  multiple
                  chips
                  hide-details
                />
              </v-col>
            </v-row>
          </v-window-item>

          <v-window-item value="t2">
            <div class="sui-section-header">
              <span>{{ $t('client.config') }}</span>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-refresh"
                @click="shuffle()"
              >
                {{ $t('reset') + ' - ' + $t('all') }}
              </v-btn>
            </div>

            <div class="d-flex flex-column ga-3">
              <div v-for="key in Object.keys(clientConfig)" :key="key" class="sui-proto-row">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="sui-mono text-caption font-weight-semibold text-uppercase">{{ key }}</span>
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    :aria-label="$t('reset')"
                    @click="shuffle(key)"
                  >
                    <v-icon icon="mdi-refresh" size="18" />
                    <v-tooltip activator="parent" location="top">{{ $t('reset') }}</v-tooltip>
                  </v-btn>
                </div>
                <v-row>
                  <v-col v-if="clientConfig[key].password != undefined" cols="12" sm="6">
                    <v-text-field
                      v-model="clientConfig[key].password"
                      class="sui-mono"
                      label="Password"
                      hide-details
                    />
                  </v-col>
                  <v-col v-if="clientConfig[key].uuid != undefined" cols="12" sm="6">
                    <v-text-field
                      v-model="clientConfig[key].uuid"
                      class="sui-mono"
                      label="UUID"
                      hide-details
                    />
                  </v-col>
                  <v-col v-if="key == 'vless'" cols="12" sm="6">
                    <v-text-field
                      v-model="clientConfig[key].flow"
                      class="sui-mono"
                      label="Flow"
                      hide-details
                    />
                  </v-col>
                  <v-col v-if="key == 'hysteria'" cols="12" sm="6">
                    <v-text-field
                      v-model="clientConfig[key].auth_str"
                      class="sui-mono"
                      label="Auth"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </div>
            </div>
          </v-window-item>

          <v-window-item value="t3">
            <template v-if="links.length > 0">
              <div class="sui-section-header">
                <span>{{ $t('client.links') }}</span>
                <v-chip size="x-small" variant="tonal" class="sui-num">{{ links.length }}</v-chip>
              </div>
              <div class="d-flex flex-column ga-2 mb-4">
                <div
                  v-for="(lnk, index) in links"
                  :key="`${lnk.type}-${index}-${lnk.uri}`"
                  class="sui-link-row"
                >
                  <v-chip size="x-small" variant="tonal" color="secondary" class="sui-num flex-shrink-0">
                    {{ index + 1 }}
                  </v-chip>
                  <div class="sui-mono text-caption sui-link-uri" dir="ltr">{{ lnk.uri }}</div>
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="small"
                    class="flex-shrink-0"
                    :aria-label="$t('copyToClipboard')"
                    @click="copyToClipboard(lnk.uri)"
                  />
                </div>
              </div>
            </template>

            <template v-if="nodeLinks.length > 0">
              <div class="sui-section-header">
                <span>{{ $t('node.clientLinksHint') }}</span>
                <v-chip size="x-small" variant="tonal" color="info" class="sui-num">{{ nodeLinks.length }}</v-chip>
              </div>
              <div class="d-flex flex-column ga-2 mb-4">
                <div
                  v-for="(lnk, index) in nodeLinks"
                  :key="`node-${index}-${lnk.uri}`"
                  class="sui-link-row"
                >
                  <v-chip size="x-small" color="info" variant="tonal" dir="ltr" class="flex-shrink-0">
                    {{ lnk.remark }}
                  </v-chip>
                  <div class="sui-mono text-caption sui-link-uri" dir="ltr">{{ lnk.uri }}</div>
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="small"
                    class="flex-shrink-0"
                    :aria-label="$t('copyToClipboard')"
                    @click="copyToClipboard(lnk.uri)"
                  />
                </div>
              </div>
            </template>

            <div class="sui-section-header">
              <span>{{ $t('client.external') }}</span>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-plus"
                @click="extLinks.push({ type: 'external', uri: '' })"
              >
                {{ $t('actions.add') }}
              </v-btn>
            </div>
            <v-row v-for="(lnk, index) in extLinks" :key="`ext-${index}`" class="mb-1">
              <v-col cols="12">
                <v-text-field
                  v-model="lnk.uri"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('client.external') + ' ' + (index + 1)"
                  :placeholder="extLinkPlaceholder"
                  hide-details
                >
                  <template #append>
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      size="small"
                      color="error"
                      :aria-label="$t('actions.del')"
                      @click="extLinks.splice(index, 1)"
                    />
                  </template>
                </v-text-field>
              </v-col>
            </v-row>

            <div class="sui-section-header mt-4">
              <span>{{ $t('client.sub') }}</span>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-plus"
                @click="subLinks.push({ type: 'sub', uri: '' })"
              >
                {{ $t('actions.add') }}
              </v-btn>
            </div>
            <v-row v-for="(lnk, index) in subLinks" :key="`sub-${index}`" class="mb-1">
              <v-col cols="12">
                <v-text-field
                  v-model="lnk.uri"
                  dir="ltr"
                  class="sui-mono"
                  :label="$t('client.sub') + ' ' + (index + 1)"
                  :placeholder="subLinkPlaceholder"
                  hide-details
                >
                  <template #append>
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      size="small"
                      color="error"
                      :aria-label="$t('actions.del')"
                      @click="subLinks.splice(index, 1)"
                    />
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
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
import { createClient, randomConfigs, updateConfigs, Link, shuffleConfigs } from '@/types/clients'
import DatePick from '@/components/DateTime.vue'
import { HumanReadable } from '@/plugins/utils'
import { copyToClipboard } from '@/plugins/copy'
import Data from '@/store/modules/data'
import { isNodeLinkRemark } from '@/plugins/cluster'
import { locale } from '@/locales'

export default {
  props: ['visible', 'id', 'inboundTags', 'groups'],
  emits: ['close'],
  data() {
    return {
      client: createClient(),
      title: 'add',
      loading: false,
      tab: 't1',
      clientConfig: <any>[],
      links: <Link[]>[],
      extLinks: <Link[]>[],
      nodeLinks: <Link[]>[],
      subLinks: <Link[]>[],
      extLinkPlaceholder: '<protocol>://<data>',
      subLinkPlaceholder: 'http[s]://<domain>[:]<port>/<path>',
    }
  },
  methods: {
    copyToClipboard,
    async updateData(id: number) {
      if (id > 0) {
        this.loading = true
        const newData = await Data().loadClients(id)
        this.client = createClient(newData)
        this.title = 'edit'
        this.clientConfig = this.client.config
        this.loading = false
      } else {
        this.client = createClient()
        this.title = 'add'
        this.clientConfig = randomConfigs('client')
      }
      this.links = this.client.links?.filter(l => l.type == 'local') ?? []
      // Cluster node links ("[node] tag") are generated by the master's node
      // sync and re-attached server-side on save: show them read-only.
      const nodeNames = (Data().nodes ?? []).map(n => n.name)
      this.nodeLinks = this.client.links?.filter(l => l.type == 'external' && isNodeLinkRemark(l.remark, nodeNames)) ?? []
      this.extLinks = this.client.links?.filter(l => l.type == 'external' && !isNodeLinkRemark(l.remark, nodeNames)) ?? []
      this.subLinks = this.client.links?.filter(l => l.type == 'sub') ?? []
      this.tab = 't1'
      this.loading = false
    },
    closeModal() {
      this.updateData(0)
      this.$emit('close')
    },
    async saveChanges() {
      if (!this.$props.visible) return
      // check duplicate name
      const isDuplicateName = Data().checkClientName(this.$props.id, this.client.name)
      if (isDuplicateName) return

      // check if delayStart is true and autoReset is false, set expiry to 0
      if (this.client.delayStart && !this.client.autoReset) this.client.expiry = 0

      // save data
      this.loading = true
      this.client.config = updateConfigs(this.clientConfig, this.client.name)
      this.client.links = [
        ...this.extLinks.filter(l => l.uri != ''),
        ...this.nodeLinks,
        ...this.subLinks.filter(l => l.uri != ''),
      ]
      const success = await Data().save('clients', this.$props.id == 0 ? 'new' : 'edit', this.client)
      if (success) this.closeModal()
      this.loading = false
    },
    setDate(newDate: number) {
      this.client.expiry = newDate
    },
    setAllInbounds() {
      this.client.inbounds = this.inboundTags.map((i: any) => i.value).sort()
    },
    shuffle(k?: string) {
      shuffleConfigs(this.clientConfig, k)
    },
    resetUsage() {
      this.client.totalUp = (this.client.totalUp ?? 0) + this.client.up
      this.client.totalDown = (this.client.totalDown ?? 0) + this.client.down
      this.client.up = 0
      this.client.down = 0
    },
  },
  computed: {
    clientInbounds: {
      get() { return this.client.inbounds.length > 0 ? [...this.client.inbounds].sort() : [] },
      set(v: number[]) { this.client.inbounds = v.length === 0 ? [] : [...v].sort() },
    },
    expDate: {
      get() { return this.client.expiry },
      set(v: any) { this.client.expiry = v },
    },
    Volume: {
      get() { return this.client.volume == 0 ? 0 : (this.client.volume / (1024 ** 3)) },
      set(v: number) { this.client.volume = v > 0 ? v * (1024 ** 3) : 0 },
    },
    delayStart: {
      get() { return this.client.delayStart ?? false },
      set(v: boolean) {
        this.client.delayStart = v
        this.client.resetDays = v ? 1 : 0
        if (v && !this.autoReset) this.client.expiry = 0
      },
    },
    autoReset: {
      get() { return this.client.autoReset ?? false },
      set(v: boolean) {
        this.client.autoReset = v
        this.client.resetDays = v ? 1 : 0
        if (!v) this.client.nextReset = 0
      },
    },
    resetDays: {
      get() { return this.client.resetDays ?? 1 },
      set(v: number | null) {
        if (!v) v = 1
        if (this.client.nextReset && this.client.nextReset > 0) {
          this.client.nextReset += (v - (this.client.resetDays ?? 0)) * 24 * 60 * 60
        }
        this.client.resetDays = v
      },
    },
    up(): string { return HumanReadable.sizeFormat(this.client.up) },
    down(): string { return HumanReadable.sizeFormat(this.client.down) },
    total(): string { return HumanReadable.sizeFormat(this.client.down + this.client.up) },
    totalUp(): string { return HumanReadable.sizeFormat((this.client.totalUp ?? 0) + this.client.up) },
    totalDown(): string { return HumanReadable.sizeFormat((this.client.totalDown ?? 0) + this.client.down) },
    nextResetFormatted(): string {
      const ts = this.client.nextReset ?? 0
      if (ts == 0) return '-'
      const date = new Date(ts * 1000)
      return date.toLocaleString(locale)
    },
    percent(): number { return this.client.volume > 0 ? Math.round((this.client.up + this.client.down) * 100 / this.client.volume) : 0 },
    percentColor(): string { return (this.client.up + this.client.down) >= this.client.volume ? 'error' : this.percent > 90 ? 'warning' : 'success' },
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        this.updateData(this.$props.id)
      }
    },
  },
  components: { DatePick },
}
</script>

<style scoped>
.sui-usage-panel,
.sui-proto-row {
  padding: 12px 14px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-usage-divider {
  border-top: 1px solid var(--sui-hairline);
}

.sui-link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--sui-radius-sm);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}

.sui-link-uri {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
