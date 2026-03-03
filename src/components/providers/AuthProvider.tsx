'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { subscribeToAuthState } from '@/lib/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setInitialized } = useAuthStore()

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setUser(user)
      setInitialized()
    })
    return () => unsubscribe()
  }, [setUser, setInitialized])

  return <>{children}</>
}
