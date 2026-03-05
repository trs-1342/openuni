'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function useAuthGuard() {
  const { user } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])
}
