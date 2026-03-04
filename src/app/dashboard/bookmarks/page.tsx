'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PostCard } from '@/components/posts/PostCard'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getBookmarkedPosts } from '@/lib/firestore'
import { getSpaceBySlug } from '@/lib/firestore'
import { Bookmark, Menu, Loader2 } from 'lucide-react'
import type { Post } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
}

export default function BookmarksPage() {
  const { user }        = useAuthStore()
  const { profile }     = useUserProfile()
  const [posts,   setPosts]   = useState<Post[]>([])
  const [slugMap, setSlugMap] = useState<Record<string, { spaceSlug: string; channelSlug: string }>>({})
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!profile?.bookmarks) { setLoading(false); return }
    if (profile.bookmarks.length === 0) { setLoading(false); return }

    getBookmarkedPosts(profile.bookmarks).then(async (fetched) => {
      setPosts(fetched)

      // Her post için space slug ve channel slug'ı çek
      const map: Record<string, { spaceSlug: string; channelSlug: string }> = {}
      const spaceCache: Record<string, any> = {}

      for (const post of fetched) {
        if (!spaceCache[post.spaceId]) {
          // spaceId ile slug bulmak için tüm spaces'i çekmek yerine
          // post'un channel bilgisinden yola çık
          try {
            const { getSpaces } = await import('@/lib/firestore')
            const spaces = await getSpaces()
            spaces.forEach(s => { spaceCache[s.id] = s })
          } catch {}
        }
        const space = spaceCache[post.spaceId]
        if (space) {
          const ch = space.channels.find((c: any) => c.id === post.channelId)
          map[post.id] = {
            spaceSlug:   space.slug,
            channelSlug: ch?.slug ?? '',
          }
        }
      }
      setSlugMap(map)
      setLoading(false)
    })
  }, [profile?.bookmarks])

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
          <span className="font-display font-semibold text-text-primary flex-1">Kaydedilenler</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <h1 className="font-display font-semibold text-text-primary flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-brand" />Kaydedilenler
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Kaydettiğin gönderiler burada listelenir</p>
        </div>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bookmark className="w-12 h-12 text-text-muted mb-4 opacity-30" />
              <p className="font-medium text-text-secondary">Henüz kaydedilen gönderi yok</p>
              <p className="text-xs text-text-muted mt-1">
                Gönderi detayında 🔖 ikonuna tıklayarak kaydedebilirsin
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted mb-4">{posts.length} kaydedilen gönderi</p>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  spaceSlug={slugMap[post.id]?.spaceSlug ?? ''}
                  channelSlug={slugMap[post.id]?.channelSlug ?? ''}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
