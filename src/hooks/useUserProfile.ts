'use client'

import { useEffect, useState } from 'react'
import { getUserProfile, updateUserLastActive } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export function useUserProfile() {
  const { user: firebaseUser } = useAuthStore()
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setIsLoading(false)
      return
    }
    getUserProfile(firebaseUser.uid).then((p) => {
      setProfile(p)
      setIsLoading(false)
      // Son aktif güncelle
      updateUserLastActive(firebaseUser.uid).catch(() => {})
    })
  }, [firebaseUser?.uid])

  return { profile, isLoading }
}
