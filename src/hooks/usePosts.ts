'use client'

import { useEffect, useState } from 'react'
import { subscribeToPosts, getRecentPostsForUser } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import type { Post } from '@/types'

export function usePosts(channelId: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuthStore()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const canAccess = !profileLoading && profile !== null &&
    (profile?.role === 'admin' || profile?.role === 'moderator' || (profile as any)?.isAdminVerified === true)

  useEffect(() => {
    if (!channelId || !user || !canAccess) {
      setIsLoading(false)
      return
    }
    const unsub = subscribeToPosts(channelId, (data) => {
      setPosts(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [channelId, user, canAccess])

  return { posts, isLoading }
}

export function useRecentPosts(spaceIds: string[]) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuthStore()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const canAccess = !profileLoading && profile !== null &&
    (profile?.role === 'admin' || profile?.role === 'moderator' || (profile as any)?.isAdminVerified === true)

  useEffect(() => {
    if (!canAccess || spaceIds.length === 0) {
      setIsLoading(false)
      return
    }
    getRecentPostsForUser(spaceIds).then((data) => {
      setPosts(data)
      setIsLoading(false)
    })
  }, [spaceIds.join(','), canAccess])

  return { posts, isLoading }
}
