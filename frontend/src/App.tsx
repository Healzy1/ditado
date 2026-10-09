import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/app-layout'
import { ProtectedRoute } from './components/session/protected-route'
import { SessionBootstrap } from './components/session/session-bootstrap'
import { AppHomePage } from './pages/app-home-page'
import { HistoryPage } from './pages/history-page'
import { LandingPage } from './pages/landing-page'
import { LoginPage } from './pages/login-page'
import { ProfilePage } from './pages/profile-page'
import { RegisterPage } from './pages/register-page'
import { TranscriptionDetailPage } from './pages/transcription-detail-page'

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
          <Route path="history" element={<HistoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="transcriptions/:id" element={<TranscriptionDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionBootstrap>
  )
}

export default App
