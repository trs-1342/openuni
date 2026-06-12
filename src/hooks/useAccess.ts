'use client'
import { useUserProfile } from '@/hooks/useUserProfile'
import { isOwner, hasCapability } from '@/lib/permissions'

export function useAccess() {
  const { profile, isLoading } = useUserProfile()

  // Owner ve global moderasyon yetkisi olanlar her zaman erişir (capability modeli)
  const owner = isOwner(profile)
  const isAdminOrMod = owner ||
    hasCapability(profile, 'moderateGlobal') ||
    hasCapability(profile, 'manageUsers') ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator'

  const canAccess = !isLoading &&
    profile !== null &&
    (
      isAdminOrMod ||
      (profile as any)?.isAdminVerified === true
    )

  return { canAccess, isAdminOrMod, isLoading }
}
