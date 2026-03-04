'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { getSpaceBySlug } from '@/lib/firestore'
import { CHANNEL_META, cn } from '@/lib/utils'
import { Menu, Users, ChevronRight, Plus, ArrowLeft } from 'lucide-react'
import type { Space } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
}

export default function SpacePage() {
  const params = useParams<{ spaceSlug: string }>()
  const [space,   setSpace]   = useState<Space | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    getSpaceBySlug(params.spaceSlug).then(s => {
      setSpace(s)
      setLoading(false)
    })
  }, [params.spaceSlug])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1 truncate">
            {loading ? '...' : space?.name ?? 'Topluluk'}
          </span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Link href="/dashboard/spaces" className="hover:text-text-secondary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />Topluluklar
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary">{space?.name ?? '...'}</span>
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            </div>
          ) : !space ? (
            <div className="text-center py-20">
              <span className="text-4xl mb-3 block">🏛️</span>
              <p className="font-medium text-text-secondary">Topluluk bulunamadı</p>
              <Link href="/dashboard/spaces" className="mt-4 inline-block text-xs text-brand hover:underline">
                Topluluklara dön
              </Link>
            </div>
          ) : (
            <>
              {/* Space bilgisi */}
              <div className="card mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-3xl border border-surface-border shrink-0">
                    {space.iconEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display font-bold text-text-primary text-xl">{space.name}</h1>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{space.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Users className="w-3.5 h-3.5" />{space.memberCount} üye
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-text-muted">
                        📌 {space.channels.length} kanal
                      </span>
                      {space.isPublic
                        ? <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-full px-2 py-0.5">🌐 Herkese Açık</span>
                        : <span className="text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-full px-2 py-0.5">🔒 Özel</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Kanallar */}
              <div>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  📌 Kanallar
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {space.channels.map(channel => {
                    const meta = CHANNEL_META[channel.type]
                    return (
                      <Link key={channel.id} href={`/dashboard/spaces/${space.slug}/${channel.slug}`}>
                        <div className={cn(
                          'card hover:border-surface-active hover:bg-surface-hover transition-all duration-200 cursor-pointer',
                          'flex items-center gap-3'
                        )}>
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg border shrink-0', meta.bgClass, meta.borderClass)}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-text-primary text-sm truncate">{channel.name}</p>
                              <span className="text-2xs text-text-muted tabular-nums shrink-0">{channel.postCount} gönderi</span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5 truncate">{meta.description}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
