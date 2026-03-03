// src/app/dashboard/bookmarks/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PostCard } from '@/components/posts/PostCard'
import { useAuthStore } from '@/store/authStore'
import { useSpaces } from '@/hooks/useSpaces'
import { getBookmarkedPosts } from '@/lib/firestore'
import { Bookmark, Menu } from 'lucide-react'
import type { Post } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
}

export default function BookmarksPage() {
  const { user }  = useAuthStore()
  const { spaces } = useSpaces()
  const [posts, setPosts]       = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    getBookmarkedPosts(user.uid).then(p => {
      setPosts(p)
      setIsLoading(false)
    })
  }, [user?.uid])

  function getSlugs(post: Post) {
    for (const space of spaces) {
      if (space.id !== post.spaceId) continue
      const ch = space.channels.find(c => c.id === post.channelId)
      if (ch) return { spaceSlug: space.slug, channelSlug: ch.slug }
    }
    return { spaceSlug: post.spaceId, channelSlug: post.channelId }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[240px]">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1">Kaydedilenler</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <h1 className="font-display font-semibold text-text-primary flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-brand" />
            Kaydedilenler
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {isLoading ? '...' : `${posts.length} kayıtlı gönderi`}
          </p>
        </div>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto">
          {isLoading ? (
            <div className="space-y-3 mt-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 card mt-4">
              <div className="text-4xl mb-3">🔖</div>
              <p className="text-text-secondary font-medium text-sm">Henüz kayıtlı gönderi yok</p>
              <p className="text-text-muted text-xs mt-1.5">
                Gönderi sayfasında kaydet ikonuna basarak buraya ekleyebilirsin.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {posts.map(post => {
                const { spaceSlug, channelSlug } = getSlugs(post)
                return (
                  <PostCard key={post.id} post={post} spaceSlug={spaceSlug} channelSlug={channelSlug} />
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
