// Ported from shenaba/2s-ui (GPL-3.0), adapted for s-ui-nexus.
//
// Pure helpers for the cluster (multi-node) pages. Kept free of Vue, Vuetify
// and '@/' imports so tests/ can load this file directly with Node.

export type NodeState = 'online' | 'offline' | 'core-stopped'
export type NodeCardState = NodeState | 'disabled' | 'pending'

export interface NodeMem {
  current: number
  total: number
}

/** Live heartbeat snapshot (load.nodesStatus[id] / nodes[].status / testNode). */
export interface NodeStatus {
  state: NodeState
  latency: number
  cpu: number
  mem: NodeMem
  appVersion: string
  coreVersion: string
  error?: string
  checkedAt: number
  lastOnline: number
}

/** Node as returned by GET api/nodes (the token never comes back, only tokenSet). */
export interface Node {
  id: number
  enable: boolean
  name: string
  baseUrl: string
  webPath: string
  token?: string
  tokenSet?: boolean
  insecure: boolean
  certPin: string
  desc: string
  lastSeen: number
  dirty?: boolean
  lastSync?: number
  status?: NodeStatus
}

/** Remote inbound row from GET api/nodeInbounds. */
export interface RemoteInbound {
  id: number
  type: string
  tag: string
  adopted: boolean
}

export const defaultNode = (): Node => ({
  id: 0,
  enable: true,
  name: '',
  baseUrl: '',
  webPath: '/app/',
  token: '',
  tokenSet: false,
  insecure: false,
  certPin: '',
  desc: '',
  lastSeen: 0,
})

/** Card state: disabled nodes are never probed; no snapshot yet = pending. */
export const nodeCardState = (node: Pick<Node, 'enable'>, status?: NodeStatus | null): NodeCardState => {
  if (!node.enable) return 'disabled'
  if (!status || !status.state) return 'pending'
  if (status.state === 'online' || status.state === 'core-stopped' || status.state === 'offline') return status.state
  return 'offline'
}

/** Vuetify color name for a card state. */
export const nodeStateColor = (state: NodeCardState): string => {
  switch (state) {
    case 'online': return 'success'
    case 'core-stopped': return 'warning'
    case 'offline': return 'error'
    default: return 'grey'
  }
}

/** i18n key (under node.status.*) for a card state. */
export const nodeStateKey = (state: NodeCardState): string => {
  switch (state) {
    case 'core-stopped': return 'node.status.coreStopped'
    case 'disabled': return 'node.status.disabled'
    default: return 'node.status.' + state
  }
}

export const memPercent = (mem?: NodeMem | null): number => {
  if (!mem || !(mem.total > 0) || !(mem.current >= 0)) return 0
  return Math.min(100, Math.round((mem.current / mem.total) * 100))
}

export const cpuPercent = (cpu?: number | null): number => {
  if (typeof cpu !== 'number' || !Number.isFinite(cpu) || cpu < 0) return 0
  return Math.min(100, Math.round(cpu))
}

/**
 * Relative time split into a value and a unit for Intl.RelativeTimeFormat.
 * Returns null for 0 / missing timestamps ("never").
 */
export const relativeParts = (unixSec: number, nowSec: number): { value: number; unit: 'second' | 'minute' | 'hour' | 'day' } | null => {
  if (!unixSec || unixSec <= 0) return null
  const diff = unixSec - nowSec
  const abs = Math.abs(diff)
  if (abs < 60) return { value: Math.trunc(diff), unit: 'second' }
  if (abs < 3600) return { value: Math.trunc(diff / 60), unit: 'minute' }
  if (abs < 86400) return { value: Math.trunc(diff / 3600), unit: 'hour' }
  return { value: Math.trunc(diff / 86400), unit: 'day' }
}

/** Host[:port] for display: drops the scheme. */
export const displayBaseUrl = (baseUrl: string): string => (baseUrl ?? '').replace(/^https?:\/\//i, '')

/**
 * Client-side form validation mirroring service/node.go Save. Returns i18n
 * keys (under node.err.*) of the problems found; empty when the form is OK.
 * The backend stays authoritative; this only avoids a round trip.
 */
export const validateNode = (node: Partial<Node>, isNew: boolean, originalName = ''): string[] => {
  const errors: string[] = []
  const name = (node.name ?? '').trim()
  if (name === '') errors.push('node.err.nameRequired')
  else if (/[[\]]/.test(name) && (isNew || name !== originalName)) errors.push('node.err.nameBrackets')
  const baseUrl = (node.baseUrl ?? '').trim()
  if (!/^https?:\/\/[^/\s]+/i.test(baseUrl)) errors.push('node.err.baseUrl')
  else if (/^https?:\/\/[^/]+\/.+/i.test(baseUrl)) errors.push('node.err.baseUrlPath')
  const token = (node.token ?? '').trim()
  if (token === '' && (isNew || !node.tokenSet)) errors.push('node.err.tokenRequired')
  const pin = (node.certPin ?? '').replace(/[:\s]/g, '')
  if (pin !== '' && !/^[0-9a-fA-F]{64}$/.test(pin)) errors.push('node.err.certPin')
  return errors
}

/** Payload for save/testNode: trims fields; an empty token on edit means "keep". */
export const nodePayload = (node: Node): Node => {
  const out: Node = {
    ...node,
    name: (node.name ?? '').trim(),
    baseUrl: (node.baseUrl ?? '').trim().replace(/\/+$/, ''),
    webPath: (node.webPath ?? '').trim() || '/app/',
    token: (node.token ?? '').trim(),
    certPin: (node.certPin ?? '').trim(),
    desc: node.desc ?? '',
  }
  delete out.status
  delete out.tokenSet
  return out
}

/**
 * True when an external link remark is a cluster node link ("[name] tag").
 * Mirrors isNodeOwnedRemark in service/client.go.
 */
export const isNodeLinkRemark = (remark: string | undefined, nodeNames: string[]): boolean => {
  if (!remark || !remark.startsWith('[')) return false
  return nodeNames.some(n => n !== '' && remark.startsWith('[' + n + '] '))
}

/** Node name of a replica inbound (node_id set), '' for local inbounds. */
export const replicaNodeName = (inbound: { node_id?: number | null }, nodes: Pick<Node, 'id' | 'name'>[]): string => {
  const id = inbound?.node_id
  if (!id) return ''
  return nodes.find(n => n.id == id)?.name ?? ('#' + id)
}
