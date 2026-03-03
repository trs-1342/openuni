'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChannelHeader } from '@/components/channels/ChannelHeader'
import { PostCard } from '@/components/posts/PostCard'
import { usePosts } from '@/hooks/usePosts'
import { getSpaceBySlug } from '@/lib/firestore'
import { notFound } from 'next/navigation'
import { Filter, SortDesc, Menu } from 'lucide-react'
import type { Space } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded ${className}`} />
}

export default function ChannelPage() {
  const params = useParams<{ spaceSlug: string; channelSlug: string }>()
  const [space, setSpace] = useState<Space | null>(null)
  const [spaceLoading, setSpaceLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    getSpaceBySlug(params.spaceSlug).then(s => {
      setSpace(s)
      setSpaceLoading(false)
    })
  }, [params.spaceSlug])

  const channel = space?.channels.find(c => c.slug === params.channelSlug)
  const { posts, isLoading: postsLoading } = usePosts(channel?.id ?? '')

  if (!spaceLoading && !space) return notFound()

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

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary text-sm truncate">
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

            <div className="px-4 lg:px-6 py-3 border-b border-surface-border flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {postsLoading ? '...' : `${posts.length} paylaşım`}
              </span>
              <div className="flex items-center gap-2">
                <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5">
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">Filtrele</span>
                </button>
                <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5">
                  <SortDesc className="w-3 h-3" />
                  <span className="hidden sm:inline">Sırala</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 lg:p-6 max-w-3xl w-full mx-auto space-y-3">
              {postsLoading ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-28" />)
              ) : posts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-text-secondary text-sm font-medium">Henüz paylaşım yok</p>
                  <p className="text-text-muted text-xs mt-1">İlk paylaşımı sen yapabilirsin!</p>
                </div>
              ) : (
                posts.map(post => (
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
