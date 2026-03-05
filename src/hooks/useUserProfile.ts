'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateUserLastActive } from '@/lib/firestore'
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
    // Realtime listener — kayıt/güncelleme anında yansır
    const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setProfile({
          ...d,
          uid: snap.id,
          joinedAt:     d.joinedAt?.toDate?.()     ?? new Date(),
          lastActiveAt: d.lastActiveAt?.toDate?.() ?? new Date(),
          banUntil:     d.banUntil?.toDate?.()     ?? null,
          muteUntil:    d.muteUntil?.toDate?.()    ?? null,
        } as User)
      }
      setIsLoading(false)
    })
    updateUserLastActive(firebaseUser.uid).catch(() => {})
    return () => unsub()
  }, [firebaseUser?.uid])

  return { profile, isLoading }
}
