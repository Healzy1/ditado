import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PublicUser } from '../types/auth'

export type SessionStatus = 'hydrating' | 'anonymous' | 'syncing' | 'ready' | 'error'

interface AuthState {
  user: PublicUser | null
  accessToken: string | null
  sessionStatus: SessionStatus
  setSession: (user: PublicUser, accessToken: string) => void
  setUser: (user: PublicUser) => void
  setSessionStatus: (status: SessionStatus) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      sessionStatus: 'hydrating',
      setSession: (user, accessToken) =>
        set({ user, accessToken, sessionStatus: 'ready' }),
      setUser: (user) => set({ user }),
      setSessionStatus: (sessionStatus) => set({ sessionStatus }),
      clearSession: () =>
        set({ user: null, accessToken: null, sessionStatus: 'anonymous' }),
    }),
    {
      name: 'ditado-session',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ user, accessToken }) => ({ user, accessToken }),
    },
  ),
)
