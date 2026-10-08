import { LogOut } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { endSession } from '../../services/session-lifecycle'
import { useAuthStore } from '../../store/auth-store'

export function AppLayout() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-5 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link className="font-semibold tracking-tight text-white" to="/app">Ditado</Link>
            <nav className="flex items-center gap-3 text-sm text-slate-400" aria-label="Navegação da área interna">
              <NavLink className={({ isActive }) => isActive ? 'font-semibold text-teal-200' : 'hover:text-white'} end to="/app">Início</NavLink>
              <NavLink className={({ isActive }) => isActive ? 'font-semibold text-teal-200' : 'hover:text-white'} to="/app/history">Histórico</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-slate-400 sm:block">{user?.name}</p>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-teal-300 hover:text-teal-200"
              onClick={() => endSession()}
              type="button"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
