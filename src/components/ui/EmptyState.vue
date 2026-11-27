<template>
  <div class="sui-empty-state">
    <div class="sui-empty-state__icon">
      <v-icon :icon="props.icon" size="26" color="secondary" />
    </div>
    <h2 class="sui-empty-state__title">{{ props.title }}</h2>
    <p v-if="props.description" class="sui-empty-state__description text-medium-emphasis">
      {{ props.description }}
    </p>
    <div v-if="$slots.action || props.actionText" class="sui-empty-state__action">
      <slot name="action">
        <v-btn
          v-if="props.actionText"
          color="primary"
          variant="flat"
          @click="emit('action')"
        >
          {{ props.actionText }}
        </v-btn>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description?: string
  actionText?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'mdi-inbox-outline',
  description: undefined,
  actionText: undefined,
})

const emit = defineEmits<{
  action: []
}>()
</script>

<style scoped>
.sui-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  border: 1px dashed rgba(var(--v-border-color), calc(var(--v-border-opacity) * 1.6));
  border-radius: var(--sui-radius-lg, 14px);
  background: rgb(var(--v-theme-surface-light));
}

.sui-empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 14px;
  border-radius: var(--sui-radius-md, 10px);
  background: rgba(var(--v-theme-secondary), 0.10);
}

.sui-empty-state__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface));
}

.sui-empty-state__description {
  margin: 6px 0 0;
  max-width: 420px;
  font-size: 0.875rem;
  line-height: 1.5;
}

.sui-empty-state__action {
  margin-top: 18px;
}
</style>
