import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { deleteAdminUser, getAdminUser, getApiErrorMessage, getApiErrorStatus, updateAdminUser } from '../services/api'
import { queryClient } from '../services/query-client'
import { useAuthStore } from '../store/auth-store'
import type { AdminUser, UpdateAdminUserInput, UserRole } from '../types/auth'

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
})

export function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const [name, setName] = useState<string | undefined>()
  const [email, setEmail] = useState<string | undefined>()
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [roleToConfirm, setRoleToConfirm] = useState<UserRole | null>(null)
  const [confirmingDeletion, setConfirmingDeletion] = useState(false)
  const query = useQuery({
    queryKey: ['admin-users', id],
    queryFn: () => getAdminUser(id ?? ''),
    enabled: Boolean(id),
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateAdminUserInput) => updateAdminUser(id ?? '', input),
    onSuccess: async (user) => {
      updateAdminCaches(user)
      setName(user.name)
      setEmail(user.email)
      setFieldError(null)
      setProfileSuccess('Dados da conta atualizados.')
      setRoleToConfirm(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminUser(id ?? ''),
    onSuccess: async () => {
      queryClient.setQueryData<AdminUser[]>(['admin-users'], (users) => users?.filter((user) => user.id !== id))
      queryClient.removeQueries({ queryKey: ['admin-users', id], exact: true })
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      navigate('/app/admin', { replace: true })
    },
  })

  if (query.isPending) {
    return <PageNotice message="Carregando conta..." />
  }
  if (getApiErrorStatus(query.error) === 404) {
    return <PageNotice message="Conta não encontrada." />
  }
  if (query.isError) {
    return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-10"><p className="error-message">{getApiErrorMessage(query.error)}</p></main>
  }
  if (!query.data || !id) {
    return <PageNotice message="Conta não encontrada." />
  }

  const user = query.data
  const isOwnAccount = currentUser?.id === user.id

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileSuccess(null)
    const parsed = profileSchema.safeParse({ name: name ?? user.name, email: email ?? user.email })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Verifique os dados informados.')
      return
    }
    updateMutation.mutate(parsed.data)
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      <Link className="text-sm font-semibold text-teal-200 hover:text-teal-100" to="/app/admin">Voltar para usuários</Link>
      <section className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-900 p-7 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">Conta selecionada</p>
        <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white">{user.name}</h1>
        <dl className="mt-8 grid gap-5 text-sm sm:grid-cols-2">
          <Info label="E-mail" value={user.email} />
          <Info label="Role" value={user.role} />
          <Info label="Criada em" value={formatDate(user.createdAt)} />
          <Info label="Atualizada em" value={formatDate(user.updatedAt)} />
        </dl>
      </section>

      {isOwnAccount ? (
        <section className="mt-8 rounded-[2rem] border border-teal-400/30 bg-teal-300/10 p-7 sm:p-10">
          <h2 className="text-xl font-semibold text-teal-50">Esta é sua própria conta</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100">As operações administrativas destinam-se somente a outras contas. Use seu perfil para alterar seus dados, senha ou gerenciar sua conta.</p>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-200" to="/app/profile">Ir para meu perfil</Link>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900 p-7 sm:p-10">
            <h2 className="text-xl font-semibold text-white">Editar dados</h2>
            <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={submitProfile}>
              <Field label="Nome"><input className="input mt-2" onChange={(event) => setName(event.target.value)} value={name ?? user.name} /></Field>
              <Field label="E-mail"><input className="input mt-2" onChange={(event) => setEmail(event.target.value)} type="email" value={email ?? user.email} /></Field>
              <div className="sm:col-span-2">
                {fieldError ? <p className="error-message">{fieldError}</p> : null}
                {updateMutation.isError ? <p className="error-message">{getApiErrorMessage(updateMutation.error)}</p> : null}
                {profileSuccess ? <p className="mt-4 rounded-xl border border-teal-400/30 bg-teal-300/10 px-4 py-3 text-sm text-teal-100">{profileSuccess}</p> : null}
                <button className="primary-button mt-5" disabled={updateMutation.isPending} type="submit">{updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}</button>
              </div>
            </form>
          </section>

          <section className="mt-8 rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-7 sm:p-10">
            <h2 className="text-xl font-semibold text-amber-50">Alterar role</h2>
            <p className="mt-2 text-sm leading-6 text-amber-100">A mudança de privilégio só será enviada após confirmação explícita.</p>
            {roleToConfirm ? (
              <div className="mt-5 rounded-xl border border-amber-300/30 p-4 text-sm text-amber-50">
                <p>Confirmar alteração da role para <strong>{roleToConfirm}</strong>?</p>
                {updateMutation.isError ? <p className="error-message mt-4">{getApiErrorMessage(updateMutation.error)}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ role: roleToConfirm })} type="button">{updateMutation.isPending ? 'Alterando...' : 'Confirmar role'}</button>
                  <button className="rounded-xl px-4 py-2 font-semibold text-amber-100 hover:text-white" disabled={updateMutation.isPending} onClick={() => { setRoleToConfirm(null); updateMutation.reset() }} type="button">Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="mt-5 rounded-xl border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-200 hover:text-white" onClick={() => setRoleToConfirm(user.role === 'admin' ? 'user' : 'admin')} type="button">Alterar para {user.role === 'admin' ? 'user' : 'admin'}</button>
            )}
          </section>

          <section className="mt-8 rounded-[2rem] border border-rose-900/70 bg-rose-950/20 p-7 sm:p-10">
            <h2 className="text-xl font-semibold text-rose-100">Excluir conta</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-200/80">Esta ação é definitiva e remove os dados associados à conta.</p>
            {confirmingDeletion ? (
              <div className="mt-5 rounded-xl border border-rose-800/70 p-4 text-sm text-rose-100">
                <p>Confirmar exclusão definitiva desta conta?</p>
                {deleteMutation.isError ? <p className="error-message mt-4">{getApiErrorMessage(deleteMutation.error)}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} type="button">{deleteMutation.isPending ? 'Excluindo...' : 'Confirmar exclusão'}</button>
                  <button className="rounded-xl px-4 py-2 font-semibold text-rose-100 hover:text-white" disabled={deleteMutation.isPending} onClick={() => { setConfirmingDeletion(false); deleteMutation.reset() }} type="button">Cancelar</button>
                </div>
              </div>
            ) : <button className="mt-5 rounded-xl border border-rose-500/70 px-4 py-2 text-sm font-semibold text-rose-200 hover:border-rose-300 hover:text-white" onClick={() => setConfirmingDeletion(true)} type="button">Excluir conta</button>}
          </section>
        </>
      )}
    </main>
  )
}

function updateAdminCaches(user: AdminUser) {
  queryClient.setQueryData<AdminUser[]>(['admin-users'], (users) => users?.map((item) => item.id === user.id ? user : item))
  queryClient.setQueryData(['admin-users', user.id], user)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-100">{value}</dd></div>
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="block text-sm font-medium text-slate-300"><span>{label}</span>{children}</label>
}

function PageNotice({ message }: { message: string }) {
  return <main className="mx-auto max-w-5xl px-5 py-10 text-slate-300 sm:px-10"><p>{message}</p><Link className="mt-5 inline-block font-semibold text-teal-200 hover:text-teal-100" to="/app/admin">Voltar para usuários</Link></main>
}
