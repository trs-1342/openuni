'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useSpaces } from '@/hooks/useSpaces'
import { CHANNEL_META } from '@/lib/utils'
import { Search, Users, Menu } from 'lucide-react'
import Link from 'next/link'

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded ${className}`} />
}

export default function SpacesPage() {
  const { spaces, isLoading } = useSpaces()
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.description.toLowerCase().includes(query.toLowerCase())
  )

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
          <span className="font-display font-semibold text-text-primary flex-1">Topluluklar</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <h1 className="font-display font-semibold text-text-primary">Topluluklar</h1>
          <p className="text-xs text-text-muted mt-0.5">Bölümüne veya ilgi alanına göre topluluğa katıl</p>
        </div>

        <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Topluluk veya bölüm ara..."
              className="input pl-10"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                {query ? `"${query}" için sonuçlar (${filtered.length})` : `Topluluklar (${spaces.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(space => (
                  <Link key={space.id} href={`/dashboard/spaces/${space.slug}`}>
                    <div className="card hover:bg-surface-hover hover:border-surface-active transition-all duration-200 cursor-pointer h-full">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-2xl border border-surface-border shrink-0">
                          {space.iconEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary truncate">{space.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-text-muted" />
                            <span className="text-2xs text-text-muted">{space.memberCount} üye</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2">
                        {space.description}
                      </p>
                      <div className="space-y-1">
                        {space.channels.slice(0, 4).map(channel => {
                          const meta = CHANNEL_META[channel.type]
                          return (
                            <div key={channel.id} className="flex items-center gap-2 text-xs text-text-muted">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.bgClass.replace('/10', '')}`} />
                              <span className="truncate">{meta.icon} {channel.name}</span>
                              <span className="ml-auto tabular-nums text-2xs">{channel.postCount}</span>
                            </div>
                          )
                        })}
                        {space.channels.length > 4 && (
                          <div className="text-2xs text-text-muted pl-3.5">
                            +{space.channels.length - 4} kanal daha
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
