import React from 'react'
// src/app/dashboard/layout.tsx
import { AuthGuard } from '@/components/providers/AuthGuard'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {children}
      <MobileNav />
    </AuthGuard>
  )
}
