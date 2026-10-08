import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth-store'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const sessionStatus = useAuthStore((state) => state.sessionStatus)
  const setSessionStatus = useAuthStore((state) => state.setSessionStatus)

  if (sessionStatus === 'hydrating' || sessionStatus === 'syncing') {
    return <SessionNotice message="Verificando sua sessão..." />
  }

  if (!accessToken || sessionStatus === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  if (sessionStatus === 'error') {
    return (
      <SessionNotice
        message="Não foi possível validar sua sessão."
        onRetry={() => {
          setSessionStatus('syncing')
        }}
      />
    )
  }

  return <>{children}</>
}

function SessionNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
        <p className="text-lg font-medium">{message}</p>
        {onRetry ? (
          <button
            className="mt-5 rounded-full bg-teal-300 px-5 py-2 text-sm font-semibold text-slate-950"
            onClick={onRetry}
            type="button"
          >
            Tentar novamente
          </button>
        ) : null}
      </section>
    </main>
  )
}
