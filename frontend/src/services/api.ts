import axios, { type AxiosError } from 'axios'
import { endSession } from './session-lifecycle'
import { useAuthStore } from '../store/auth-store'
import type { LoginInput, LoginResponse, PublicConfig, PublicUser, RegisterInput } from '../types/auth'
import type { PublicTranscription } from '../types/transcription'

declare module 'axios' {
  interface AxiosRequestConfig {
    requiresAuth?: boolean
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
  (error: AxiosError) => {
    if (error.response?.status === 401 && error.config?.requiresAuth) {
      endSession()
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

export async function getCurrentUser(): Promise<PublicUser> {
  return (await api.get<PublicUser>('/users/me', {
    requiresAuth: true,
    timeout: 10_000,
  })).data
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
