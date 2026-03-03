// src/components/providers/AuthRedirect.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

/**
 * Auth sayfalarına (login, register) sar.
 * Oturum zaten açık ve doğrulanmışsa dashboard'a yönlendirir.
 */
export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized) return
    if (user?.emailVerified) router.replace('/dashboard')
  }, [user, isInitialized, router])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (user?.emailVerified) return null

  return <>{children}</>
}
