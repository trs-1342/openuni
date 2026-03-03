'use client'

import { useEffect, useState } from 'react'
import { subscribeToSpaces, getSpaceBySlug } from '@/lib/firestore'
import type { Space } from '@/types'

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToSpaces((data) => {
      setSpaces(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [])

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
