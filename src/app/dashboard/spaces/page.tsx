import { Sidebar } from '@/components/layout/Sidebar'
import { MOCK_SPACES } from '@/lib/mock-data'
import { CHANNEL_META } from '@/lib/utils'
import { Search, Users, Hash } from 'lucide-react'
import Link from 'next/link'

export default function SpacesPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <h1 className="font-display font-semibold text-text-primary">Topluluklar</h1>
          <p className="text-xs text-text-muted mt-0.5">Bölümüne veya ilgi alanına göre topluluğa katıl</p>
        </div>

        <div className="p-6 max-w-5xl mx-auto">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Topluluk veya bölüm ara..."
              className="input pl-10"
            />
          </div>

          {/* Spaces Grid */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Üye Olduğun Topluluklar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_SPACES.map((space) => (
                  <Link key={space.id} href={`/dashboard/spaces/${space.slug}`}>
                    <div className="card hover:bg-surface-hover hover:border-surface-active transition-all duration-200 cursor-pointer h-full">
                      {/* Space Icon & Name */}
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

                      {/* Channels Preview */}
                      <div className="space-y-1">
                        {space.channels.slice(0, 4).map((channel) => {
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
          </div>
        </div>
      </main>
    </div>
  )
}
