// Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus.
//
// Pure helpers for the Domains & Certificates page. Kept free of Vue, Vuetify
// and '@/' imports so tests/ can load this file directly with Node.

export type CertStatus = 'valid' | 'expiring' | 'expired' | 'missing'
export type CertTarget = 'web' | 'sub'

/** GET api/certs row (service.CertInfo). Times are unix seconds, 0 = n/a. */
export interface CertInfo {
  domain: string
  certFile: string
  keyFile: string
  ca: string
  keyType: string
  notAfter: number
  nextRenew: number
  managed: boolean
  status: CertStatus
  usedBy?: CertTarget[]
}

export interface AcmeStatus {
  supported: boolean
  installed: boolean
  path: string
  version: string
  certDir: string
  root: boolean
}

export interface NginxStatus {
  installed: boolean
  active: boolean
  port80Busy: boolean
}

export interface ApplyResult {
  domain: string
  certFile: string
  keyFile: string
  hotReloaded: string[] | null
  restartRequired: string[] | null
  warnings: string[] | null
}

export interface VhostResult {
  domain: string
  confFile: string
  certFile: string
  urls: string[] | null
}

export const DAY = 86400
/** Same window as service/cert.go certExpiringWindow (30 days). */
export const EXPIRING_WINDOW = 30 * DAY

/** Whole days until notAfter (negative once expired). */
export const daysLeft = (notAfter: number, nowSec: number): number =>
  Math.floor((notAfter - nowSec) / DAY)

/**
 * Status of a certificate. The server already sends `status`; this is the
 * fallback for rows without it and is kept identical to service/cert.go.
 */
export const certStatusOf = (c: Pick<CertInfo, 'notAfter'> & { status?: string }, nowSec: number): CertStatus => {
  if (c.status === 'valid' || c.status === 'expiring' || c.status === 'expired' || c.status === 'missing') return c.status
  if (!c.notAfter) return 'missing'
  if (nowSec >= c.notAfter) return 'expired'
  if (c.notAfter - nowSec < EXPIRING_WINDOW) return 'expiring'
  return 'valid'
}

export const certStatusColor = (s: CertStatus): string => {
  switch (s) {
    case 'valid': return 'success'
    case 'expiring': return 'warning'
    case 'expired': return 'error'
    default: return 'grey'
  }
}

/** Mirrors validDomain in service/acme.go (no IPs, >= 2 labels, LDH labels). */
export const isValidDomain = (d: string): boolean => {
  if (!d || d.length > 253) return false
  if (/^[0-9.]+$/.test(d) || d.includes(':')) return false
  const labels = d.split('.')
  if (labels.length < 2) return false
  return labels.every(l => l.length > 0 && l.length <= 63 && /^[A-Za-z0-9-]+$/.test(l) && !l.startsWith('-') && !l.endsWith('-'))
}

/** validCertDomain: also allows a leading "*." wildcard (registered certs). */
export const isValidCertDomain = (d: string): boolean =>
  d?.startsWith('*.') ? isValidDomain(d.slice(2)) : isValidDomain(d)

/** Loose e-mail check; empty is allowed (backend falls back to acmeEmail). */
export const isValidEmail = (e: string): boolean => {
  const v = (e ?? '').trim()
  if (v === '') return true
  return /^[^\s@;|&$`'"<>()]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(v)
}

/** Absolute server path check for saveManualCert. */
export const isAbsolutePath = (p: string): boolean => {
  const v = (p ?? '').trim()
  return v.startsWith('/') || /^[A-Za-z]:[\\/]/.test(v)
}

/** "true"/"false" form value, as the Go handlers parse it. */
export const formBool = (b: boolean): string => (b ? 'true' : 'false')

/** applyCert targets field. */
export const targetsField = (targets: CertTarget[]): string =>
  (['web', 'sub'] as CertTarget[]).filter(t => targets.includes(t)).join(',')

/** True when a certificate for `certDomain` (maybe "*.x") covers `host`. */
export const domainCovers = (certDomain: string, host: string): boolean => {
  const c = (certDomain ?? '').toLowerCase().trim()
  const h = (host ?? '').toLowerCase().trim()
  if (!c || !h) return false
  if (c === h) return true
  if (c.startsWith('*.')) {
    const base = c.slice(2)
    return h.endsWith('.' + base) && !h.slice(0, -(base.length + 1)).includes('.')
  }
  return false
}

/** A cert may be deleted only when neither the panel nor the subscription uses it. */
export const canDelete = (c: Pick<CertInfo, 'usedBy'>): boolean => !(c.usedBy && c.usedBy.length > 0)

/**
 * Where to send the browser after a panel restart. Mirrors how the panel will
 * be reachable: behind nginx (https on the domain, default port), with TLS
 * (https), or plain http on the configured port.
 */
export const panelURL = (opts: {
  domain: string
  port: string | number
  path: string
  tls: boolean
  behindNginx: boolean
  fallbackHost: string
  page?: string
}): string => {
  const host = opts.domain || opts.fallbackHost
  let path = opts.path || '/'
  if (!path.startsWith('/')) path = '/' + path
  if (!path.endsWith('/')) path += '/'
  const page = opts.page ?? ''
  if (opts.behindNginx) return `https://${host}${path}${page}`
  const port = String(opts.port ?? '')
  const proto = opts.tls ? 'https:' : 'http:'
  const portPart = port === '' || (opts.tls && port === '443') || (!opts.tls && port === '80') ? '' : ':' + port
  return `${proto}//${host}${portPart}${path}${page}`
}

/** webListen must be loopback when nginx terminates TLS for the panel. */
export const isLoopbackListen = (listen: string): boolean => {
  const v = (listen ?? '').trim()
  return v === '127.0.0.1' || v === '::1' || v === 'localhost' || v.startsWith('127.')
}
