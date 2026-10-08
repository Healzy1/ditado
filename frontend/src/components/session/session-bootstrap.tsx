import { useEffect, useRef, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../../services/api'
import { useAuthStore } from '../../store/auth-store'

interface SessionBootstrapProps {
  children: ReactNode
}

export function SessionBootstrap({ children }: SessionBootstrapProps) {
  const rehydrated = useRef(false)
  const accessToken = useAuthStore((state) => state.accessToken)
  const sessionStatus = useAuthStore((state) => state.sessionStatus)
  const setSessionStatus = useAuthStore((state) => state.setSessionStatus)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    if (rehydrated.current) {
      return
    }
    rehydrated.current = true
    void Promise.resolve(useAuthStore.persist.rehydrate()).then(() => {
      const token = useAuthStore.getState().accessToken
      useAuthStore.getState().setSessionStatus(token ? 'syncing' : 'anonymous')
    })
  }, [])

  const currentUserQuery = useQuery({
    queryKey: ['session', 'current-user'],
    queryFn: getCurrentUser,
    enabled: sessionStatus === 'syncing' && Boolean(accessToken),
    retry: false,
  })

  useEffect(() => {
    if (currentUserQuery.isSuccess) {
      setUser(currentUserQuery.data)
      setSessionStatus('ready')
    }
  }, [currentUserQuery.data, currentUserQuery.isSuccess, setSessionStatus, setUser])

  useEffect(() => {
    if (currentUserQuery.isError && useAuthStore.getState().accessToken) {
      setSessionStatus('error')
    }
  }, [currentUserQuery.isError, setSessionStatus])

  return <>{children}</>
}
