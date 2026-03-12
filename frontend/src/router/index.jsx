import { createBrowserRouter } from 'react-router-dom'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import ChaoxingSignin from '../pages/ChaoxingSignin'
import ChaoxingFanya from '../pages/ChaoxingFanya'
import Zhihuishu from '../pages/Zhihuishu'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/chaoxing', element: <ChaoxingSignin /> },
  { path: '/fanya', element: <ChaoxingFanya /> },
  { path: '/zhihuishu-panel', element: <Zhihuishu /> },
  { path: '/', element: <Dashboard /> }
])
