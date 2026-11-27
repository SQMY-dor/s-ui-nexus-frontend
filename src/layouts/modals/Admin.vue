<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="460">
    <v-card class="sui-modal-card">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-shield-account-outline" size="18" />
          </v-avatar>
          <div class="min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('admin.changeCred') }}
            </div>
            <div v-if="user?.username" class="text-caption text-medium-emphasis sui-mono text-truncate">
              {{ user.username }}
            </div>
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
          <v-col cols="12">
            <v-text-field
              v-model="newData.oldPass"
              :label="$t('admin.oldPass')"
              :rules="passwordRules"
              :type="showOldPass ? 'text' : 'password'"
              autocomplete="current-password"
              required
            >
              <template #append-inner>
                <v-btn
                  :icon="showOldPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="text"
                  width="28"
                  height="28"
                  :aria-label="showOldPass ? $t('ui.hidePassword') : $t('ui.showPassword')"
                  @click="showOldPass = !showOldPass"
                />
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="newData.newUsername"
              :label="$t('admin.newUname')"
              :rules="usernameRules"
              autocomplete="username"
              required
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="newData.newPass"
              :label="$t('admin.newPass')"
              :rules="passwordRules"
              :type="showNewPass ? 'text' : 'password'"
              autocomplete="new-password"
              required
            >
              <template #append-inner>
                <v-btn
                  :icon="showNewPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="text"
                  width="28"
                  height="28"
                  :aria-label="showNewPass ? $t('ui.hidePassword') : $t('ui.showPassword')"
                  @click="showNewPass = !showNewPass"
                />
              </template>
            </v-text-field>
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
          :disabled="!newData.oldPass || !newData.newUsername || !newData.newPass"
          @click="saveChanges"
        >
          {{ $t('actions.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { i18n } from '@/locales'

export default {
  props: ['visible', 'user'],
  emits: ['close', 'save'],
  data() {
    return {
      showOldPass: false,
      showNewPass: false,
      newData: {
        id: 0,
        oldPass: '',
        newUsername: '',
        newPass: '',
      },
      usernameRules: [
        (value: string) => {
          if (value?.length > 0) return true
          return i18n.global.t('login.unRules')
        },
      ],
      passwordRules: [
        (value: string) => {
          if (value?.length > 0) return true
          return i18n.global.t('login.pwRules')
        },
      ],
    }
  },
  methods: {
    resetData() {
      this.showOldPass = false
      this.showNewPass = false
      this.newData.id = this.$props.user.id
      this.newData.oldPass = ''
      this.newData.newUsername = ''
      this.newData.newPass = ''
    },
    closeModal() {
      this.resetData()
      this.$emit('close')
    },
    saveChanges() {
      if (this.newData.oldPass == '' || this.newData.newUsername == '' || this.newData.newPass == '') return
      this.$emit('save', this.newData)
    },
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        this.resetData()
      }
    },
  },
}
</script>
