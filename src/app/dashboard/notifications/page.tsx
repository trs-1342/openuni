'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { useNotifications } from '@/hooks/useNotifications'
import { timeAgo, cn } from '@/lib/utils'
import { Bell, CheckCheck, Megaphone, MessageSquare, FileText, Settings, Menu } from 'lucide-react'
import Link from 'next/link'
import type { NotificationType } from '@/types'
import { useState } from 'react'

const TYPE_META: Record<NotificationType, { icon: any; color: string }> = {
  announcement: { icon: Megaphone, color: 'text-accent-amber' },
  new_post:     { icon: FileText,  color: 'text-accent-purple' },
  new_comment:  { icon: MessageSquare, color: 'text-brand' },
  mention:      { icon: Bell,      color: 'text-accent-green' },
  moderation:   { icon: Settings,  color: 'text-accent-red' },
  system:       { icon: Bell,      color: 'text-text-muted' },
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded ${className}`} />
}

export default function NotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead } = useNotifications()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const unread = notifications.filter(n => !n.isRead)
  const read   = notifications.filter(n => n.isRead)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1">Bildirimler</span>
          {unread.length > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand">Tümünü okundu işaretle</button>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-4 items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-text-primary">Bildirimler</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {isLoading ? '...' : `${unread.length} okunmamış bildirim`}
            </p>
          </div>
          {unread.length > 0 && (
            <button onClick={markAllRead} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-3">
              <CheckCheck className="w-3.5 h-3.5" />
              Tümünü okundu işaretle
            </button>
          )}
        </div>

        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 card">
              <div className="text-4xl mb-3">🔔</div>
              <p className="text-text-secondary font-medium">Bildirim yok</p>
              <p className="text-text-muted text-xs mt-1">Yeni bildirimler burada görünecek</p>
            </div>
          ) : (
            <>
              {unread.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Yeni</h2>
                  <div className="space-y-2">
                    {unread.map(n => {
                      const { icon: Icon, color } = TYPE_META[n.type]
                      return (
                        <Link key={n.id} href={n.link || '#'} onClick={() => markRead(n.id)}>
                          <div className="card hover:bg-surface-hover border-brand/20 border cursor-pointer transition-all flex items-start gap-3">
                            <div className={cn('w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center shrink-0', color)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                                <span className="text-2xs text-text-muted whitespace-nowrap shrink-0">{timeAgo(n.createdAt)}</span>
                              </div>
                              <p className="text-xs text-text-secondary mt-1">{n.body}</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}

              {read.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Okunmuş</h2>
                  <div className="space-y-2 opacity-60">
                    {read.map(n => {
                      const { icon: Icon, color } = TYPE_META[n.type]
                      return (
                        <Link key={n.id} href={n.link || '#'}>
                          <div className="card hover:bg-surface-hover cursor-pointer transition-all flex items-start gap-3">
                            <div className={cn('w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center shrink-0', color)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-text-secondary">{n.title}</p>
                                <span className="text-2xs text-text-muted whitespace-nowrap shrink-0">{timeAgo(n.createdAt)}</span>
                              </div>
                              <p className="text-xs text-text-muted mt-1">{n.body}</p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
