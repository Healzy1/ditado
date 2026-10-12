import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { forgotPassword, getApiErrorMessage, getApiErrorStatus, getPublicConfig } from '../services/api'
import type { ForgotPasswordInput } from '../types/auth'
import { AuthShell } from './login-page'

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
})

export function ForgotPasswordPage() {
  const publicConfigQuery = useQuery({ queryKey: ['public-config'], queryFn: getPublicConfig })
  const { handleSubmit, register, setError, reset, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>()
  const [requestError, setRequestError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  async function onSubmit(values: ForgotPasswordInput) {
    setRequestError(null)
    const parsed = forgotPasswordSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'email') {
          setError('email', { message: issue.message })
        }
      }
      return
    }

    try {
      const response = await forgotPassword(parsed.data)
      setSuccessMessage(response.message)
      reset()
    } catch (error) {
      if (getApiErrorStatus(error) === 403) {
        setUnavailable(true)
        return
      }
      setRequestError(getApiErrorMessage(error))
    }
  }

  if (publicConfigQuery.isLoading) {
    return (
      <AuthShell eyebrow="Recuperar acesso" title="Verificando a disponibilidade da recuperação.">
        <p className="mt-8 text-sm leading-6 text-slate-600">Aguarde um instante.</p>
      </AuthShell>
    )
  }

  if (publicConfigQuery.isError) {
    return (
      <AuthShell eyebrow="Recuperar acesso" title="Não foi possível verificar a recuperação de senha.">
        <p className="mt-8 error-message">Tente novamente antes de solicitar a redefinição.</p>
        <button className="primary-button mt-6 w-full" type="button" onClick={() => void publicConfigQuery.refetch()}>Tentar novamente</button>
      </AuthShell>
    )
  }

  if (unavailable || !publicConfigQuery.data?.passwordResetEnabled) {
    return <UnavailableNotice />
  }

  return (
    <AuthShell eyebrow="Recuperar acesso" title="Receba instruções para redefinir sua senha.">
      {successMessage ? (
        <div className="mt-8 rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-900">
          <p>{successMessage}</p>
          <Link className="mt-3 inline-block font-semibold text-teal-800 underline" to="/login">Voltar para o login</Link>
        </div>
      ) : (
        <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">
            <span>E-mail</span>
            <div className="mt-2.5"><input autoComplete="email" className="input" type="email" {...register('email')} /></div>
            {errors.email?.message ? <p className="mt-2 text-sm leading-6 text-rose-600">{errors.email.message}</p> : null}
          </label>
          {requestError ? <p className="error-message">{requestError}</p> : null}
          <button className="primary-button w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Enviando...' : 'Enviar instruções'}</button>
        </form>
      )}
      <p className="mt-8 text-sm text-slate-500">Lembrou sua senha? <Link className="font-semibold text-teal-700 hover:text-teal-600" to="/login">Entrar</Link></p>
    </AuthShell>
  )
}

function UnavailableNotice() {
  return (
    <AuthShell eyebrow="Recuperar acesso" title="A recuperação de senha não está disponível neste ambiente.">
      <p className="mt-8 text-sm leading-6 text-slate-600">Entre em contato com a administração caso precise de ajuda para acessar sua conta.</p>
      <Link className="primary-button mt-6 w-full" to="/login">Voltar para o login</Link>
    </AuthShell>
  )
}
