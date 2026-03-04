// src/app/dashboard/spaces/[spaceSlug]/[channelSlug]/new/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PostForm } from '@/components/posts/PostForm'
import { getSpaceBySlug } from '@/lib/firestore'
import { CHANNEL_META, cn } from '@/lib/utils'
import Link from 'next/link'
import { ChevronRight, Loader2, Menu } from 'lucide-react'
import type { Space, Channel } from '@/types'

export default function NewPostPage() {
  const params    = useParams<{ spaceSlug: string; channelSlug: string }>()
  const [space,   setSpace]   = useState<Space | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    getSpaceBySlug(params.spaceSlug).then(s => {
      if (!s) { setLoading(false); return }
      setSpace(s)
      const ch = s.channels.find(c => c.slug === params.channelSlug) ?? null
      setChannel(ch)
      setLoading(false)
    })
  }, [params.spaceSlug, params.channelSlug])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    )
  }

  if (!space || !channel) return null

  const meta = CHANNEL_META[channel.type]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[240px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1 truncate">Yeni Paylaşım</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-3.5">
          <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Link href="/dashboard/spaces" className="hover:text-text-secondary transition-colors">
              {space.iconEmoji} {space.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/dashboard/spaces/${space.slug}/${channel.slug}`} className="hover:text-text-secondary transition-colors">
              {meta.icon} {channel.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary">Yeni paylaşım</span>
          </nav>
          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm border', meta.bgClass, meta.borderClass)}>
              {meta.icon}
            </div>
            <h1 className="font-display font-semibold text-text-primary">{meta.label} kanalına paylaş</h1>
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-2xl mx-auto">
          <PostForm channel={channel} spaceSlug={space.slug} spaceId={space.id} />
        </div>
      </main>
    </div>
  )
}
