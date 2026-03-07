'use client'
import { useUserProfile } from '@/hooks/useUserProfile'
export function useAccess() {
  const { profile, isLoading } = useUserProfile()

  const canAccess = !isLoading &&
    profile !== null &&
    (
      profile?.role === 'admin' ||
      profile?.role === 'moderator' ||
      (profile as any)?.isAdminVerified === true
    )

  // DEBUG — sorunu bulduktan sonra kaldır
  console.log('[useAccess]', {
    isLoading,
    profile: profile ? {
      role: profile.role,
      isAdminVerified: (profile as any)?.isAdminVerified,
      email: profile.email,
    } : null,
    canAccess,
  })

  const isAdminOrMod = profile?.role === 'admin' || profile?.role === 'moderator'
  return { canAccess, isAdminOrMod, isLoading }
}
