import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { getApiErrorMessage, getPublicConfig, login } from '../services/api'
import { useAuthStore } from '../store/auth-store'
import type { LoginInput } from '../types/auth'

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const sessionStatus = useAuthStore((state) => state.sessionStatus)
  const setSession = useAuthStore((state) => state.setSession)
  const publicConfigQuery = useQuery({ queryKey: ['public-config'], queryFn: getPublicConfig })
  const { handleSubmit, register, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>()
  const [requestError, setRequestError] = useState<string | null>(null)

  if (sessionStatus === 'hydrating') {
    return <PageNotice message="Restaurando sessão..." />
  }
  if (accessToken) {
    return <Navigate to="/app" replace />
  }

  async function onSubmit(values: LoginInput) {
    setRequestError(null)
    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      applyIssues(parsed.error.issues, setError)
      return
    }

    try {
      const session = await login(parsed.data)
      setSession(session.user, session.accessToken)
      navigate('/app', { replace: true })
    } catch (error) {
      setRequestError(getApiErrorMessage(error))
    }
  }

  return (
    <AuthShell eyebrow="Bem-vindo de volta" title="Entre para continuar seus registros.">
      <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Field label="E-mail" error={errors.email?.message}>
          <input autoComplete="email" className="input" type="email" {...register('email')} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <input autoComplete="current-password" className="input" type="password" {...register('password')} />
        </Field>
        {requestError ? <p className="error-message">{requestError}</p> : null}
        <button className="primary-button w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="mt-8 text-sm text-slate-500">
        Ainda não tem conta? <Link className="font-semibold text-teal-700 hover:text-teal-600" to="/register">Cadastre-se</Link>
      </p>
      {publicConfigQuery.data?.passwordResetEnabled ? (
        <p className="mt-4 text-sm text-slate-500">
          <Link className="font-semibold text-teal-700 hover:text-teal-600" to="/forgot-password">Esqueci minha senha</Link>
        </p>
      ) : null}
    </AuthShell>
  )
}

function applyIssues(issues: z.core.$ZodIssue[], setError: ReturnType<typeof useForm<LoginInput>>['setError']) {
  for (const issue of issues) {
    const field = issue.path[0]
    if (field === 'email' || field === 'password') {
      setError(field, { message: issue.message })
    }
  }
}

export function AuthShell({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <main className="grid min-h-screen bg-slate-100 px-4 py-6 sm:px-8 sm:py-10 lg:place-items-center">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-300/30 sm:p-10 lg:p-12">
        <Link className="text-sm font-semibold tracking-tight text-slate-900" to="/">Ditado</Link>
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.25em] text-teal-700">{eyebrow}</p>
        <h1 className="mt-4 max-w-lg text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {children}
      </section>
    </main>
  )
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return <label className="block text-sm font-medium text-slate-700"><span>{label}</span><div className="mt-2.5">{children}</div>{error ? <p className="mt-2 text-sm leading-6 text-rose-600">{error}</p> : null}</label>
}

function PageNotice({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center bg-slate-100 px-6 text-slate-700"><p>{message}</p></main>
}
