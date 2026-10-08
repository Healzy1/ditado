import { queryClient } from './query-client'
import { useAuthStore } from '../store/auth-store'

export function endSession(redirectToLogin = true) {
  useAuthStore.getState().clearSession()
  useAuthStore.persist.clearStorage()
  queryClient.clear()

  if (redirectToLogin) {
    window.location.assign('/login')
  }
}
