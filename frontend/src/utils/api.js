import { getToken } from './auth'

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1'
const DEFAULT_TIMEOUT_MS = 20000

const parsePayload = async (response) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (_) {
    return { message: text }
  }
}

const pickErrorMessage = (payload, status) => {
  if (!payload) return `请求失败（${status}）`
  return (
    payload.message ||
    payload.detail ||
    payload.error ||
    payload.msg ||
    payload.data?.message ||
    `请求失败（${status}）`
  )
}

export const api = async (endpoint, options = {}) => {
  const token = getToken()
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const hasCustomSignal = Boolean(options.signal)
  const controller = hasCustomSignal ? null : new AbortController()
  const timeoutId =
    !hasCustomSignal && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => controller?.abort(), timeoutMs)
      : null

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const requestOptions = {
    ...options,
    headers,
    ...(hasCustomSignal ? {} : { signal: controller.signal })
  }
  delete requestOptions.timeoutMs

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, requestOptions)
    const payload = await parsePayload(response)
    if (!response.ok || payload?.status === false) {
      throw new Error(pickErrorMessage(payload, response.status))
    }
    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试。')
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
