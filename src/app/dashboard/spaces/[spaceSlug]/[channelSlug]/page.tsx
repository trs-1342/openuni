'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChannelHeader } from '@/components/channels/ChannelHeader'
import { PostCard } from '@/components/posts/PostCard'
import { usePosts } from '@/hooks/usePosts'
import { getSpaceBySlug } from '@/lib/firestore'
import { notFound } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Filter, SortDesc, Menu, X, ChevronDown } from 'lucide-react'
import type { Space, Post } from '@/types'

type SortKey = 'newest' | 'oldest' | 'mostViewed' | 'mostCommented'
type FilterKey = 'all' | 'pinned' | 'hasFiles' | 'announcement'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',        label: '🕐 En Yeni' },
  { value: 'oldest',        label: '🕰 En Eski' },
  { value: 'mostViewed',    label: '👁 En Çok Görüntülenen' },
  { value: 'mostCommented', label: '💬 En Çok Yorumlanan' },
]

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all',          label: 'Tümü' },
  { value: 'pinned',       label: '📌 Sabitlenmiş' },
  { value: 'hasFiles',     label: '📎 Dosya İçerenler' },
  { value: 'announcement', label: '📣 Duyurular' },
]

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded ${className}`} />
}

export default function ChannelPage() {
  const params = useParams<{ spaceSlug: string; channelSlug: string }>()
  const [space,        setSpace]       = useState<Space | null>(null)
  const [spaceLoading, setSpaceLoading] = useState(true)
  const [drawerOpen,   setDrawerOpen]  = useState(false)
  const [sort,         setSort]        = useState<SortKey>('newest')
  const [filter,       setFilter]      = useState<FilterKey>('all')
  const [showSort,     setShowSort]    = useState(false)
  const [showFilter,   setShowFilter]  = useState(false)
  const [search,       setSearch]      = useState('')

  useEffect(() => {
    getSpaceBySlug(params.spaceSlug).then(s => {
      setSpace(s)
      setSpaceLoading(false)
    })
  }, [params.spaceSlug])

  const channel = space?.channels.find(c => c.slug === params.channelSlug)
  const { posts, isLoading: postsLoading } = usePosts(channel?.id ?? '')

  // Filtre + sırala + ara
  const filteredPosts = useMemo(() => {
    let result = [...posts]

    // Arama
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      )
    }

    // Filtre
    if (filter === 'pinned')       result = result.filter(p => p.isPinned)
    if (filter === 'hasFiles')     result = result.filter(p => p.attachments?.length > 0)
    if (filter === 'announcement') result = result.filter(p => p.isAnnouncement)

    // Sırala
    result.sort((a, b) => {
      if (sort === 'newest')        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'oldest')        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sort === 'mostViewed')    return (b.viewCount ?? 0) - (a.viewCount ?? 0)
      if (sort === 'mostCommented') return (b.commentCount ?? 0) - (a.commentCount ?? 0)
      return 0
    })

    // Sabitlenmiş her zaman üstte (sıralama ne olursa olsun)
    return [
      ...result.filter(p => p.isPinned),
      ...result.filter(p => !p.isPinned),
    ]
  }, [posts, sort, filter, search])

  if (!spaceLoading && !space) return notFound()

  const activeFilterCount = (filter !== 'all' ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      {/* Sort dropdown overlay */}
      {(showSort || showFilter) && (
        <div className="fixed inset-0 z-20" onClick={() => { setShowSort(false); setShowFilter(false) }} />
      )}

      <main className="flex-1 overflow-y-auto flex flex-col pb-24 lg:pb-0">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary text-sm truncate flex-1">
            {channel ? `${channel.icon ?? ''} ${channel.name}` : '...'}
          </span>
        </div>

        {spaceLoading || !channel ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-8 w-1/3" />
            {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <>
            <ChannelHeader channel={channel} spaceSlug={space!.slug} />

            {/* Filtre/Sıralama çubuğu */}
            <div className="px-4 lg:px-6 py-3 border-b border-surface-border space-y-2">
              {/* Arama */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Başlık, içerik veya etiket ara..."
                  className="input text-xs py-2 pr-8"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  {postsLoading ? '...' : `${filteredPosts.length} / ${posts.length} paylaşım`}
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setFilter('all'); setSearch('') }}
                      className="ml-2 text-brand hover:underline">filtrele temizle</button>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  {/* Filtre */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowFilter(p => !p); setShowSort(false) }}
                      className={cn('btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5',
                        filter !== 'all' && 'text-brand bg-brand/10'
                      )}>
                      <Filter className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {filter === 'all' ? 'Filtrele' : FILTER_OPTIONS.find(f => f.value === filter)?.label}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showFilter && (
                      <div className="absolute right-0 top-full mt-1 z-30 bg-[#131929] border border-surface-border rounded-xl shadow-xl py-1 min-w-[180px]">
                        {FILTER_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => { setFilter(opt.value); setShowFilter(false) }}
                            className={cn('w-full text-left px-3 py-2 text-xs hover:bg-surface transition-colors',
                              filter === opt.value ? 'text-brand font-medium' : 'text-text-secondary')}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sırala */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowSort(p => !p); setShowFilter(false) }}
                      className={cn('btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5',
                        sort !== 'newest' && 'text-brand bg-brand/10'
                      )}>
                      <SortDesc className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {SORT_OPTIONS.find(s => s.value === sort)?.label.split(' ').slice(1).join(' ') || 'Sırala'}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSort && (
                      <div className="absolute right-0 top-full mt-1 z-30 bg-[#131929] border border-surface-border rounded-xl shadow-xl py-1 min-w-[200px]">
                        {SORT_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => { setSort(opt.value); setShowSort(false) }}
                            className={cn('w-full text-left px-3 py-2 text-xs hover:bg-surface transition-colors',
                              sort === opt.value ? 'text-brand font-medium' : 'text-text-secondary')}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Post listesi */}
            <div className="flex-1 p-4 lg:p-6 max-w-3xl w-full mx-auto space-y-3">
              {postsLoading ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-28" />)
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl mb-3">{search || filter !== 'all' ? '🔍' : '📭'}</div>
                  <p className="text-text-secondary text-sm font-medium">
                    {search || filter !== 'all' ? 'Sonuç bulunamadı' : 'Henüz paylaşım yok'}
                  </p>
                  <p className="text-text-muted text-xs mt-1">
                    {search || filter !== 'all' ? 'Farklı filtre veya arama dene' : 'İlk paylaşımı sen yapabilirsin!'}
                  </p>
                </div>
              ) : (
                filteredPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    spaceSlug={space!.slug}
                    channelSlug={channel.slug}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
