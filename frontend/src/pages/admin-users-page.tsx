import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAdminUsers, getApiErrorMessage } from '../services/api'

export function AdminUsersPage() {
  const query = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers })

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">Administração</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Contas de usuários</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Consulte e gerencie outras contas da aplicação.</p>

      {query.isPending ? <p className="mt-8 text-slate-400">Carregando usuários...</p> : null}
      {query.isError ? <p className="error-message mt-8">{getApiErrorMessage(query.error)}</p> : null}
      {query.isSuccess && query.data.length === 0 ? <p className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Não há contas cadastradas.</p> : null}
      {query.data && query.data.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">
          <ul className="divide-y divide-slate-800">
            {query.data.map((user) => (
              <li key={user.id}>
                <Link className="flex flex-col gap-3 px-6 py-5 transition hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:px-8" to={`/app/admin/users/${user.id}`}>
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-white">{user.name}</p>
                    <p className="mt-1 break-words text-sm text-slate-400">{user.email}</p>
                  </div>
                  <span className="w-fit rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">{user.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  )
}
