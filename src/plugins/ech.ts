// Ported from shenaba/2s-ui (GPL-3.0) -- upstream s-ui-frontend 3235da1 -- adapted
// for s-ui-nexus.
//
// Pure helpers for the TLS drawer's ECH block. Kept free of Vue, Vuetify and
// '@/' imports so tests/ can load this file directly with Node.

/**
 * A stored ECH key or config as lines. sing-box keeps both as Listable[string],
 * which it writes as a bare string for one entry, so a string is one line set
 * (split on newlines) rather than something that breaks the drawer.
 */
export const asLines = (v: unknown): string[] => {
  if (typeof v === 'string') return v === '' ? [] : v.split('\n')
  if (Array.isArray(v)) return v.filter((l): l is string => typeof l === 'string')
  return []
}

/** Whether a client ECH config holds anything (a client with one never looks it up). */
export const echHasConfig = (config: unknown): boolean =>
  asLines(config).some(l => l.trim() != '')

/**
 * The query server name is locked only while it is empty next to a config:
 * then it has no effect. One already set stays editable so it can be cleared.
 */
export const echQueryLocked = (ech: { config?: unknown, query_server_name?: string } | undefined): boolean =>
  !!ech && echHasConfig(ech.config) && (ech.query_server_name ?? '').trim() == ''

/** Splits the api/keypairs?k=ech answer into its ECH CONFIGS and ECH KEYS blocks. */
export const splitEchPems = (lines: string[]): { config: string[], key: string[] } => {
  const config: string[] = []
  const key: string[] = []
  let into: string[] | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '-----BEGIN ECH CONFIGS-----') {
      into = config
      config.push(line)
    } else if (line === '-----BEGIN ECH KEYS-----') {
      into = key
      key.push(line)
    } else if (line === '-----END ECH CONFIGS-----' || line === '-----END ECH KEYS-----') {
      into?.push(line)
      into = null
    } else if (into && line !== '') {
      into.push(line)
    }
  }
  return { config, key }
}
