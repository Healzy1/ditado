import { queryClient } from './query-client'
import { useAuthStore } from '../store/auth-store'
import type { PublicUser } from '../types/auth'

let pendingIdentitySync: Promise<PublicUser> | null = null

export function synchronizeSessionIdentity(fetchCurrentUser: () => Promise<PublicUser>): Promise<PublicUser> {
  if (!pendingIdentitySync) {
    pendingIdentitySync = fetchCurrentUser()
      .then((user) => {
        const previousUser = useAuthStore.getState().user
        useAuthStore.getState().setUser(user)
        queryClient.setQueryData(['session', 'current-user'], user)

        if (previousUser?.role === 'admin' && user.role !== 'admin') {
          queryClient.removeQueries({ queryKey: ['admin-users'] })
        }

        return user
      })
      .finally(() => {
        pendingIdentitySync = null
      })
  }

  return pendingIdentitySync
}
