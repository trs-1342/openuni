'use client'
import { useEffect, useState } from 'react'
import { subscribeToSpaces, getSpaceBySlug } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { useAccess } from '@/hooks/useAccess'
import type { Space } from '@/types'

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuthStore()
  const { canAccess } = useAccess()

  useEffect(() => {
    if (!user || !canAccess) {
      setIsLoading(false)
      return
    }
    // Tüm kullanıcılar aynı sorguyu kullanır — isPublic: true spaces
    // Özel spaces ayrı bir sayfada admin panelinden yönetilir
    const unsub = subscribeToSpaces((data) => {
      setSpaces(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [user, canAccess])

  return { spaces, isLoading, error }
}

export function useSpace(slug: string) {
  const [space, setSpace] = useState<Space | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    getSpaceBySlug(slug).then((s) => {
      setSpace(s)
      setIsLoading(false)
    })
  }, [slug])

  return { space, isLoading }
}
