<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="680">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-playlist-check" size="18" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-semibold text-truncate">
            {{ $t('actions.' + title) + ' ' + $t('objects.ruleset') }}
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
        <v-row>
          <v-col cols="12" sm="4">
            <v-select
              v-model="rule_set.type"
              hide-details
              :label="$t('type')"
              :items="[{ title: $t('ruleset.local'), value: 'local' }, { title: $t('ruleset.remote'), value: 'remote' }]"
              @update:model-value="updateType($event)"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field v-model="rule_set.tag" class="sui-mono" :label="$t('objects.tag')" hide-details />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="rule_set.format"
              hide-details
              :label="$t('ruleset.format')"
              :items="['source', 'binary']"
            />
          </v-col>
        </v-row>

        <v-row v-if="rule_set.type == 'local'" class="mt-2">
          <v-col cols="12">
            <v-text-field
              v-model="rule_set.path"
              dir="ltr"
              class="sui-mono"
              :label="$t('transport.path')"
              hide-details
            />
          </v-col>
        </v-row>
        <v-row v-else class="mt-2">
          <v-col cols="12">
            <v-text-field
              v-model="rule_set.url"
              dir="ltr"
              class="sui-mono"
              label="URL"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="rule_set.download_detour"
              hide-details
              :label="$t('objects.outbound')"
              :items="outTags"
              clearable
              @click:clear="delete rule_set.download_detour"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model.number="update_intervals"
              :suffix="$t('date.d')"
              type="number"
              min="0"
              :label="$t('ruleset.interval')"
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
        <v-btn color="primary" variant="flat" :loading="loading" @click="saveChanges">
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import RandomUtil from '@/plugins/randomUtil'
import { ruleset } from '@/types/rules'

export default {
  props: ['visible', 'data', 'index', 'outTags'],
  emits: ['close', 'save'],
  data() {
    return {
      title: 'add',
      loading: false,
      rule_set: <ruleset>{},
    }
  },
  methods: {
    updateData() {
      if (this.$props.index != -1) {
        this.title = 'edit'
        this.rule_set = <ruleset>JSON.parse(this.$props.data)
      } else {
        this.title = 'add'
        this.rule_set = <ruleset>{ type: 'local', tag: 'rs-' + RandomUtil.randomSeq(3), format: 'binary' }
      }
    },
    updateType(t: string) {
      if (t == 'local') {
        delete this.rule_set.url
        delete this.rule_set.download_detour
        delete this.rule_set.update_interval
      } else {
        delete this.rule_set.path
      }
    },
    closeModal() {
      this.$emit('close')
    },
    saveChanges() {
      this.loading = true
      this.$emit('save', this.rule_set)
      this.loading = false
    },
  },
  computed: {
    update_intervals: {
      get() { return this.rule_set.update_interval != undefined ? parseInt(this.rule_set.update_interval.replace('d', '')) : 0 },
      set(v: number) { this.rule_set.update_interval = v > 0 ? v + 'd' : undefined },
    },
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        this.updateData()
      }
    },
  },
}
</script>
