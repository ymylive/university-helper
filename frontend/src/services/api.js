import { getToken } from './authService'

const API_BASE = '/api'

export const api = async (endpoint, options = {}) => {
  const token = getToken()
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
