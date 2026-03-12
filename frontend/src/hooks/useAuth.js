import { useState, useEffect } from 'react'
import { getToken, setToken, removeToken, isAuthenticated } from '../services/authService'

export const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(isAuthenticated())

  const login = (token) => {
    setToken(token)
    setAuthenticated(true)
  }

  const logout = () => {
    removeToken()
    setAuthenticated(false)
  }

  return { authenticated, login, logout, getToken }
}
