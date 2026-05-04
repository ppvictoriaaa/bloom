import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { RouteNames } from './routes'

export const PrivateRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to={RouteNames.LOGIN} replace />
}
