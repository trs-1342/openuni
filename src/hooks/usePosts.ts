'use client'

import { useEffect, useState } from 'react'
import { subscribeToPosts, getRecentPostsForUser, getPosts } from '@/lib/firestore'
import type { Post } from '@/types'

export function usePosts(channelId: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!channelId) return
    const unsub = subscribeToPosts(channelId, (data) => {
      setPosts(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [channelId])

  return { posts, isLoading }
}

export function useRecentPosts(spaceIds: string[]) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (spaceIds.length === 0) {
      setIsLoading(false)
      return
    }
    getRecentPostsForUser(spaceIds).then((data) => {
      setPosts(data)
      setIsLoading(false)
    })
  }, [spaceIds.join(',')])

  return { posts, isLoading }
}
