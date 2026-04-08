const TOKEN_KEY = 'auth_token'
const SHUAKE_TOKEN_KEY = 'shuake_token'

const readLegacyToken = (key) => {
  const legacyValue = window.localStorage.getItem(key)
  if (!legacyValue) return null
  window.sessionStorage.setItem(key, legacyValue)
  window.localStorage.removeItem(key)
  return legacyValue
}

export const setToken = (token, shuakeToken) => {
  window.sessionStorage.setItem(TOKEN_KEY, token)
  window.localStorage.removeItem(TOKEN_KEY)
  if (shuakeToken || token) {
    window.sessionStorage.setItem(SHUAKE_TOKEN_KEY, shuakeToken || token)
    window.localStorage.removeItem(SHUAKE_TOKEN_KEY)
  }
}

export const getToken = () => {
  return window.sessionStorage.getItem(TOKEN_KEY) || readLegacyToken(TOKEN_KEY)
}

export const getShuakeToken = () => {
  return window.sessionStorage.getItem(SHUAKE_TOKEN_KEY) || readLegacyToken(SHUAKE_TOKEN_KEY)
}

export const setShuakeToken = (token) => {
  if (token) {
    window.sessionStorage.setItem(SHUAKE_TOKEN_KEY, token)
    window.localStorage.removeItem(SHUAKE_TOKEN_KEY)
  }
}

export const removeToken = () => {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(SHUAKE_TOKEN_KEY)
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(SHUAKE_TOKEN_KEY)
}

export const isAuthenticated = () => {
  return !!getToken()
}
