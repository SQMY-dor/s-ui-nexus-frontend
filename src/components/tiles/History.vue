<template>
  <div class="sui-history">
    <div v-if="isDualSeries" class="sui-history__legend">
      <span class="sui-history__legend-item">
        <span class="sui-history__dot sui-history__dot--upload" aria-hidden="true" />
        <span class="text-medium-emphasis">{{ series1Label }}</span>
        <span class="sui-num sui-history__val" dir="ltr">{{ formatLiveValue(latestSeries1) }}</span>
      </span>
      <span class="sui-history__legend-item">
        <span class="sui-history__dot sui-history__dot--download" aria-hidden="true" />
        <span class="text-medium-emphasis">{{ series2Label }}</span>
        <span class="sui-num sui-history__val" dir="ltr">{{ formatLiveValue(latestSeries2) }}</span>
      </span>
    </div>
    <div v-else class="sui-history__legend">
      <span class="sui-history__legend-item">
        <span class="sui-history__dot sui-history__dot--primary" aria-hidden="true" />
        <span class="sui-num sui-history__val" dir="ltr">{{ formatLiveValue(latestSeries1) }}</span>
      </span>
    </div>

    <div class="sui-history__canvas">
      <LineChart v-if="loaded" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { Line as LineChart } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import { getChartPalette } from '@/plugins/chartTheme'
import { HumanReadable } from '@/plugins/utils'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
)

const MAX_POINTS = 20

const props = defineProps<{
  tilesData?: Record<string, any>
  type?: string
}>()

const { t } = useI18n()
const theme = useTheme()

const loaded = ref(false)
const series1 = ref<number[]>([])
const series2 = ref<number[]>([])
const oldValues = ref<{ net?: Record<string, any>; dio?: Record<string, any> }>({})
const sampledAt = ref(0)

const isDualSeries = computed(() =>
  props.type === 'h-net' || props.type === 'hp-net' || props.type === 'h-dio',
)

const isPercentSeries = computed(() => props.type === 'h-cpu' || props.type === 'h-mem')

const series1Label = computed(() => {
  if (props.type === 'h-dio') return '↑'
  return t('stats.upload')
})

const series2Label = computed(() => {
  if (props.type === 'h-dio') return '↓'
  return t('stats.download')
})

const latestSeries1 = computed(() =>
  series1.value.length > 0 ? series1.value[series1.value.length - 1] : null,
)

const latestSeries2 = computed(() =>
  series2.value.length > 0 ? series2.value[series2.value.length - 1] : null,
)

const formatTick = (raw: number): string => {
  if (!Number.isFinite(raw) || raw <= 0) return '0'
  if (props.type === 'hp-net') return HumanReadable.packetFormat(raw, 0)
  if (props.type === 'h-net' || props.type === 'h-dio') return HumanReadable.sizeFormat(raw, 0)
  return `${Math.round(raw)}%`
}

const formatLiveValue = (raw: number | null): string => {
  if (raw === null || !Number.isFinite(raw)) return '—'
  if (isPercentSeries.value) return `${Math.round(Math.min(100, Math.max(0, raw)))}%`
  if (raw <= 0) {
    return props.type === 'hp-net' ? `0 ${t('stats.p')}/s` : `0 ${t('stats.B')}/s`
  }
  if (props.type === 'hp-net') return `${HumanReadable.packetFormat(raw, 1)}/s`
  return `${HumanReadable.sizeFormat(raw, 1)}/s`
}

const palette = computed(() => getChartPalette(theme))

const chartLabels = computed(() => {
  const len = Math.max(series1.value.length, MAX_POINTS)
  return new Array(len).fill('')
})

const padSeries = (values: number[]): (number | null)[] => {
  if (values.length >= MAX_POINTS) return values.slice(-MAX_POINTS)
  const padCount = MAX_POINTS - values.length
  return [...new Array<null>(padCount).fill(null), ...values]
}

