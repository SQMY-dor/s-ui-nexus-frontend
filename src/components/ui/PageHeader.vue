<template>
  <header class="sui-page-header">
    <div v-if="props.title || props.subtitle || props.count !== undefined" class="sui-page-header__heading">
      <div v-if="props.title || props.count !== undefined" class="sui-page-header__title-row">
        <h1 v-if="props.title" class="sui-page-header__title">{{ props.title }}</h1>
        <v-chip
          v-if="props.count !== undefined"
          size="small"
          variant="tonal"
          color="secondary"
          class="sui-num sui-page-header__count"
        >
          {{ props.count }}
        </v-chip>
      </div>
      <p v-if="props.subtitle" class="sui-page-header__subtitle text-medium-emphasis">
        {{ props.subtitle }}
      </p>
    </div>

    <div v-if="props.searchable || $slots.prepend || $slots.actions" class="sui-page-header__controls">
      <div v-if="$slots.prepend" class="sui-page-header__prepend">
        <slot name="prepend" />
      </div>

      <v-text-field
        v-if="props.searchable"
        :model-value="props.search"
        :placeholder="resolvedPlaceholder"
        :aria-label="resolvedPlaceholder"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        single-line
        class="sui-page-header__search"
        @update:model-value="onSearchUpdate"
      />

      <div v-if="$slots.actions" class="sui-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  title?: string
  subtitle?: string
  count?: number
  search?: string
  searchPlaceholder?: string
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  count: undefined,
  search: '',
  searchPlaceholder: undefined,
  searchable: false,
})

const emit = defineEmits<{
  'update:search': [value: string]
}>()

const { t } = useI18n()

const resolvedPlaceholder = computed(() => props.searchPlaceholder || t('ui.searchPlaceholder'))

const onSearchUpdate = (value: string | null) => {
  emit('update:search', value ?? '')
}
</script>

<style scoped>
.sui-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 16px;
}

.sui-page-header__heading {
  min-width: 0;
  flex: 1 1 auto;
}

.sui-page-header__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-page-header__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-on-background));
}

.sui-page-header__subtitle {
  margin: 4px 0 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.sui-page-header__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}

.sui-page-header__prepend,
.sui-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sui-page-header__search {
  width: 240px;
  max-width: 100%;
}

@media (max-width: 599.98px) {
  .sui-page-header {
    align-items: stretch;
  }

  .sui-page-header__controls {
    width: 100%;
  }

  .sui-page-header__search {
    flex: 1 1 100%;
    width: 100%;
  }

  .sui-page-header__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
