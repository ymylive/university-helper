import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle, GraduationCap, LogOut } from 'lucide-react'
import { getToken, getShuakeToken, isAuthenticated, removeToken, setShuakeToken } from '../utils/auth'
import { api } from '../utils/api'
import { Button, Card } from '../components'

export default function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    const ensureShuakeToken = async () => {
      if (getShuakeToken()) return

      try {
        const resp = await api('/auth/shuake-token', { method: 'GET' })
        if (resp?.shuake_token) {
          setShuakeToken(resp.shuake_token)
          return
        }
      } catch (_) {
        // fallback for legacy sessions
      }

      const token = getToken()
      if (token) setShuakeToken(token)
    }

    ensureShuakeToken()
  }, [navigate])

  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }

  const services = [
    {
      title: '学习通签到',
      desc: '进入学习通签到服务',
      icon: CheckCircle,
      path: '/chaoxing-signin',
      color: 'bg-blue-500'
    },
    {
      title: '学习通泛雅',
      desc: '进入学习通课程服务',
      icon: BookOpen,
      path: '/chaoxing-fanya',
      color: 'bg-green-500'
    },
    {
      title: '智慧树',
      desc: '进入智慧树服务',
      icon: GraduationCap,
      path: '/zhihuishu-panel',
      color: 'bg-indigo-500'
    }
  ]

  return (
    <div className="min-h-screen">
      <nav className="clay-card border-b border-white/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">刷课平台</h1>
          <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">选择服务</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card
              key={service.path}
              onClick={() => navigate(service.path)}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className={`${service.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{service.title}</h3>
              <p className="text-slate-600">{service.desc}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