const chartData = computed<ChartData<'line'>>(() => {
  const p = palette.value
  const singlePoint = series1.value.length <= 1

  if (!isDualSeries.value) {
    return {
      labels: chartLabels.value,
      datasets: [
        {
          label: props.type === 'h-cpu' ? t('main.chart.cpu') : t('main.chart.mem'),
          backgroundColor: p.primaryFill,
          borderColor: p.primary,
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: singlePoint ? 3 : 0,
          pointHoverRadius: 4,
          pointBackgroundColor: p.primary,
          data: padSeries(series1.value),
        },
      ],
    }
  }

  return {
    labels: chartLabels.value,
    datasets: [
      {
        label: series1Label.value,
        backgroundColor: p.uploadFill,
        borderColor: p.upload,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: singlePoint ? 3 : 0,
        pointHoverRadius: 4,
        pointBackgroundColor: p.upload,
        data: padSeries(series1.value),
      },
      {
        label: series2Label.value,
        backgroundColor: p.downloadFill,
        borderColor: p.download,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: singlePoint ? 3 : 0,
        pointHoverRadius: 4,
        pointBackgroundColor: p.download,
        data: padSeries(series2.value),
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => {
  const p = palette.value
  const suggestedMax = props.type === 'hp-net' ? 10 : isDualSeries.value ? 1024 : 100

  return {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: p.tooltipBg,
        borderColor: p.tooltipBorder,
        borderWidth: 1,
        titleColor: p.tooltipText,
        bodyColor: p.tooltipText,
        padding: 8,
        displayColors: true,
        titleFont: { family: p.fontFamily, size: 11 },
        bodyFont: { family: p.fontFamily, size: 11 },
        callbacks: {
          title: () => '',
          label: (ctx) => {
            const val = Number(ctx.parsed.y)
            const prefix = ctx.dataset.label ? `${ctx.dataset.label}: ` : ''
            return `${prefix}${formatLiveValue(Number.isFinite(val) ? val : null)}`
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        min: 0,
        max: isPercentSeries.value ? 100 : undefined,
        suggestedMax: isPercentSeries.value ? undefined : suggestedMax,
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: p.gridColor,
        },
        ticks: {
          color: p.mutedColor,
          maxTicksLimit: 5,
          font: {
            family: p.fontFamily,
            size: 11,
          },
          callback: (value) => formatTick(Number(value)),
        },
      },
    },
  }
})

const pushSingle = (val: number) => {
  const clamped = Math.min(100, Math.max(0, val))
  const next = [...series1.value, clamped]
  if (next.length > MAX_POINTS) next.shift()
  series1.value = next
  loaded.value = true
}

const pushDual = (upVal: number, downVal: number) => {
  const next1 = [...series1.value, Math.max(0, upVal)]
  const next2 = [...series2.value, Math.max(0, downVal)]
  if (next1.length > MAX_POINTS) next1.shift()
  if (next2.length > MAX_POINTS) next2.shift()
  series1.value = next1
  series2.value = next2
  loaded.value = true
}

const ingestSample = (v: Record<string, any> | undefined) => {
  if (!v || typeof v !== 'object') return
  const now = Date.now()
  const elapsed = sampledAt.value ? (now - sampledAt.value) / 1000 : 0
  sampledAt.value = now

  switch (props.type) {
    case 'h-cpu':
      if (Number.isFinite(Number(v.cpu))) {
        pushSingle(Number(v.cpu))
      }
      break
    case 'h-mem':
      if (v.mem && Number(v.mem.total) > 0) {
        pushSingle((Number(v.mem.current || 0) * 100) / Number(v.mem.total))
      }
      break
    case 'h-net':
      if (v.net) {
        if (oldValues.value.net?.sent != null && elapsed > 0) {
          const downSpeed = Math.max(0, Number(v.net.recv) - Number(oldValues.value.net.recv)) / elapsed
          const upSpeed = Math.max(0, Number(v.net.sent) - Number(oldValues.value.net.sent)) / elapsed
          pushDual(upSpeed, downSpeed)
        } else if (!loaded.value) {
          pushDual(0, 0)
        }
        oldValues.value.net = v.net
      }
      break
    case 'hp-net':
      if (v.net) {
        if (oldValues.value.net?.psent != null && elapsed > 0) {
          const downSpeed = Math.max(0, Number(v.net.precv) - Number(oldValues.value.net.precv)) / elapsed
          const upSpeed = Math.max(0, Number(v.net.psent) - Number(oldValues.value.net.psent)) / elapsed
          pushDual(upSpeed, downSpeed)
        } else if (!loaded.value) {
          pushDual(0, 0)
        }
        oldValues.value.net = v.net
      }
      break
    case 'h-dio':
      if (v.dio) {
        if (oldValues.value.dio?.read != null && elapsed > 0) {
          const downSpeed = Math.max(0, Number(v.dio.read) - Number(oldValues.value.dio.read)) / elapsed
          const upSpeed = Math.max(0, Number(v.dio.write) - Number(oldValues.value.dio.write)) / elapsed
          pushDual(upSpeed, downSpeed)
        } else if (!loaded.value) {
          pushDual(0, 0)
        }
        oldValues.value.dio = v.dio
      }
      break
  }
}

watch(
  () => props.tilesData,
  (v) => ingestSample(v),
  { immediate: true },
)
</script>

<style scoped>
.sui-history {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  gap: 6px;
}

.sui-history__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.75rem;
  line-height: 1.2;
  min-height: 16px;
}

.sui-history__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sui-history__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sui-history__dot--primary {
  background-color: rgb(var(--v-theme-primary));
}

.sui-history__dot--upload {
  background-color: rgb(var(--v-theme-upload));
}

.sui-history__dot--download {
  background-color: rgb(var(--v-theme-download));
}

.sui-history__val {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.sui-history__canvas {
  position: relative;
  flex: 1 1 auto;
  min-height: 118px;
  width: 100%;
}
</style>
