import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { getApiErrorMessage, getApiErrorStatus, getPublicConfig, resetPassword } from '../services/api'
import type { ResetPasswordInput } from '../types/auth'
import { AuthShell } from './login-page'

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .refine((value) => [...value].length >= 12, 'A senha deve ter ao menos 12 caracteres.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'A senha deve ter no máximo 72 bytes.'),
})

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const publicConfigQuery = useQuery({ queryKey: ['public-config'], queryFn: getPublicConfig })
  const { handleSubmit, register, setError, reset, formState: { errors, isSubmitting } } = useForm<Pick<ResetPasswordInput, 'newPassword'>>()
  const [requestError, setRequestError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  async function onSubmit(values: Pick<ResetPasswordInput, 'newPassword'>) {
    setRequestError(null)
    const parsed = resetPasswordSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'newPassword') {
          setError('newPassword', { message: issue.message })
        }
      }
      return
    }

    if (!token) {
      return
    }

    try {
      await resetPassword({ token, newPassword: parsed.data.newPassword })
      reset()
      setCompleted(true)
    } catch (error) {
      if (getApiErrorStatus(error) === 403) {
        setUnavailable(true)
        return
      }
      const message = getApiErrorMessage(error)
      setRequestError(message === 'Invalid or expired password reset token'
        ? 'O link de redefinição é inválido, expirou ou já foi utilizado.'
        : message)
    }
  }

  if (publicConfigQuery.isLoading) {
    return (
      <AuthShell eyebrow="Redefinir senha" title="Verificando a disponibilidade da recuperação.">
        <p className="mt-8 text-sm leading-6 text-slate-600">Aguarde um instante.</p>
      </AuthShell>
    )
  }

  if (publicConfigQuery.isError) {
    return (
      <AuthShell eyebrow="Redefinir senha" title="Não foi possível verificar a recuperação de senha.">
        <p className="mt-8 error-message">Tente novamente antes de redefinir a senha.</p>
        <button className="primary-button mt-6 w-full" type="button" onClick={() => void publicConfigQuery.refetch()}>Tentar novamente</button>
      </AuthShell>
    )
  }

  if (unavailable || !publicConfigQuery.data?.passwordResetEnabled) {
    return <UnavailableNotice />
  }

  if (!token) {
    return (
      <AuthShell eyebrow="Redefinir senha" title="O link de recuperação está incompleto.">
        <p className="mt-8 text-sm leading-6 text-slate-600">Solicite um novo link para redefinir sua senha.</p>
        <Link className="primary-button mt-6 w-full" to="/forgot-password">Solicitar novo link</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow="Redefinir senha" title="Escolha uma nova senha para sua conta.">
      {completed ? (
        <div className="mt-8 rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-900">
          <p>Sua senha foi redefinida. Entre com a nova senha para continuar.</p>
          <Link className="mt-3 inline-block font-semibold text-teal-800 underline" to="/login">Ir para o login</Link>
        </div>
      ) : (
        <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">
            <span>Nova senha</span>
            <div className="mt-2.5"><input autoComplete="new-password" className="input" type="password" {...register('newPassword')} /></div>
            {errors.newPassword?.message ? <p className="mt-2 text-sm leading-6 text-rose-600">{errors.newPassword.message}</p> : null}
          </label>
          <p className="text-xs leading-5 text-slate-500">Use pelo menos 12 caracteres e no máximo 72 bytes.</p>
          {requestError ? <p className="error-message">{requestError}</p> : null}
          <button className="primary-button w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}</button>
        </form>
      )}
    </AuthShell>
  )
}

function UnavailableNotice() {
  return (
    <AuthShell eyebrow="Redefinir senha" title="A recuperação de senha não está disponível neste ambiente.">
      <p className="mt-8 text-sm leading-6 text-slate-600">Esse link não pode ser usado enquanto a recuperação estiver indisponível.</p>
      <Link className="primary-button mt-6 w-full" to="/login">Voltar para o login</Link>
    </AuthShell>
  )
}
