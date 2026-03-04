'use client'

import { useEffect, useState } from 'react'
import { subscribeToSpaces, subscribeToAllSpaces, getSpaceBySlug } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import type { Space } from '@/types'

const ADMIN_EMAIL = 'khalil.khattab@ogr.gelisim.edu.tr'

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuthStore()
  const { profile } = useUserProfile()

  const isAdminOrMod = user?.email === ADMIN_EMAIL ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator'

  useEffect(() => {
    // Admin/mod tüm toplulukları (özel dahil) görsün
    const subscribe = isAdminOrMod ? subscribeToAllSpaces : subscribeToSpaces
    const unsub = subscribe((data) => {
      setSpaces(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [isAdminOrMod])

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
