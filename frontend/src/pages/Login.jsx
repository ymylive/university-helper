import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { api } from '../utils/api'
import { setToken } from '../utils/auth'
import { Button, Input, Card } from '../components'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const resp = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      setToken(resp.access_token || resp.token, resp.shuake_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || '登录失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <LogIn className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">登录</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="邮箱"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="密码"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" variant="primary" className="w-full">
            登录
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          还没有账号？ <Link to="/register" className="text-primary hover:underline cursor-pointer">注册</Link>
        </p>
      </Card>
    </div>
  )
}
