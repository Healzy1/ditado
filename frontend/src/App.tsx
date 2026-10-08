import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/app-layout'
import { ProtectedRoute } from './components/session/protected-route'
import { SessionBootstrap } from './components/session/session-bootstrap'
import { AppHomePage } from './pages/app-home-page'
import { LandingPage } from './pages/landing-page'
import { LoginPage } from './pages/login-page'
import { RegisterPage } from './pages/register-page'

function App() {
  return (
    <SessionBootstrap>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AppHomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionBootstrap>
  )
}

export default App
