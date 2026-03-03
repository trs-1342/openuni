'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, CHANNEL_META } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { MOCK_USER, MOCK_SPACES } from '@/lib/mock-data'
import {
  Bell, Settings, Hash, ChevronDown, ChevronRight,
  Search, Plus, Home, Bookmark, Users
} from 'lucide-react'
import { useState } from 'react'
import type { Space } from '@/types'

function SpaceSection({ space, isActive }: { space: Space; isActive: boolean }) {
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
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-text-muted" />
        ) : (
          <ChevronRight className="w-3 h-3 text-text-muted" />
        )}
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
                className={cn(
                  'sidebar-item pl-4 text-xs',
                  isChannelActive && 'active'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', {
                  'bg-accent-amber': channel.type === 'announcement',
                  'bg-accent-green': channel.type === 'academic',
                  'bg-accent-purple': channel.type === 'archive',
                  'bg-accent-red': channel.type === 'listing',
                  'bg-channel-suggestion': channel.type === 'suggestion',
                  'bg-brand': channel.type === 'social',
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

export function Sidebar() {
  const pathname = usePathname()

  const topItems = [
    { label: 'Ana Sayfa', href: '/dashboard', icon: Home },
    { label: 'Bildirimler', href: '/dashboard/notifications', icon: Bell, badge: 2 },
    { label: 'Kaydedilenler', href: '/dashboard/bookmarks', icon: Bookmark },
    { label: 'Topluluklar', href: '/dashboard/spaces', icon: Users },
  ]

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-background-secondary border-r border-surface-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-border">
        <div className="w-7 h-7 rounded bg-brand flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-sm">O</span>
        </div>
        <div>
          <div className="font-display font-semibold text-sm text-text-primary leading-none">OpenUni</div>
          <div className="text-2xs text-text-muted mt-0.5">IGÜ Platformu</div>
        </div>
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
        {/* Top Nav */}
        <div className="space-y-0.5">
          {topItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('sidebar-item', isActive && 'active')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-brand text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Spaces */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Toplulukların</span>
            <button className="text-text-muted hover:text-text-primary transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {MOCK_SPACES.map((space) => (
              <SpaceSection
                key={space.id}
                space={space}
                isActive={pathname.includes(space.slug)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-surface-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-surface cursor-pointer transition-colors group">
          <Avatar name={MOCK_USER.displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{MOCK_USER.displayName}</div>
            <div className="text-2xs text-text-muted truncate">{MOCK_USER.department}</div>
          </div>
          <Settings className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
        </div>
      </div>
    </aside>
  )
}
