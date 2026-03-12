import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChaoxingSignin from './pages/ChaoxingSignin'
import ChaoxingFanya from './pages/ChaoxingFanya'
import Zhihuishu from './pages/Zhihuishu'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chaoxing-signin" element={<ChaoxingSignin />} />
        <Route path="/chaoxing-fanya" element={<ChaoxingFanya />} />
        <Route path="/zhihuishu-panel" element={<Zhihuishu />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
