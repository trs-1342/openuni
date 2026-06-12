'use client'

import { useEffect, useState, useCallback } from 'react'
import { subscribeToMyMemberships, joinSpace, leaveSpace } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'

// Kullanıcının katıldığı topluluk id'lerini canlı tutar + katıl/ayrıl aksiyonları.
export function useMemberships() {
  const { user } = useAuthStore()
  const { profile } = useUserProfile()
  const [joinedSpaceIds, setJoinedSpaceIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) { setIsLoading(false); return }
    const unsub = subscribeToMyMemberships(user.uid, (ids) => {
      setJoinedSpaceIds(ids)
      setIsLoading(false)
    })
    return () => unsub()
  }, [user?.uid])

  const isMember = useCallback((spaceId: string) => joinedSpaceIds.includes(spaceId), [joinedSpaceIds])

  const join = useCallback(async (spaceId: string) => {
    if (!user?.uid) return
    // Snapshot: topluluk sahibi gizli üyeyi de görebilsin diye ad/username eklenir
    await joinSpace(user.uid, spaceId, {
      displayName: profile?.displayName ?? user.displayName ?? undefined,
      username:    (profile as any)?.username,
      avatarUrl:   (profile as any)?.avatarUrl,
    })
  }, [user?.uid, user?.displayName, profile?.displayName, (profile as any)?.username, (profile as any)?.avatarUrl])

  const leave = useCallback(async (spaceId: string) => {
    if (!user?.uid) return
    await leaveSpace(user.uid, spaceId)
  }, [user?.uid])

  return { joinedSpaceIds, isMember, join, leave, isLoading }
}
