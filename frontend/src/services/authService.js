import {
  getToken as getTokenFromStorage,
  setToken as setTokenInStorage,
  removeToken as removeTokenFromStorage,
  isAuthenticated as isAuthenticatedInStorage
} from '../utils/auth'

export const setToken = (token, shuakeToken) => setTokenInStorage(token, shuakeToken)
export const getToken = () => getTokenFromStorage()
export const removeToken = () => removeTokenFromStorage()
export const isAuthenticated = () => isAuthenticatedInStorage()
