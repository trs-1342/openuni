'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, CHANNEL_META } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { useSpaces } from '@/hooks/useSpaces'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { logoutUser } from '@/lib/auth'
import {
  Bell, Settings, ChevronDown, ChevronRight,
  Search, Plus, Home, Bookmark, Users, X, LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Space } from '@/types'

function SpaceSection({ space, isActive, onNavigate }: {
  space: Space; isActive: boolean; onNavigate?: () => void
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(isActive)

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all duration-150',
          'hover:bg-surface text-text-secondary hover:text-text-primary',
          isActive && 'text-text-primary'
        )}
      >
        <span className="text-base leading-none">{space.iconEmoji}</span>
        <span className="flex-1 text-left truncate text-xs uppercase tracking-wider font-semibold">
          {space.name}
        </span>
        {isOpen
          ? <ChevronDown className="w-3 h-3 text-text-muted" />
          : <ChevronRight className="w-3 h-3 text-text-muted" />
        }
      </button>

      {isOpen && (
        <div className="ml-2 mt-0.5 space-y-0.5">
          {space.channels.map((channel) => {
            const meta = CHANNEL_META[channel.type]
            const href = `/dashboard/spaces/${space.slug}/${channel.slug}`
            const isChannelActive = pathname === href

            return (
              <Link
                key={channel.id}
                href={href}
                onClick={onNavigate}
                className={cn('sidebar-item pl-4 text-xs', isChannelActive && 'active')}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', {
                  'bg-accent-amber':       channel.type === 'announcement',
                  'bg-accent-green':       channel.type === 'academic',
                  'bg-accent-purple':      channel.type === 'archive',
                  'bg-accent-red':         channel.type === 'listing',
                  'bg-channel-suggestion': channel.type === 'suggestion',
                  'bg-brand':              channel.type === 'social',
                })} />
                <span className="flex-1 truncate">{meta.icon} {channel.name}</span>
                {channel.postCount > 0 && (
                  <span className="text-2xs text-text-muted tabular-nums">{channel.postCount}</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { spaces, isLoading } = useSpaces()
  const { profile }           = useUserProfile()
  const { user: firebaseUser } = useAuthStore()
  const { unreadCount }       = useNotifications()

  const displayName = profile?.displayName ?? firebaseUser?.displayName ?? 'Kullanıcı'
  const department  = profile?.department ?? ''

  async function handleLogout() {
    await logoutUser()
    router.replace('/auth/login')
  }

  const topItems = [
    { label: 'Ana Sayfa',    href: '/dashboard',               icon: Home },
    { label: 'Bildirimler',  href: '/dashboard/notifications',  icon: Bell, badge: unreadCount },
    { label: 'Kaydedilenler',href: '/dashboard/bookmarks',      icon: Bookmark },
    { label: 'Topluluklar',  href: '/dashboard/spaces',         icon: Users },
  ]

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-background-secondary border-r border-surface-border">
      {/* Logo + Mobile Close */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-border">
        <div className="w-7 h-7 rounded bg-brand flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-sm">O</span>
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-sm text-text-primary leading-none">OpenUni</div>
          <div className="text-2xs text-text-muted mt-0.5">IGÜ Platformu</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-surface-border">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded bg-surface border border-surface-border text-text-muted text-xs hover:border-brand/40 hover:text-text-secondary transition-all">
          <Search className="w-3.5 h-3.5" />
          <span>Ara...</span>
          <kbd className="ml-auto text-2xs bg-background px-1.5 py-0.5 rounded border border-surface-border font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Top nav */}
        <div className="space-y-0.5">
          {topItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn('sidebar-item', isActive && 'active')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="bg-brand text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="divider" />

        {/* Spaces */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Toplulukların</span>
            <button className="text-text-muted hover:text-text-primary transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {isLoading ? (
            <div className="px-3 py-2 space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-7 bg-surface rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {spaces.map((space) => (
                <SpaceSection
                  key={space.id}
                  space={space}
                  isActive={pathname.includes(space.slug)}
                  onNavigate={onClose}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-surface-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-surface cursor-pointer transition-colors group">
          <Avatar name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{displayName}</div>
            <div className="text-2xs text-text-muted truncate">{department}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="text-text-muted hover:text-accent-red transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
