'use client'
import React from 'react'

import { Sidebar } from '@/components/layout/Sidebar'
import { PostCard } from '@/components/posts/PostCard'
import { Avatar } from '@/components/ui/Avatar'
import { useSpaces } from '@/hooks/useSpaces'
import { useRecentPosts } from '@/hooks/usePosts'
import { useNotifications } from '@/hooks/useNotifications'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthStore } from '@/store/authStore'
import { timeAgo, CHANNEL_META } from '@/lib/utils'
import {
  Bell, TrendingUp, Flame, BookOpen, Users,
  ChevronRight, Menu,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

function Skeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-surface animate-pulse rounded ${className ?? ""}`} />
}

function StatCard({ label, value, icon: Icon, color, isLoading }: {
  label: string; value: string | number; icon: any; color: string; isLoading?: boolean
}) {
  return (
    <div className="card flex items-center gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        {isLoading
          ? <Skeleton className="h-5 w-10 mb-1" />
          : <div className="text-lg font-display font-semibold text-text-primary leading-none">{value}</div>
        }
        <div className="text-2xs text-text-muted mt-0.5 truncate">{label}</div>
      </div>
    </div>
  )
}

function SpaceCard({ space }: { space: any }) {
  return (
    <Link href={`/dashboard/spaces/${space.slug}`}>
      <div className="card hover:bg-surface-hover hover:border-surface-active transition-all cursor-pointer h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl shrink-0">{space.iconEmoji}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">{space.name}</h3>
            <p className="text-2xs text-text-muted">{space.memberCount} üye</p>
          </div>
        </div>
        <p className="text-xs text-text-muted line-clamp-2 mb-3">{space.description}</p>
        <div className="flex flex-wrap gap-1">
          {space.channels.slice(0, 4).map((ch: any) => (
            <span key={ch.id} className="text-xs">{(CHANNEL_META as any)[ch.type]?.icon}</span>
          ))}
          {space.channels.length > 4 && (
            <span className="text-2xs text-text-muted">+{space.channels.length - 4}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function MobileHeader({ displayName, unreadCount, onMenuOpen }: {
  displayName: string; unreadCount: number; onMenuOpen: () => void
}) {
  return (
    <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center justify-between">
      <button onClick={onMenuOpen} className="p-1.5 rounded hover:bg-surface text-text-secondary">
        <Menu className="w-5 h-5" />
      </button>
      <div className="font-display font-bold text-text-primary text-sm">OpenUni</div>
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <Link href="/dashboard/notifications" className="relative p-1.5 rounded hover:bg-surface text-text-secondary">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-2xs font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          </Link>
        )}
        <Avatar name={displayName} size="sm" />
      </div>
    </div>
  )
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <>
      <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]">
        <Sidebar onClose={onClose} />
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user: firebaseUser } = useAuthStore()
  const { profile } = useUserProfile()
  const { spaces, isLoading: spacesLoading } = useSpaces()
  const { notifications, unreadCount, markRead, markAllRead, isLoading: notifsLoading } = useNotifications()
  const spaceIds = useMemo(() => spaces.map((s: any) => s.id), [spaces])
  const { posts, isLoading: postsLoading } = useRecentPosts(spaceIds)

  const displayName  = profile?.displayName ?? firebaseUser?.displayName ?? 'Kullanıcı'
  const firstName    = displayName.split(' ')[0]
  const unreadNotifs = notifications.filter((n: any) => !n.isRead)
  const archivePosts = spaces.reduce((acc: number, s: any) =>
    acc + s.channels.filter((c: any) => c.type === 'archive').reduce((a: number, c: any) => a + (c.postCount ?? 0), 0), 0)

  function getChannelSlug(post: any) {
    for (const space of spaces as any[]) {
      if (space.id === post.spaceId) {
        const ch = space.channels.find((c: any) => c.id === post.channelId)
        if (ch) return { spaceSlug: space.slug, channelSlug: ch.slug }
      }
    }
    return { spaceSlug: post.spaceId, channelSlug: post.channelId }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 overflow-y-auto flex flex-col">
        <MobileHeader
          displayName={displayName}
          unreadCount={unreadCount}
          onMenuOpen={() => setDrawerOpen(true)}
        />

        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-3.5 items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-text-primary">Ana Sayfa</h1>
            <p className="text-xs text-text-muted">Merhaba, {firstName} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Link href="/dashboard/notifications" className="relative p-2 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-2xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              </Link>
            )}
            <Avatar name={displayName} size="sm" />
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Topluluk" value={spaces.length}   icon={Users}   color="bg-brand/10 text-brand"               isLoading={spacesLoading} />
            <StatCard label="Gönderi"  value={posts.length}    icon={Flame}   color="bg-accent-green/10 text-accent-green"  isLoading={postsLoading} />
            <StatCard label="Kaynak"   value={archivePosts}    icon={BookOpen} color="bg-accent-purple/10 text-accent-purple" isLoading={spacesLoading} />
            <StatCard label="Bildirim" value={unreadCount}     icon={Bell}    color="bg-accent-amber/10 text-accent-amber"  isLoading={notifsLoading} />
          </div>

          {/* Bildirimler */}
          {!notifsLoading && unreadNotifs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-accent-amber" /> Yeni Bildirimler
                </h2>
                <div className="flex items-center gap-3">
                  <button onClick={markAllRead} className="text-xs text-text-muted hover:text-text-secondary transition-colors hidden sm:block">
                    Tümünü okundu işaretle
                  </button>
                  <Link href="/dashboard/notifications" className="text-xs text-brand hover:text-brand-hover transition-colors flex items-center gap-1">
                    Tümü <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {unreadNotifs.slice(0, 3).map((n: any) => (
                  <Link key={n.id} href={n.link || '#'} onClick={() => markRead(n.id)}>
                    <div className="card hover:bg-surface-hover border-brand/20 border transition-all cursor-pointer flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary">{n.title}</p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{n.body}</p>
                      </div>
                      <span className="text-2xs text-text-muted shrink-0 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Son Paylaşımlar */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-brand" /> Son Paylaşımlar
              </h2>
            </div>
            {postsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 card">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm text-text-secondary font-medium">Henüz paylaşım yok</p>
                <p className="text-xs text-text-muted mt-1">Toplulukları keşfet ve ilk paylaşımı yap!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post: any) => {
                  const { spaceSlug, channelSlug } = getChannelSlug(post)
                  return <PostCard key={post.id} post={post} spaceSlug={spaceSlug} channelSlug={channelSlug} />
                })}
              </div>
            )}
          </section>

          {/* Topluluklar */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent-green" /> Toplulukların
              </h2>
              <Link href="/dashboard/spaces" className="text-xs text-brand hover:text-brand-hover transition-colors flex items-center gap-1">
                Tümü <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {spacesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-36" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {spaces.map((space: any) => <SpaceCard key={space.id} space={space} />)}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
