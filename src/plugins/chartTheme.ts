import type { useTheme } from 'vuetify'

export interface ChartPalette {
  isDark: boolean
  textColor: string
  mutedColor: string
  gridColor: string
  borderColor: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  primary: string
  primaryFill: string
  upload: string
  uploadFill: string
  download: string
  downloadFill: string
  info: string
  warning: string
  error: string
  fontFamily: string
}

const DEFAULT_CHART_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Vazirmatn', system-ui, sans-serif"

const clampAlpha = (alpha: number): number => {
  if (!Number.isFinite(alpha)) return 1
  return Math.min(1, Math.max(0, alpha))
}

/** Convert #RGB, #RRGGBB, #RRGGBBAA, or rgb()/rgba() string to rgba(r, g, b, alpha). */
export function hexToRgba(color: string, alpha: number): string {
  const a = clampAlpha(alpha)
  const trimmed = color.trim()

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/)
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${a})`
  }

  let hex = trimmed.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  } else if (hex.length === 8) {
    hex = hex.slice(0, 6)
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return trimmed
  }

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const readThemeColor = (colors: Record<string, unknown>, key: string, fallback: string): string => {
  const value = colors[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

const resolveChartFont = (): string => {
  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    const cssFont = getComputedStyle(document.documentElement)
      .getPropertyValue('--sui-font-sans')
      .trim()
    if (cssFont.length > 0) return cssFont
  }
  return DEFAULT_CHART_FONT
}

export function getChartPalette(theme: ReturnType<typeof useTheme>): ChartPalette {
  const current = theme.current.value
  const isDark = Boolean(current.dark)
  const colors = current.colors as Record<string, unknown>

  const primary = readThemeColor(colors, 'primary', isDark ? '#2DD4BF' : '#0F766E')
  const upload = readThemeColor(colors, 'upload', isDark ? '#FB923C' : '#C2410C')
  const download = readThemeColor(colors, 'download', isDark ? '#34D399' : '#047857')
  const info = readThemeColor(colors, 'info', isDark ? '#38BDF8' : '#0369A1')
  const warning = readThemeColor(colors, 'warning', isDark ? '#FBBF24' : '#B45309')
  const error = readThemeColor(colors, 'error', isDark ? '#F87171' : '#DC2626')
  const textColor = readThemeColor(colors, 'on-surface', isDark ? '#E2E8F0' : '#0F172A')
  const borderColor = readThemeColor(colors, 'outline', isDark ? '#334155' : '#CBD5E1')
  const tooltipBg = isDark
    ? readThemeColor(colors, 'surface-bright', '#1C273B')
    : readThemeColor(colors, 'surface', '#FFFFFF')

  const fillAlpha = isDark ? 0.18 : 0.14

  return {
    isDark,
    textColor,
    mutedColor: hexToRgba(textColor, isDark ? 0.72 : 0.68),
    gridColor: isDark ? hexToRgba('#CBD5E1', 0.10) : hexToRgba('#0F172A', 0.08),
    borderColor,
    tooltipBg,
    tooltipBorder: borderColor,
    tooltipText: textColor,
    primary,
    primaryFill: hexToRgba(primary, fillAlpha),
    upload,
    uploadFill: hexToRgba(upload, fillAlpha),
    download,
    downloadFill: hexToRgba(download, fillAlpha),
    info,
    warning,
    error,
    fontFamily: resolveChartFont(),
  }
}
