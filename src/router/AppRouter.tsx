import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { PrivateRoute } from './PrivateRoute'
import { Unauthorized } from '../modules/main/Unauthorized'
import { LoginPage } from '../modules/auth/LoginPage'
import { RegisterPage } from '../modules/auth/RegisterPage'
import { HomePage } from '../modules/home/HomePage'
import { ProfilePage } from '../modules/profile/ProfilePage'
import { VerifyEmailPage } from '../modules/notifications/VerifyEmailPage'
import { RouteNames } from './routes'

export const AppRouter = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={RouteNames.ROOT}
          element={isAuthenticated ? <Navigate to={RouteNames.HOME} replace /> : <Unauthorized />}
        />

        <Route path={RouteNames.LOGIN} element={<LoginPage />} />
        <Route path={RouteNames.REGISTER} element={<RegisterPage />} />
        <Route path={RouteNames.VERIFY_EMAIL} element={<VerifyEmailPage />} />

        <Route element={<PrivateRoute />}>
          <Route path={RouteNames.HOME} element={<HomePage />} />
          <Route path={RouteNames.PROFILE} element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
