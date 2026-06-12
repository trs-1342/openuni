'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateUserLastActive, getUserPrivateData } from '@/lib/firestore'
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
    // Hassas veri (email/studentId) ayrı private alt-dokümanda — kendi verimizi çekip birleştir
    let priv: { email?: string | null; studentId?: string | null } = {
      // e-posta her zaman auth oturumundan da gelir (private gecikse bile)
      email: firebaseUser.email ?? null,
    }
    getUserPrivateData(firebaseUser.uid).then(p => {
      priv = { email: p.email ?? firebaseUser.email ?? null, studentId: p.studentId ?? null }
      setProfile(prev => prev ? ({ ...prev, ...priv } as User) : prev)
    }).catch(() => {})

    // Realtime listener — kayıt/güncelleme anında yansır
    const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data()
          setProfile({
            ...d,
            ...priv, // email/studentId private'tan (ana dokümanda artık yok)
            uid: snap.id,
            joinedAt:     d.joinedAt?.toDate?.()     ?? new Date(),
            lastActiveAt: d.lastActiveAt?.toDate?.() ?? new Date(),
            banUntil:     d.banUntil?.toDate?.()     ?? null,
            muteUntil:    d.muteUntil?.toDate?.()    ?? null,
          } as User)
        }
        setIsLoading(false)
      },
      (err) => { console.error('[useUserProfile]', err.code, err.message); setIsLoading(false) }
    )
    updateUserLastActive(firebaseUser.uid).catch(() => {})
    return () => unsub()
  }, [firebaseUser?.uid])

  return { profile, isLoading }
}
