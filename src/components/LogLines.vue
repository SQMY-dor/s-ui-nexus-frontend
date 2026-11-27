<template>
  <div class="sui-log-console" dir="ltr" role="log" :aria-label="$t('basic.log.title')">
    <template v-if="parsed.length">
      <div
        v-for="(line, index) in parsed"
        :key="index"
        class="sui-log-row sui-mono"
        :class="rowToneClass(line.level)"
      >
        <span v-if="line.time" class="sui-log-row__time text-medium-emphasis">{{ line.time }}</span>
        <v-chip
          v-if="line.level"
          size="x-small"
          variant="flat"
          :color="logLevelColor(line.level)"
          class="sui-log-row__level sui-mono"
        >
          {{ line.level }}
        </v-chip>
        <span class="sui-log-row__message">{{ line.message }}</span>
      </div>
    </template>
    <div v-else class="pa-4">
      <EmptyState icon="mdi-text-box-outline" :title="$t('logsView.noLogs')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { parseLogLine, logLevelColor } from '@/plugins/logs'

const props = defineProps<{ lines: string[] }>()
const parsed = computed(() => props.lines.map(parseLogLine))

const rowToneClass = (level: string): string => {
  const color = logLevelColor(level)
  if (color === 'error') return 'sui-log-row--error'
  if (color === 'warning') return 'sui-log-row--warning'
  if (color === 'info') return 'sui-log-row--info'
  return ''
}
</script>

<style scoped>
.sui-log-console {
  max-width: 100%;
  max-height: 55vh;
  overflow: auto;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface-light));
}

.sui-log-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--sui-hairline);
  border-inline-start: 2px solid transparent;
  font-size: 0.75rem;
  line-height: 1.55;
  transition: background-color 120ms ease;
}

.sui-log-row:last-child {
  border-bottom: 0;
}

.sui-log-row:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.035);
}

.sui-log-row--error {
  border-inline-start-color: rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.04);
}

.sui-log-row--warning {
  border-inline-start-color: rgb(var(--v-theme-warning));
  background-color: rgba(var(--v-theme-warning), 0.04);
}

.sui-log-row--info {
  border-inline-start-color: rgb(var(--v-theme-info));
}

.sui-log-row__time {
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 0.72rem;
}

.sui-log-row__level {
  flex-shrink: 0;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.sui-log-row__message {
  flex: 1 1 240px;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: rgb(var(--v-theme-on-surface));
}
</style>
