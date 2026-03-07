'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'

export function AuthGuard({ children }: any) {
  const { user, isInitialized } = useAuthStore()
  const { profile, isLoading: profileLoading } = useUserProfile()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized) return
    if (!user) { router.replace('/auth/login'); return }
    if (!user.emailVerified) { router.replace('/auth/verify-email'); return }
  }, [user, isInitialized, router])

  // Auth henüz başlatılmadı
  if (!isInitialized) return <Spinner />

  // Giriş yok veya email doğrulanmamış
  if (!user || !user.emailVerified) return null

  // Profile yüklenene kadar bekle — erken render permission-denied tetikler
  if (profileLoading || profile === null) return <Spinner />

  const isAdminVerified = (profile as any)?.isAdminVerified
  const isMod = profile?.role === 'admin' || profile?.role === 'moderator'

  // Admin/mod her zaman geçer, normal kullanıcı onay bekliyor
  if (!isMod && isAdminVerified === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center mx-auto text-2xl">⏳</div>
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Hesabın İnceleniyor</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Hesabın admin tarafından inceleniyor. Onaylandıktan sonra platforma erişebilirsin.
            </p>
          </div>
          <div className="bg-surface border border-surface-border rounded-xl p-3 text-left space-y-1.5">
            <p className="text-2xs text-text-muted">Giriş yapılan hesap:</p>
            <p className="text-xs font-medium text-text-primary">{user.email}</p>
          </div>
          <button
            onClick={async () => {
              const { logoutUser } = await import('@/lib/auth')
              await logoutUser()
              router.replace('/auth/login')
            }}
            className="text-xs text-text-muted hover:text-accent-red transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Yükleniyor...</p>
      </div>
    </div>
  )
}
