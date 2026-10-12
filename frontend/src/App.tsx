import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/app-layout'
import { AdminRoute } from './components/session/admin-route'
import { ProtectedRoute } from './components/session/protected-route'
import { SessionBootstrap } from './components/session/session-bootstrap'
import { AppHomePage } from './pages/app-home-page'
import { AdminUserDetailPage } from './pages/admin-user-detail-page'
import { AdminUsersPage } from './pages/admin-users-page'
import { HistoryPage } from './pages/history-page'
import { ForgotPasswordPage } from './pages/forgot-password-page'
import { LandingPage } from './pages/landing-page'
import { LoginPage } from './pages/login-page'
import { ProfilePage } from './pages/profile-page'
import { RegisterPage } from './pages/register-page'
import { ResetPasswordPage } from './pages/reset-password-page'
import { TranscriptionDetailPage } from './pages/transcription-detail-page'

function App() {
  return (
    <SessionBootstrap>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AppHomePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="transcriptions/:id" element={<TranscriptionDetailPage />} />
          <Route path="admin" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="admin/users/:id" element={<AdminRoute><AdminUserDetailPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionBootstrap>
  )
}

export default App
