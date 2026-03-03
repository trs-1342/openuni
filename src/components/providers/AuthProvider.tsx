'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { subscribeToAuthState, ensureUserProfile } from '@/lib/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setInitialized } = useAuthStore()

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setUser(user)
      setInitialized()
      // Firestore profili yoksa oluştur (ilk giriş veya Firestore yazım hatası sonrası)
      if (user?.emailVerified) {
        await ensureUserProfile(user)
      }
    })
    return () => unsubscribe()
  }, [setUser, setInitialized])

  return <>{children}</>
}
