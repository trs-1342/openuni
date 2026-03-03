import { Sidebar } from '@/components/layout/Sidebar'
import { PostFormClient } from '@/components/posts/PostFormClient'
import { MOCK_SPACES } from '@/lib/mock-data'
import { CHANNEL_META } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface PageProps {
  params: { spaceSlug: string; channelSlug: string }
}

export default function NewPostPage({ params }: PageProps) {
  const space = MOCK_SPACES.find(s => s.slug === params.spaceSlug)
  if (!space) notFound()

  const channel = space.channels.find(c => c.slug === params.channelSlug)
  if (!channel) notFound()

  const meta = CHANNEL_META[channel.type]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-surface-border px-6 py-3.5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Link href="/dashboard/spaces" className="hover:text-text-secondary transition-colors">{space.iconEmoji} {space.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/dashboard/spaces/${space.slug}/${channel.slug}`} className="hover:text-text-secondary transition-colors">
              {meta.icon} {channel.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary">Yeni paylaşım</span>
          </nav>

          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm', meta.bgClass, 'border', meta.borderClass)}>
              {meta.icon}
            </div>
            <h1 className="font-display font-semibold text-text-primary">
              {meta.label} kanalına paylaş
            </h1>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 max-w-2xl mx-auto">
          <PostFormClient
            channel={channel}
            spaceSlug={space.slug}
          />
        </div>
      </main>
    </div>
  )
}
