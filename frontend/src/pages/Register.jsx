import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { api } from '../utils/api'
import { setToken } from '../utils/auth'
import { Button, Input, Card } from '../components'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const resp = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      setToken(resp.access_token || resp.token, resp.shuake_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || '注册失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">注册</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="用户名"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
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
          <Button type="submit" className="w-full">
            注册
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          已有账号？ <Link to="/login" className="text-primary hover:underline cursor-pointer">登录</Link>
        </p>
      </Card>
    </div>
  )
}
