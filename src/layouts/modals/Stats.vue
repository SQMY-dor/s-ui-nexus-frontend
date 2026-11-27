<template>
  <v-dialog transition="dialog-bottom-transition" width="100%" max-width="880">
    <v-card class="sui-modal-card" :loading="loading">
      <div class="sui-modal-header">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar color="primary" variant="tonal" size="34" rounded="md" class="flex-shrink-0">
            <v-icon icon="mdi-chart-timeline-variant" size="18" />
          </v-avatar>
          <div class="d-flex align-center ga-2 flex-wrap min-w-0">
            <div class="text-subtitle-1 font-weight-semibold text-truncate">
              {{ $t('stats.graphTitle') }}
            </div>
            <v-chip v-if="resource && tag" size="small" variant="tonal" color="secondary" class="sui-mono">
              {{ $t('objects.' + resource) }} · {{ tag }}
            </v-chip>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('actions.close')"
          @click="$emit('close')"
        />
      </div>

      <v-divider />

      <div class="sui-modal-body">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <v-btn-toggle
            v-model="limit"
            mandatory
            color="primary"
            variant="outlined"
            density="compact"
            divided
            class="sui-period-toggle"
            @update:model-value="changePeriod"
          >
            <v-btn
              v-for="p in periods"
              :key="String(p.value)"
              :value="p.value"
              size="small"
              class="sui-num"
            >
              {{ p.title }}
            </v-btn>
          </v-btn-toggle>

          <div v-if="loaded" class="d-flex align-center ga-4 sui-num text-body-2" dir="ltr">
            <span class="d-inline-flex align-center ga-1 text-upload font-weight-medium">
              <v-icon icon="mdi-arrow-up" size="15" />
              {{ totalUploadText }}
            </span>
            <span class="d-inline-flex align-center ga-1 text-download font-weight-medium">
              <v-icon icon="mdi-arrow-down" size="15" />
              {{ totalDownloadText }}
            </span>
            <span class="text-medium-emphasis">
              {{ totalCombinedText }}
            </span>
          </div>
        </div>

        <div id="container" class="sui-chart-wrap">
          <v-skeleton-loader
            v-if="loading"
            class="mx-auto"
            type="image"
            height="300"
          />
          <template v-else>
            <v-alert v-if="alert" :text="$t('noData')" type="warning" variant="tonal" density="compact" />
            <LineChart
              v-if="loaded"
              :key="chartThemeKey"
              :data="chartData"
              :options="<any>chartOptions"
            />
          </template>
        </div>
      </div>

      <v-divider />

      <div class="sui-modal-actions">
        <v-btn
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadData"
        >
          {{ $t('actions.update') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('close')">
          {{ $t('actions.close') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { useTheme } from 'vuetify'
import { i18n } from '@/locales'
import HttpUtils from '@/plugins/httputil'
import { HumanReadable } from '@/plugins/utils'
import { getChartPalette } from '@/plugins/chartTheme'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line as LineChart } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export default {
  components: {
    LineChart,
  },
  props: ['visible', 'resource', 'tag'],
  emits: ['close'],
  setup() {
    const theme = useTheme()
    return { theme }
  },
  data() {
    return {
      loading: false,
      loaded: false,
      alert: false,
      intervalId: <any>0,
      limit: <number | string>1,
      chartLabels: <string[]>[],
      uplinkData: <Array<number | null>>[],
      downlinkData: <Array<number | null>>[],
      periods: [
        { value: 'live', title: i18n.global.t('stats.live') },
        { value: 1, title: i18n.global.n(1) + i18n.global.t('date.h') },
        { value: 6, title: i18n.global.n(6) + i18n.global.t('date.h') },
        { value: 12, title: i18n.global.n(12) + i18n.global.t('date.h') },
        { value: 24, title: i18n.global.n(1) + i18n.global.t('date.d') },
        { value: 48, title: i18n.global.n(2) + i18n.global.t('date.d') },
        { value: 240, title: i18n.global.n(10) + i18n.global.t('date.d') },
        { value: 480, title: i18n.global.n(20) + i18n.global.t('date.d') },
        { value: 720, title: i18n.global.n(30) + i18n.global.t('date.d') },
        { value: 1440, title: i18n.global.n(60) + i18n.global.t('date.d') },
        { value: 2160, title: i18n.global.n(90) + i18n.global.t('date.d') },
      ],
    }
  },
  computed: {
    palette() {
      return getChartPalette(this.theme)
    },
    chartThemeKey(): string {
      return this.palette.isDark ? 'dark' : 'light'
    },
    chartData() {
      const p = this.palette
      return {
        labels: this.chartLabels,
        datasets: [
          {
            label: i18n.global.t('stats.upload'),
            backgroundColor: p.uploadFill,
            borderColor: p.upload,
            pointBackgroundColor: p.upload,
            pointBorderColor: p.upload,
            fill: true,
            spanGaps: true,
            data: this.uplinkData,
          },
          {
            label: i18n.global.t('stats.download'),
            backgroundColor: p.downloadFill,
            borderColor: p.download,
            pointBackgroundColor: p.download,
            pointBorderColor: p.download,
            fill: true,
            spanGaps: true,
            data: this.downlinkData,
          },
        ],
      }
    },
    chartOptions() {
      const p = this.palette
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        elements: {
          line: {
            borderWidth: 2,
            tension: 0.2,
          },
          point: {
            pointStyle: 'circle',
            radius: 2,
            hoverRadius: 5,
            borderWidth: 1,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: p.textColor,
              font: {
                family: p.fontFamily,
                size: 12,
              },
              usePointStyle: true,
              boxWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: p.tooltipBg,
            titleColor: p.tooltipText,
            bodyColor: p.tooltipText,
            footerColor: p.mutedColor,
            borderColor: p.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            titleFont: { family: p.fontFamily },
            bodyFont: { family: p.fontFamily },
            footerFont: { family: p.fontFamily, weight: 'bold' as const },
            callbacks: {
              label: (ctx: any) => {
                const val = typeof ctx.raw === 'number' ? HumanReadable.sizeFormat(ctx.raw) : '-'
                return `${ctx.dataset.label}: ${val}`
              },
              footer: (items: any[]) => {
                return HumanReadable.sizeFormat(items.reduce((acc, c) => acc + (Number(c.raw) || 0), 0))
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: p.gridColor,
            },
            border: {
              color: p.borderColor,
            },
            ticks: {
              color: p.mutedColor,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
              font: {
                family: p.fontFamily,
                size: 11,
              },
            },
          },
          y: {
            grid: {
              color: p.gridColor,
            },
            border: {
              color: p.borderColor,
            },
            beginAtZero: true,
            ticks: {
              color: p.mutedColor,
              font: {
                family: p.fontFamily,
                size: 11,
              },
              callback: function (label: any) {
                return label == 0 ? '0' : HumanReadable.sizeFormat(label, 0)
              },
              count: 8,
            },
          },
        },
      }
    },
    totalUpload(): number {
      return this.uplinkData.reduce<number>((sum, val) => sum + (val ?? 0), 0)
    },
    totalDownload(): number {
      return this.downlinkData.reduce<number>((sum, val) => sum + (val ?? 0), 0)
    },
    totalUploadText(): string {
      return HumanReadable.sizeFormat(this.totalUpload)
    },
    totalDownloadText(): string {
      return HumanReadable.sizeFormat(this.totalDownload)
    },
    totalCombinedText(): string {
      return HumanReadable.sizeFormat(this.totalUpload + this.totalDownload)
    },
  },
  methods: {
    async loadData() {
      this.loading = true
      const requestLimit = this.limit === 'live' ? 1 : Number(this.limit)
      const data = await HttpUtils.get('api/stats', { resource: this.resource, tag: this.tag, limit: requestLimit })
      if (data.success && data.obj) {
        const obj = <any[]>data.obj
        const l = this.dateLocale()
        const oneStep = requestLimit * 3600 * 1000 / 360
        const now = new Date().getTime()
        const steps = <number[]>[]
        for (let i = 360; i >= 0; i--) {
          steps.push(now - (oneStep * i))
        }
        const labels = <string[]>[]
        const uplinkData: Array<number | null> = []
        const downlinkData: Array<number | null> = []
        for (let i = 1; i < 360; i++) {
          labels.push(this.genLable(steps[i], l))
          const upTraffics = obj.filter(o => o.direction && o.dateTime * 1000 < steps[i] && o.dateTime * 1000 > steps[i - 1]).map((o: any) => o.traffic)
          const upSum = upTraffics.length > 0
            ? upTraffics.reduce((sum: number, value: number) => sum + value, 0)
            : null
          const downTraffics = obj.filter(o => !o.direction && o.dateTime * 1000 < steps[i] && o.dateTime * 1000 > steps[i - 1]).map((o: any) => o.traffic)
          const downSum = downTraffics.length > 0
            ? downTraffics.reduce((sum: number, value: number) => sum + value, 0)
            : null
          uplinkData.push(upSum)
          downlinkData.push(downSum)
        }
        this.chartLabels = labels
        this.uplinkData = uplinkData
        this.downlinkData = downlinkData
        this.loaded = true
        this.alert = false
      } else {
        this.alert = true
        this.loaded = false
      }
      this.loading = false
    },
    changePeriod() {
      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = 0
      }
      this.loadData()
      if (this.limit === 'live') {
        this.intervalId = setInterval(() => this.loadData(), 10000)
      }
    },
    genLable(step: number, locale: string) {
      return new Date(step).toLocaleString(locale, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    },
    dateLocale() {
      const selected = String(i18n.global.locale.value)
      return ({ zhHans: 'zh-CN', zhHant: 'zh-TW', fa: 'fa-IR', vi: 'vi-VN', ru: 'ru-RU', ja: 'ja-JP', fr: 'fr-FR', la: 'la' } as Record<string, string>)[selected] ?? 'en-US'
    },
  },
  beforeUnmount() {
    if (this.intervalId && this.intervalId != 0) {
      clearInterval(this.intervalId)
      this.intervalId = 0
    }
  },
  watch: {
    visible(v) {
      if (v) {
        this.limit = 1
        this.loadData()
      } else {
        this.loaded = false
        this.alert = false
        this.chartLabels = []
        this.uplinkData = []
        this.downlinkData = []
        if (this.intervalId && this.intervalId != 0) {
          clearInterval(this.intervalId)
          this.intervalId = 0
        }
      }
    },
  },
}
</script>

<style scoped>
.sui-period-toggle {
  flex-wrap: wrap;
  height: auto !important;
}

.sui-chart-wrap {
  height: 360px;
  max-height: 48vh;
  padding: 12px;
  border-radius: var(--sui-radius-md);
  border: 1px solid var(--sui-hairline);
  background-color: rgb(var(--v-theme-surface-light));
}
</style>
