// src/components/layout/MobileNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bell, Bookmark, User, Users, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'

const ADMIN_EMAIL = 'khalil.khattab@ogr.gelisim.edu.tr'

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { profile } = useUserProfile()
  const isAdmin = user?.email === ADMIN_EMAIL || profile?.role === 'admin'

  const items = [
    { href: '/dashboard',         icon: Home,        label: 'Ana Sayfa' },
    { href: '/dashboard/spaces',  icon: Users,       label: 'Topluluklar' },
    { href: '/dashboard/notifications', icon: Bell,  label: 'Bildirimler' },
    { href: '/dashboard/bookmarks',    icon: Bookmark, label: 'Kaydedilenler' },
    { href: '/dashboard/settings',     icon: User,    label: 'Profil' },
  ]

  if (isAdmin) {
    items.push({ href: '/dashboard/admin', icon: ShieldAlert, label: 'Admin' })
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-surface-border" style={{paddingBottom: "env(safe-area-inset-bottom, 0px)"}}>
      <div className="flex items-center justify-around px-1 pt-1 pb-2">
        {items.map(item => {
          const Icon    = item.icon
          const active  = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all min-w-0 flex-1',
                active ? 'text-brand' : 'text-text-muted hover:text-text-secondary'
              )}>
              <Icon className={cn('w-5 h-5 transition-transform', active && 'scale-110')} />
              <span className={cn('text-2xs font-medium truncate', active ? 'text-brand' : 'text-text-muted')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
