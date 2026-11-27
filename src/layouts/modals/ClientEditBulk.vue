<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="780">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar
            :color="actionMode === 'delete_bulk' ? 'error' : 'primary'"
            variant="tonal"
            size="34"
            rounded="md"
            class="flex-shrink-0"
          >
            <v-icon :icon="actionMode === 'delete_bulk' ? 'mdi-delete-alert-outline' : 'mdi-account-edit-outline'" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.editbulk') }}
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
          <span>{{ $t('actions.action') }}</span>
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="5">
            <v-select
              v-model="actionMode"
              :items="actionModes"
              :label="$t('actions.action')"
              hide-details
              @update:model-value="onActionChange"
            />
          </v-col>
        </v-row>

        <v-row v-if="actionMode === 'change_limits'" class="mt-2">
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="editData.addDays"
              type="number"
              :label="$t('bulk.addDays')"
              :suffix="$t('date.d')"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="editData.addVolume"
              type="number"
              :label="$t('bulk.addVolume')"
              :suffix="$t('stats.GB')"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4" class="d-flex align-center">
            <v-switch
              v-model="editData.enable"
              :label="$t('enable')"
              color="primary"
              hide-details
            />
          </v-col>
        </v-row>

        <v-row v-if="actionMode === 'add_inbounds' || actionMode === 'remove_inbounds'" class="mt-2">
          <v-col cols="12">
            <v-select
              v-model="editData.inboundTags"
              :items="inboundTags"
              :label="$t('client.inboundTags')"
              multiple
              chips
              hide-details
            />
          </v-col>
        </v-row>

        <v-alert
          v-if="actionMode === 'delete_bulk'"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ $t('ui.deleteConfirm') }}
        </v-alert>

        <div class="mt-5">
          <Users :clients="clients" :data="selectedClients" />
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn variant="text" @click="closeModal">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn
          :color="actionMode === 'delete_bulk' ? 'error' : 'primary'"
          variant="flat"
          :loading="loading"
          :disabled="selectedClients.values.length == 0"
          @click="saveChanges"
        >
          {{ actionMode === 'delete_bulk' ? $t('actions.del') : $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Users from '@/components/Users.vue'
import { i18n } from '@/locales'
import Data from '@/store/modules/data'
import { Client } from '@/types/clients'

export default {
  props: ['visible', 'clients', 'inboundTags'],
  emits: ['close'],
  components: { Users },
  data() {
    return {
      loading: false,
      actionMode: 'change_limits',
      actionModes: [
        { title: i18n.global.t('bulk.changeLimits'), value: 'change_limits' },
        { title: i18n.global.t('bulk.addInbounds'), value: 'add_inbounds' },
        { title: i18n.global.t('bulk.removeInbounds'), value: 'remove_inbounds' },
        { title: i18n.global.t('actions.delbulk'), value: 'delete_bulk' },
      ],
      editData: {
        enable: true,
        addDays: 0,
        addVolume: 0,
        inboundTags: [] as number[],
      },
      selectedClients: {
        model: 'none',
        values: [] as any[],
      },
    }
  },
  methods: {
    onActionChange() {
      this.editData.inboundTags = []
    },
    closeModal() {
      this.$emit('close')
    },
    getTargetClients(): Client[] {
      const clients = this.clients ?? []
      switch (this.selectedClients.model) {
        case 'all':
          return clients
        case 'group':
          return clients.filter((c: any) => this.selectedClients.values.includes(c.group))
        case 'client':
          return clients.filter((c: any) => this.selectedClients.values.includes(c.id))
        default:
          return []
      }
    },
    async saveChanges() {
      this.loading = true
      const targetClients = this.getTargetClients()
      switch (this.actionMode) {
        case 'change_limits':
          targetClients.forEach((c: Client) => {
            if (this.editData.addVolume != 0 && c.volume > 0)
              c.volume += this.editData.addVolume * (1024 ** 3)
            if (this.editData.addDays != 0 && c.expiry > 0)
              c.expiry += this.editData.addDays * (24 * 60 * 60)
            if (this.editData.enable)
              c.enable = (c.volume == 0 || c.up + c.down < c.volume) && (c.expiry == 0 || c.expiry > Date.now() / 1000)
          })
          break
        case 'add_inbounds':
          targetClients.forEach((c: Client) => {
            this.editData.inboundTags.forEach((t: number) => {
              if (!c.inbounds.includes(t)) {
                c.inbounds.push(t)
              }
            })
            c.inbounds = c.inbounds.sort()
          })
          break
        case 'remove_inbounds':
          targetClients.forEach((c: Client) => {
            c.inbounds = c.inbounds.filter((i: number) => !this.editData.inboundTags.includes(i))
          })
          break
        case 'delete_bulk': {
          const success = await Data().save('clients', 'delbulk', targetClients.map((c: Client) => c.id))
          if (success) this.closeModal()
          this.loading = false
          return
        }
      }
      const success = await Data().save('clients', 'editbulk', targetClients)
      if (success) this.closeModal()
      this.loading = false
    },
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.actionMode = 'change_limits'
        this.editData = { enable: true, addDays: 0, addVolume: 0, inboundTags: [] }
        this.selectedClients = { model: 'none', values: [] }
      }
    },
  },
}
</script>
