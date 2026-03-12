import { useState } from 'react'
import { api } from '../services/api'

export const useSignin = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const signin = async (platform, credentials) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api(`/signin/${platform}`, {
        method: 'POST',
        body: JSON.stringify(credentials)
      })
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { signin, loading, error }
}
