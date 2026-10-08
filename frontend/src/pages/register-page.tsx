import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { getApiErrorMessage, register as registerUser } from '../services/api'
import { useAuthStore } from '../store/auth-store'
import type { RegisterInput } from '../types/auth'
import { AuthShell } from './login-page'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(12, 'A senha deve ter ao menos 12 caracteres.').refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'A senha deve ter no máximo 72 bytes.',
  ),
})

export function RegisterPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const sessionStatus = useAuthStore((state) => state.sessionStatus)
  const { handleSubmit, register, setError, reset, formState: { errors, isSubmitting } } = useForm<RegisterInput>()
  const [requestError, setRequestError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  if (sessionStatus === 'hydrating') {
    return <main className="grid min-h-screen place-items-center bg-slate-100 px-6 text-slate-700"><p>Restaurando sessão...</p></main>
  }
  if (accessToken) {
    return <Navigate to="/app" replace />
  }

  async function onSubmit(values: RegisterInput) {
    setRequestError(null)
    const parsed = registerSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'name' || field === 'email' || field === 'password') {
          setError(field, { message: issue.message })
        }
      }
      return
    }

    try {
      const user = await registerUser(parsed.data)
      setRegisteredEmail(user.email)
      reset()
    } catch (error) {
      setRequestError(getApiErrorMessage(error))
    }
  }

  return (
    <AuthShell eyebrow="Criar conta" title="Comece a organizar seus áudios.">
      {registeredEmail ? (
        <div className="mt-10 rounded-2xl border border-teal-100 bg-teal-50 p-6 text-sm leading-6 text-teal-900">
          <p>Conta criada para {registeredEmail}.</p>
          <Link className="mt-3 inline-block font-semibold text-teal-800 underline" to="/login">Prosseguir para o login</Link>
        </div>
      ) : (
        <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Nome" error={errors.name?.message}><input autoComplete="name" className="input" {...register('name')} /></Field>
          <Field label="E-mail" error={errors.email?.message}><input autoComplete="email" className="input" type="email" {...register('email')} /></Field>
          <Field label="Senha" error={errors.password?.message}><input autoComplete="new-password" className="input" type="password" {...register('password')} /></Field>
          <p className="text-xs leading-5 text-slate-500">Use pelo menos 12 caracteres e no máximo 72 bytes.</p>
          {requestError ? <p className="error-message">{requestError}</p> : null}
          <button className="primary-button w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Criando conta...' : 'Criar conta'}</button>
        </form>
      )}
      <p className="mt-8 text-sm text-slate-500">Já possui conta? <Link className="font-semibold text-teal-700 hover:text-teal-600" to="/login">Entrar</Link></p>
    </AuthShell>
  )
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return <label className="block text-sm font-medium text-slate-700"><span>{label}</span><div className="mt-2.5">{children}</div>{error ? <p className="mt-2 text-sm leading-6 text-rose-600">{error}</p> : null}</label>
}
