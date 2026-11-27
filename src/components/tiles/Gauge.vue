<template>
  <div class="sui-gauge" role="img" :aria-label="ariaLabel">
    <div class="sui-gauge__dial">
      <svg
        class="sui-gauge__svg"
        viewBox="0 0 160 118"
        width="156"
        height="115"
        aria-hidden="true"
      >
        <path
          class="sui-gauge__track"
          :d="ARC_PATH"
          fill="none"
          stroke-width="11"
          stroke-linecap="round"
        />
        <path
          class="sui-gauge__arc"
          :d="ARC_PATH"
          fill="none"
          :stroke="arcStroke"
          stroke-width="11"
          stroke-linecap="round"
          :stroke-dasharray="ARC_LENGTH"
          :stroke-dashoffset="dashOffset"
          :stroke-opacity="clampedPercent > 0 ? 1 : 0"
        />
      </svg>

      <span class="sui-gauge__percent sui-num" dir="ltr">{{ displayPercent }}%</span>
    </div>

    <span v-if="subMetric" class="sui-gauge__sub sui-num text-medium-emphasis" dir="ltr">
      {{ subMetric }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HumanReadable } from '@/plugins/utils'

const props = defineProps<{
  tilesData?: Record<string, any>
  type?: string
}>()

const { t } = useI18n()

// 240° open horseshoe arc: center (80, 72), radius 56, from 150° to 390°
const RADIUS = 56
const ARC_LENGTH = 2 * Math.PI * RADIUS * (240 / 360)
const ARC_PATH = 'M 31.50 100 A 56 56 0 1 1 128.50 100'

const clampPercent = (value: unknown): number => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return 0
  return Math.min(100, Math.max(0, num))
}

const formatBytes = (value: unknown): string => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return `0 ${t('stats.B')}`
  return HumanReadable.sizeFormat(num, num < 1024 ? 0 : 1)
}

const metric = computed(() => {
  const d = props.tilesData ?? {}

  if (props.type === 'g-cpu') {
    const pct = clampPercent(d.cpu)
    const cores = Number(d.sys?.cpuCount)
    const sub = Number.isFinite(cores) && cores > 0 ? `${cores} ${t('main.info.core')}` : ''
    return { percent: pct, sub }
  }

  const key = props.type === 'g-mem' ? 'mem' : props.type === 'g-dsk' ? 'dsk' : props.type === 'g-swp' ? 'swp' : ''
  const bucket = key ? d[key] : null
  if (!bucket || typeof bucket !== 'object') {
    return { percent: 0, sub: '—' }
  }

  const total = Number(bucket.total)
  const current = Number(bucket.current)
  if (!Number.isFinite(total) || total <= 0) {
    return { percent: 0, sub: '—' }
  }

  const safeCurrent = Number.isFinite(current) && current > 0 ? current : 0
  const pct = clampPercent((safeCurrent * 100) / total)
  return {
    percent: pct,
    sub: `${formatBytes(safeCurrent)} / ${formatBytes(total)}`,
  }
})

const clampedPercent = computed(() => metric.value.percent)
const displayPercent = computed(() => Math.round(clampedPercent.value))
const subMetric = computed(() => metric.value.sub)

const dashOffset = computed(() => ARC_LENGTH * (1 - clampedPercent.value / 100))

const gaugeTone = computed<'primary' | 'warning' | 'error'>(() => {
  if (clampedPercent.value >= 90) return 'error'
  if (clampedPercent.value >= 70) return 'warning'
  return 'primary'
})

const arcStroke = computed(() => `rgb(var(--v-theme-${gaugeTone.value}))`)

const ariaLabel = computed(() =>
  subMetric.value && subMetric.value !== '—'
    ? `${displayPercent.value}% (${subMetric.value})`
    : `${displayPercent.value}%`,
)
</script>

<style scoped>
.sui-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  min-height: 148px;
}

.sui-gauge__dial {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 156px;
  height: 115px;
  max-width: 100%;
  flex-shrink: 0;
}

.sui-gauge__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.sui-gauge__track {
  stroke: var(--sui-gauge-track);
}

.sui-gauge__arc {
  transition: stroke-dashoffset 280ms ease-out, stroke 200ms ease, stroke-opacity 180ms ease;
}

.sui-gauge__percent {
  position: absolute;
  left: 50%;
  top: 61%;
  transform: translate(-50%, -50%);
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
  pointer-events: none;
  white-space: nowrap;
}

.sui-gauge__sub {
  display: block;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.3;
  max-width: 100%;
  padding-inline: 6px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
