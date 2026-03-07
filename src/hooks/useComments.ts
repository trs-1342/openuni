'use client'

import { useEffect, useState } from 'react'
import { subscribeToComments, createComment } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import type { Comment } from '@/types'

export function useComments(postId: string) {
  const [comments, setComments]     = useState<Comment[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user: firebaseUser } = useAuthStore()
  const { profile }            = useUserProfile()

  const canAccess = !!(profile !== null &&
    (profile?.role === 'admin' || profile?.role === 'moderator' || (profile as any)?.isAdminVerified === true))

  useEffect(() => {
    if (!postId || !canAccess) {
      setIsLoading(false)
      return
    }
    const unsub = subscribeToComments(postId, data => {
      setComments(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [postId, canAccess])

  async function addComment(content: string, parentId?: string, replyToAuthor?: string) {
    if (!firebaseUser || !content.trim()) return
    setIsSubmitting(true)
    try {
      await createComment({
        postId,
        // undefined alanları Firestore'a gönderme
        ...(parentId     ? { parentId }     : {}),
        ...(replyToAuthor ? { replyToAuthor } : {}),
        author: {
          uid:         firebaseUser.uid,
          displayName: profile?.displayName ?? firebaseUser.displayName ?? 'Kullanıcı',
          username:    (profile as any)?.username ?? '',
          avatarUrl:   (profile as any)?.avatarUrl ?? null,
          role:        (profile as any)?.role ?? 'student',
        },
        content: content.trim(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return { comments, isLoading, isSubmitting, addComment }
}
