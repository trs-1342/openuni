'use client'

import { useEffect, useState } from 'react'
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import type { Notification } from '@/types'

export function useNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data)
      setIsLoading(false)
    })
    return () => unsub()
  }, [user?.uid])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function markRead(id: string) {
    await markNotificationRead(id)
  }

  async function markAllRead() {
    if (!user?.uid) return
    await markAllNotificationsRead(user.uid)
  }

  return { notifications, unreadCount, isLoading, markRead, markAllRead }
}
