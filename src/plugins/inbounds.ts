// Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus.
//
// Pure helpers for the inbound enable switch, the per-inbound traffic cap and
// adopt-time client assignment. Kept free of Vue, Vuetify and '@/' imports so
// tests/ can load this file directly with Node.

/** The fields of an inbounds list row these helpers read. */
export interface InboundRow {
  id: number
  tag: string
  type?: string
  enable?: boolean
  node_id?: number | null
  volume?: number
  up?: number
  down?: number
  users?: string[]
}

/** Absent means enabled: a panel older than the switch sends no enable. */
export const inboundEnabled = (i: Pick<InboundRow, 'enable'> | undefined | null): boolean =>
  !!i && i.enable !== false

/** Same comparison as the backend's Inbound.Depleted and a client's quota. */
export const inboundDepleted = (i: Pick<InboundRow, 'volume' | 'up' | 'down'>): boolean => {
  const volume = Number(i.volume ?? 0)
  return volume > 0 && Number(i.up ?? 0) + Number(i.down ?? 0) > volume
}

/** Used share of the cap in percent, clamped to 0..100; 0 when unlimited. */
export const inboundUsagePercent = (i: Pick<InboundRow, 'volume' | 'up' | 'down'>): number => {
  const volume = Number(i.volume ?? 0)
  if (!(volume > 0)) return 0
  const used = Number(i.up ?? 0) + Number(i.down ?? 0)
  const pct = Math.round((used / volume) * 100)
  return Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0))
}

const GiB = 1024 * 1024 * 1024

/** Cap in bytes from a GiB form value; empty, 0, negative or junk = unlimited (0). */
export const gbToBytes = (gb: unknown): number => {
  const n = typeof gb === 'string' ? parseFloat(gb) : Number(gb)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * GiB)
}

/** GiB form value from a cap in bytes, rounded to 2 decimals; 0 = unlimited. */
export const bytesToGb = (bytes: unknown): number => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round((n / GiB) * 100) / 100
}

/**
 * Label of an inbound in the client pickers: "[node] tag" for a cluster
 * replica, with a mark for one that is switched off (its links are not served
 * while it is off, but binding a client to it is still allowed).
 */
export const inboundPickerTitle = (i: InboundRow, nodeName: string, offMark: string): string => {
  const base = nodeName ? `[${nodeName}] ${i.tag}` : i.tag
  return inboundEnabled(i) ? base : `${base} (${offMark})`
}

/** Group of the clients a master pushes to its nodes; never bound by a node. */
export const CLUSTER_GROUP = '@cluster'

export interface PickerClient { id: number, group?: string | null }

/** Clients this panel may bind by its own choice (not upstream-owned @cluster ones). */
export const bindableClients = <T extends PickerClient>(clients: T[]): T[] =>
  (clients ?? []).filter(c => (c.group ?? '') !== CLUSTER_GROUP)

export type InitUsersModel = 'none' | 'all' | 'group' | 'client'

/** Resolves the Users picker (none/all/group/client) to client ids, as the inbound drawer does. */
export const resolveInitUsers = (model: InitUsersModel | string, values: unknown[], clients: PickerClient[]): number[] => {
  const pool = bindableClients(clients)
  switch (model) {
    case 'all':
      return pool.map(c => c.id)
    case 'group':
      return pool.filter(c => values.includes(c.group ?? '')).map(c => c.id)
    case 'client': {
      const ids = new Set(pool.map(c => c.id))
      return values.map(v => Number(v)).filter(v => ids.has(v))
    }
  }
  return []
}

/**
 * A group or client choice with nothing ticked resolves to no ids, which is
 * exactly what "none" sends: the form refuses it instead of silently binding
 * nobody.
 */
export const initUsersIncomplete = (model: InitUsersModel | string, values: unknown[]): boolean =>
  (model === 'group' || model === 'client') && (values ?? []).length === 0
