<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="440"
    :persistent="props.loading"
    role="alertdialog"
    @update:model-value="onDialogUpdate"
  >
    <v-card class="sui-confirm-dialog">
      <div class="sui-modal-header sui-confirm-dialog__header">
        <div class="sui-confirm-dialog__title-wrap">
          <v-avatar
            v-if="props.icon"
            :color="props.confirmColor"
            variant="tonal"
            size="36"
            rounded="md"
            class="sui-confirm-dialog__icon"
          >
            <v-icon :icon="props.icon" size="20" />
          </v-avatar>
          <span class="sui-confirm-dialog__title">{{ props.title }}</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="props.loading"
          :aria-label="t('actions.close')"
          @click="onCancel"
        />
      </div>

      <v-divider />

      <v-card-text class="sui-confirm-dialog__body">
        <p v-if="props.message" class="sui-confirm-dialog__message text-medium-emphasis">
          {{ props.message }}
        </p>
        <slot />
      </v-card-text>

      <v-divider />

      <v-card-actions class="sui-modal-actions">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="props.loading"
          @click="onCancel"
        >
          {{ resolvedCancelText }}
        </v-btn>
        <v-btn
          :color="props.confirmColor"
          variant="flat"
          :loading="props.loading"
          @click="onConfirm"
        >
          {{ resolvedConfirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
  loading?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  message: undefined,
  confirmText: undefined,
  cancelText: undefined,
  confirmColor: 'error',
  loading: false,
  icon: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

const resolvedCancelText = computed(() => props.cancelText || t('ui.cancel'))
const resolvedConfirmText = computed(() => props.confirmText || t('ui.confirm'))

const onDialogUpdate = (value: boolean) => {
  if (!value && props.loading) return
  emit('update:modelValue', value)
  if (!value) emit('cancel')
}

const onCancel = () => {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

const onConfirm = () => {
  if (props.loading) return
  emit('confirm')
}
</script>

<style scoped>
.sui-confirm-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
}

.sui-confirm-dialog__title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.sui-confirm-dialog__icon {
  flex-shrink: 0;
}

.sui-confirm-dialog__title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgb(var(--v-theme-on-surface));
  overflow-wrap: anywhere;
}

.sui-confirm-dialog__body {
  padding: 16px 20px;
  font-size: 0.9375rem;
  line-height: 1.55;
}

.sui-confirm-dialog__message {
  margin: 0;
}
</style>
