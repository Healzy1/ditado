import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { endSession } from '../../services/session-lifecycle'
import { useAuthStore } from '../../store/auth-store'

export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-5 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between sm:hidden">
            <Link className="font-semibold tracking-tight text-white" to="/app">Ditado</Link>
            <button
              aria-controls="mobile-navigation"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:border-teal-300 hover:text-teal-200"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          <nav className={`mt-4 flex flex-col gap-1 border-t border-slate-800 pt-4 text-sm text-slate-300 sm:hidden ${mobileMenuOpen ? '' : 'hidden'}`} id="mobile-navigation" aria-label="Navegação da área interna">
            <NavLink className={({ isActive }) => mobileLinkClass(isActive)} end onClick={() => setMobileMenuOpen(false)} to="/app">Início</NavLink>
            <NavLink className={({ isActive }) => mobileLinkClass(isActive)} onClick={() => setMobileMenuOpen(false)} to="/app/history">Histórico</NavLink>
            <NavLink className={({ isActive }) => mobileLinkClass(isActive)} onClick={() => setMobileMenuOpen(false)} to="/app/profile">Perfil</NavLink>
            {user?.role === 'admin' ? <NavLink className={({ isActive }) => mobileLinkClass(isActive)} onClick={() => setMobileMenuOpen(false)} to="/app/admin">Administração</NavLink> : null}
            <button className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white" onClick={() => endSession()} type="button"><LogOut size={16} />Sair</button>
          </nav>
          <div className="hidden items-center justify-between gap-4 sm:flex">
            <div className="flex min-w-0 items-center gap-5">
              <Link className="w-fit font-semibold tracking-tight text-white" to="/app">Ditado</Link>
              <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-400" aria-label="Navegação da área interna">
                <NavLink className={({ isActive }) => isActive ? 'font-semibold text-teal-200' : 'hover:text-white'} end to="/app">Início</NavLink>
                <NavLink className={({ isActive }) => isActive ? 'font-semibold text-teal-200' : 'hover:text-white'} to="/app/history">Histórico</NavLink>
                <NavLink className={({ isActive }) => isActive ? 'font-semibold text-teal-200' : 'hover:text-white'} to="/app/profile">Perfil</NavLink>
                {user?.role === 'admin' ? <NavLink className={({ isActive }) => isActive ? 'font-semibold text-teal-200' : 'hover:text-white'} to="/app/admin">Administração</NavLink> : null}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-400">{user?.name}</p>
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
        </div>
      </header>
      <Outlet />
    </div>
  )
}

function mobileLinkClass(isActive: boolean) {
  return isActive
    ? 'min-h-11 rounded-xl bg-teal-300/10 px-3 py-2 font-semibold text-teal-200'
    : 'min-h-11 rounded-xl px-3 py-2 font-medium hover:bg-slate-800 hover:text-white'
}
