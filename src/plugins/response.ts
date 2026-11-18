export interface Msg {
  success: boolean
  msg: string
  obj: any | null
  warning?: string
}

// The backend answers an unauthenticated panel/API call with this message,
// either as HTTP 401 JSON (current backend) or as HTTP 200 JSON (older builds).
export const INVALID_LOGIN = 'Invalid login'

export function normalizeResponse(data: unknown): Msg {
  if (data && typeof data === 'object' && 'success' in data && typeof data.success === 'boolean') {
    const value = data as Record<string, unknown>
    return {
      success: data.success,
      msg: typeof value.msg === 'string' ? value.msg : '',
      obj: value.obj ?? null,
      warning: typeof value.warning === 'string' ? value.warning : undefined,
    }
  }
  // Never echo arbitrary response bodies: they may contain a login page or secrets.
  return { success: false, msg: 'Invalid server response', obj: null }
}

export function isInvalidLogin(msg: Msg | null | undefined): boolean {
  return !!msg && !msg.success && msg.msg === INVALID_LOGIN
}

// errorToMsg turns a rejected axios request into a Msg. HTTP 401 is always an
// invalid login; other HTTP errors keep the server's JSON {success,msg} body
// when there is one, and fall back to the error text otherwise.
export function errorToMsg(e: any): Msg {
  const response = e?.response
  if (response) {
    if (response.status === 401) return { success: false, msg: INVALID_LOGIN, obj: null }
    const data = response.data
    if (data && typeof data === 'object' && typeof data.success === 'boolean') {
      const msg = normalizeResponse(data)
      if (msg.msg) return msg
    }
  }
  return { success: false, msg: String(e ?? 'Request failed'), obj: null }
}
