import { Sidebar } from '@/components/layout/Sidebar'
import { ChannelHeader } from '@/components/channels/ChannelHeader'
import { PostCard } from '@/components/posts/PostCard'
import { MOCK_SPACES, MOCK_POSTS } from '@/lib/mock-data'
import { notFound } from 'next/navigation'
import { Filter, SortDesc } from 'lucide-react'

interface PageProps {
  params: {
    spaceSlug: string
    channelSlug: string
  }
}

export default function ChannelPage({ params }: PageProps) {
  const space = MOCK_SPACES.find((s) => s.slug === params.spaceSlug)
  if (!space) notFound()

  const channel = space.channels.find((c) => c.slug === params.channelSlug)
  if (!channel) notFound()

  const posts = MOCK_POSTS.filter((p) => p.channelId === channel.id)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto flex flex-col">
        <ChannelHeader channel={channel} spaceSlug={space.slug} />

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{posts.length} paylaşım</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5">
              <Filter className="w-3 h-3" />
              Filtrele
            </button>
            <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2.5">
              <SortDesc className="w-3 h-3" />
              Sırala
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="flex-1 p-6 max-w-3xl w-full mx-auto space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-text-secondary text-sm font-medium">Henüz paylaşım yok</p>
              <p className="text-text-muted text-xs mt-1">İlk paylaşımı sen yapabilirsin!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                spaceSlug={space.slug}
                channelSlug={channel.slug}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  const params: { spaceSlug: string; channelSlug: string }[] = []
  MOCK_SPACES.forEach((space) => {
    space.channels.forEach((channel) => {
      params.push({ spaceSlug: space.slug, channelSlug: channel.slug })
    })
  })
  return params
}
