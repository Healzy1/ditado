import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { changePassword, deleteAccount, getApiErrorMessage, updateProfile } from '../services/api'
import { queryClient } from '../services/query-client'
import { endSession } from '../services/session-lifecycle'
import { useAuthStore } from '../store/auth-store'
import type { ChangePasswordInput, DeleteAccountInput, UpdateProfileInput } from '../types/auth'

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual.'),
  newPassword: z.string()
    .refine((value) => [...value].length >= 12, 'A nova senha deve ter ao menos 12 caracteres.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'A nova senha deve ter no máximo 72 bytes.'),
})

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Informe sua senha atual.'),
})

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [confirmingDeletion, setConfirmingDeletion] = useState(false)
  const profileForm = useForm<UpdateProfileInput>({
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })
  const passwordForm = useForm<ChangePasswordInput>()
  const deleteAccountForm = useForm<DeleteAccountInput>()

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.setQueryData(['session', 'current-user'], updatedUser)
      profileForm.reset({ name: updatedUser.name, email: updatedUser.email })
      setProfileSuccess('Dados do perfil atualizados.')
    },
  })
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      passwordForm.reset()
      setPasswordSuccess('Senha alterada com sucesso.')
    },
  })
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      endSession(false)
      navigate('/', { replace: true })
    },
  })

  function submitProfile(values: UpdateProfileInput) {
    setProfileSuccess(null)
    const parsed = profileSchema.safeParse(values)
    if (!parsed.success) {
      applyIssues(parsed.error.issues, profileForm.setError, ['name', 'email'])
      return
    }
    updateProfileMutation.mutate(parsed.data)
  }

  function submitPassword(values: ChangePasswordInput) {
    setPasswordSuccess(null)
    const parsed = passwordSchema.safeParse(values)
    if (!parsed.success) {
      applyIssues(parsed.error.issues, passwordForm.setError, ['currentPassword', 'newPassword'])
      return
    }
    changePasswordMutation.mutate(parsed.data)
  }

  function submitDeleteAccount(values: DeleteAccountInput) {
    const parsed = deleteAccountSchema.safeParse(values)
    if (!parsed.success) {
      applyIssues(parsed.error.issues, deleteAccountForm.setError, ['password'])
      return
    }
    deleteAccountMutation.mutate(parsed.data)
  }

  if (!user) {
    return <main className="mx-auto max-w-5xl px-5 py-10 text-slate-300 sm:px-10">Não foi possível carregar seu perfil.</main>
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">Sua conta</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Perfil e segurança</h1>

      <section className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900 p-7 sm:p-10">
        <h2 className="text-xl font-semibold text-white">Dados atuais</h2>
        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Nome</dt><dd className="mt-1 break-words text-slate-100">{user.name}</dd></div>
          <div><dt className="text-slate-500">E-mail</dt><dd className="mt-1 break-words text-slate-100">{user.email}</dd></div>
          <div><dt className="text-slate-500">Role</dt><dd className="mt-1 text-slate-100">{user.role}</dd></div>
        </dl>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900 p-7 sm:p-10">
        <h2 className="text-xl font-semibold text-white">Editar perfil</h2>
        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={profileForm.handleSubmit(submitProfile)}>
          <Field error={profileForm.formState.errors.name?.message} label="Nome"><input autoComplete="name" className="input mt-2" {...profileForm.register('name')} /></Field>
          <Field error={profileForm.formState.errors.email?.message} label="E-mail"><input autoComplete="email" className="input mt-2" type="email" {...profileForm.register('email')} /></Field>
          <div className="sm:col-span-2">
            {updateProfileMutation.isError ? <p className="error-message">{getApiErrorMessage(updateProfileMutation.error)}</p> : null}
            {profileSuccess ? <p className="mt-4 rounded-xl border border-teal-400/30 bg-teal-300/10 px-4 py-3 text-sm text-teal-100">{profileSuccess}</p> : null}
            <button className="primary-button mt-5" disabled={updateProfileMutation.isPending} type="submit">{updateProfileMutation.isPending ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900 p-7 sm:p-10">
        <h2 className="text-xl font-semibold text-white">Alterar senha</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">A nova senha deve ter ao menos 12 caracteres e no máximo 72 bytes.</p>
        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={passwordForm.handleSubmit(submitPassword)}>
          <Field error={passwordForm.formState.errors.currentPassword?.message} label="Senha atual"><input autoComplete="current-password" className="input mt-2" type="password" {...passwordForm.register('currentPassword')} /></Field>
          <Field error={passwordForm.formState.errors.newPassword?.message} label="Nova senha"><input autoComplete="new-password" className="input mt-2" type="password" {...passwordForm.register('newPassword')} /></Field>
          <div className="sm:col-span-2">
            {changePasswordMutation.isError ? <p className="error-message">{getApiErrorMessage(changePasswordMutation.error)}</p> : null}
            {passwordSuccess ? <p className="mt-4 rounded-xl border border-teal-400/30 bg-teal-300/10 px-4 py-3 text-sm text-teal-100">{passwordSuccess}</p> : null}
            <button className="primary-button mt-5" disabled={changePasswordMutation.isPending} type="submit">{changePasswordMutation.isPending ? 'Alterando...' : 'Alterar senha'}</button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-[2rem] border border-rose-900/70 bg-rose-950/20 p-7 sm:p-10">
        <h2 className="text-xl font-semibold text-rose-100">Excluir conta</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-200/80">Esta ação é definitiva e remove suas transcrições. Confirme somente se desejar excluir sua conta.</p>
        {confirmingDeletion ? (
          <form className="mt-6 max-w-md" onSubmit={deleteAccountForm.handleSubmit(submitDeleteAccount)}>
            <Field error={deleteAccountForm.formState.errors.password?.message} label="Senha atual"><input autoComplete="current-password" className="input mt-2" type="password" {...deleteAccountForm.register('password')} /></Field>
            {deleteAccountMutation.isError ? <p className="error-message mt-5">{getApiErrorMessage(deleteAccountMutation.error)}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="inline-flex min-h-12 items-center justify-center rounded-xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-600/60" disabled={deleteAccountMutation.isPending} type="submit">{deleteAccountMutation.isPending ? 'Excluindo...' : 'Confirmar exclusão definitiva'}</button>
              <button className="min-h-12 rounded-xl px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white" disabled={deleteAccountMutation.isPending} onClick={() => { setConfirmingDeletion(false); deleteAccountForm.reset(); deleteAccountMutation.reset() }} type="button">Cancelar</button>
            </div>
          </form>
        ) : <button className="mt-6 min-h-12 rounded-xl border border-rose-500/70 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-300 hover:text-white" onClick={() => setConfirmingDeletion(true)} type="button">Excluir minha conta</button>}
      </section>
    </main>
  )
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return <label className="block text-sm font-medium text-slate-300"><span>{label}</span>{children}{error ? <p className="mt-2 text-sm leading-6 text-rose-300">{error}</p> : null}</label>
}

function applyIssues<T extends FieldValues>(issues: z.core.$ZodIssue[], setError: UseFormSetError<T>, fields: Path<T>[]) {
  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && fields.includes(field as Path<T>)) {
      setError(field as Path<T>, { message: issue.message })
    }
  }
}
