import axios, { type AxiosError } from 'axios'
import { endSession } from './session-lifecycle'
import { synchronizeSessionIdentity } from './session-sync'
import { useAuthStore } from '../store/auth-store'
import type { AdminUser, ChangePasswordInput, DeleteAccountInput, ForgotPasswordInput, ForgotPasswordResponse, LoginInput, LoginResponse, PublicConfig, PublicUser, RegisterInput, ResetPasswordInput, UpdateAdminUserInput, UpdateProfileInput } from '../types/auth'
import type { PublicTranscription } from '../types/transcription'

declare module 'axios' {
  interface AxiosRequestConfig {
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

interface ApiErrorBody {
  message?: string | string[]
}

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && error.config?.requiresAuth) {
      endSession()
    }

    if (error.response?.status === 403 && error.config?.requiresAdmin) {
      try {
        await synchronizeSessionIdentity(getCurrentUser)
      } catch {
        // The original administrative denial remains the public error.
      }
    }

    return Promise.reject(error)
  },
)

export async function getPublicConfig(): Promise<PublicConfig> {
  return (await api.get<PublicConfig>('/config/public')).data
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  return (await api.post<{ user: PublicUser }>('/auth/register', input)).data.user
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  return (await api.post<LoginResponse>('/auth/login', input)).data
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordResponse> {
  return (await api.post<ForgotPasswordResponse>('/auth/forgot-password', input)).data
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await api.post('/auth/reset-password', input)
}

export async function getCurrentUser(): Promise<PublicUser> {
  return (await api.get<PublicUser>('/users/me', {
    requiresAuth: true,
    timeout: 10_000,
  })).data
}

export async function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  return (await api.patch<PublicUser>('/users/me', input, { requiresAuth: true })).data
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.patch('/users/me/password', input, { requiresAuth: true })
}

export async function deleteAccount(input: DeleteAccountInput): Promise<void> {
  await api.delete('/users/me', { data: input, requiresAuth: true })
}

export async function createTranscription(input: FormData): Promise<PublicTranscription> {
  return (await api.post<PublicTranscription>('/transcriptions', input, { requiresAuth: true })).data
}

export async function getTranscriptions(): Promise<PublicTranscription[]> {
  return (await api.get<PublicTranscription[]>('/transcriptions', { requiresAuth: true })).data
}

export async function getTranscription(id: string): Promise<PublicTranscription> {
  return (await api.get<PublicTranscription>(`/transcriptions/${id}`, { requiresAuth: true })).data
}

export async function deleteTranscription(id: string): Promise<void> {
  await api.delete(`/transcriptions/${id}`, { requiresAuth: true })
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return (await api.get<AdminUser[]>('/users', { requiresAuth: true, requiresAdmin: true })).data
}

export async function getAdminUser(id: string): Promise<AdminUser> {
  return (await api.get<AdminUser>(`/users/${id}`, { requiresAuth: true, requiresAdmin: true })).data
}

export async function updateAdminUser(id: string, input: UpdateAdminUserInput): Promise<AdminUser> {
  return (await api.patch<AdminUser>(`/users/${id}`, input, { requiresAuth: true, requiresAdmin: true })).data
}

export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`, { requiresAuth: true, requiresAdmin: true })
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data.message
    if (Array.isArray(message)) {
      return message.join(' ')
    }
    if (typeof message === 'string') {
      return message
    }
  }
  return 'Não foi possível concluir a solicitação. Tente novamente.'
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
