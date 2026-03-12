const TOKEN_KEY = 'auth_token'
const SHUAKE_TOKEN_KEY = 'shuake_token'

export const setToken = (token, shuakeToken) => {
  localStorage.setItem(TOKEN_KEY, token)
  if (shuakeToken || token) {
    localStorage.setItem(SHUAKE_TOKEN_KEY, shuakeToken || token)
  }
}

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const getShuakeToken = () => {
  return localStorage.getItem(SHUAKE_TOKEN_KEY)
}

export const setShuakeToken = (token) => {
  if (token) {
    localStorage.setItem(SHUAKE_TOKEN_KEY, token)
  }
}

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SHUAKE_TOKEN_KEY)
}

export const isAuthenticated = () => {
  return !!getToken()
}
