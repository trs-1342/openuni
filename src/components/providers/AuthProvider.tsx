'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { subscribeToAuthState, ensureUserProfile } from '@/lib/auth'

export function AuthProvider({ children }: any) {
  const { setUser, setInitialized } = useAuthStore()

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setUser(user)
      setInitialized()
      if (user?.emailVerified) {
        await ensureUserProfile(user)
      }
    })
    return () => unsubscribe()
  }, [setUser, setInitialized])

  return <>{children}</>
}
