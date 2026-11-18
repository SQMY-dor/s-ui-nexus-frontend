import api from './api'
import { i18n } from '@/locales'
import router from '@/router'
import { push } from 'notivue'
import type { AxiosRequestConfig } from 'axios'

import { errorToMsg, isInvalidLogin, normalizeResponse, type Msg } from './response'
export type { Msg } from './response'

function _handleMsg(msg: Msg): void {
  if (msg.warning) push.warning({ message: i18n.global.t('feedback.' + msg.warning) })
  if(msg.msg){
    if (isInvalidLogin(msg)) {
      handleInvalidLogin()
      return
    }
    if (msg.success) {
      push.success({
        message: i18n.global.t('success') + ": " + i18n.global.t('actions.' + msg.msg),
      })
    } else {
      push.error({
        title: i18n.global.t('failed'),
        message: msg.msg
      })
    }
  }
}

let invalidLoginPending = false

// handleInvalidLogin runs once per expired session (the panel polls several
// endpoints at a time), shows the toast and sends the user to the login page.
// router.push('/login') resolves under the configured base path.
export const handleInvalidLogin = async () => {
  if (invalidLoginPending) return
  invalidLoginPending = true
  try {
    push.error({
      title: i18n.global.t('invalidLogin'),
    })
    await HttpUtils.get('api/logout')
    // The session is already gone; go to the login page even if logout fails.
    router.push('/login')
  } finally {
    invalidLoginPending = false
  }
}

export const logout = async () => {
  const response = await HttpUtils.get('api/logout')
  if(response.success){
    router.push('/login')
  }
}

const HttpUtils = {
  async get(url: string, data: object = {}, options: AxiosRequestConfig = {}): Promise<Msg> {
    let msg: Msg
    try {
        const resp = await api.get(url, { params: data, ...options })
        msg = normalizeResponse(resp.data)
    } catch (e: any) {
        msg = errorToMsg(e)
    }
    _handleMsg(msg)
    return msg
  },
  async post(url: string, data: object | null, options: any = undefined): Promise<Msg> {
    let msg: Msg
    try {
        const resp = await api.post(url, data, options)
        msg = normalizeResponse(resp.data)
    } catch (e: any) {
        msg = errorToMsg(e)
    }
    _handleMsg(msg)
    return msg
  },
}

export default HttpUtils
