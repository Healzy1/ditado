import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth-store'

interface AdminRouteProps {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const user = useAuthStore((state) => state.user)
  const sessionStatus = useAuthStore((state) => state.sessionStatus)

  if (sessionStatus !== 'ready' || user?.role !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
