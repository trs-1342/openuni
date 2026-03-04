'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function AuthGuard({ children }: any) {
  const { user, isInitialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    // E-posta doğrulanmamışsa verify-email'e gönder
    if (!user.emailVerified) {
      router.replace('/auth/verify-email')
    }
  }, [user, isInitialized, router])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <p className="text-xs text-text-muted">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user || !user.emailVerified) return null
  return <>{children}</>
}
