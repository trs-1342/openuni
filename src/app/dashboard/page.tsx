import { Sidebar } from '@/components/layout/Sidebar'
import { PostCard } from '@/components/posts/PostCard'
import { Avatar } from '@/components/ui/Avatar'
import { MOCK_POSTS, MOCK_USER, MOCK_SPACES, MOCK_NOTIFICATIONS } from '@/lib/mock-data'
import { timeAgo } from '@/lib/utils'
import { Bell, TrendingUp, Flame, BookOpen, Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-lg font-display font-semibold text-text-primary">{value}</div>
        <div className="text-2xs text-text-muted">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const unreadNotifications = MOCK_NOTIFICATIONS.filter(n => !n.isRead)
  const spaceInProgress = MOCK_SPACES[0]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 glass border-b border-surface-border px-6 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-text-primary">Ana Sayfa</h1>
            <p className="text-xs text-text-muted">Merhaba, {MOCK_USER.displayName.split(' ')[0]} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifications.length > 0 && (
              <Link href="/dashboard/notifications" className="relative p-2 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand text-white text-2xs font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              </Link>
            )}
            <Avatar name={MOCK_USER.displayName} size="sm" />
          </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Topluluk" value={MOCK_SPACES.length} icon={Users} color="bg-brand/10 text-brand" />
            <StatCard label="Yeni Gönderi" value={12} icon={Flame} color="bg-accent-green/10 text-accent-green" />
            <StatCard label="Kaynak" value={89} icon={BookOpen} color="bg-accent-purple/10 text-accent-purple" />
            <StatCard label="Bildirim" value={unreadNotifications.length} icon={Bell} color="bg-accent-amber/10 text-accent-amber" />
          </div>

          {/* Notifications Panel */}
          {unreadNotifications.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-accent-amber" />
                  Yeni Bildirimler
                </h2>
                <Link href="/dashboard/notifications" className="text-xs text-brand hover:text-brand-hover transition-colors flex items-center gap-1">
                  Tümü <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {unreadNotifications.map((notif) => (
                  <Link key={notif.id} href={notif.link || '#'}>
                    <div className="card hover:bg-surface-hover border-brand/20 border transition-all cursor-pointer flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary">{notif.title}</p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{notif.body}</p>
                      </div>
                      <span className="text-2xs text-text-muted shrink-0">{timeAgo(notif.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent Posts */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-brand" />
                Son Paylaşımlar
              </h2>
            </div>
            <div className="space-y-3">
              {MOCK_POSTS.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  spaceSlug="bilgisayar-muhendisligi"
                  channelSlug={
                    post.channelId === 'c1' ? 'duyurular' :
                    post.channelId === 'c2' ? 'akademik-destek' :
                    'kaynak-arsivi'
                  }
                />
              ))}
            </div>
          </section>

          {/* Communities Overview */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent-green" />
                Toplulukların
              </h2>
              <Link href="/dashboard/spaces" className="text-xs text-brand hover:text-brand-hover transition-colors flex items-center gap-1">
                Tümü <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MOCK_SPACES.map((space) => (
                <Link key={space.id} href={`/dashboard/spaces/${space.slug}`}>
                  <div className="card hover:bg-surface-hover hover:border-surface-active transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl">{space.iconEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary truncate">{space.name}</h3>
                        <p className="text-2xs text-text-muted">{space.memberCount} üye</p>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2">{space.description}</p>
                    <div className="mt-3 flex items-center gap-1">
                      {space.channels.slice(0, 4).map((ch) => (
                        <span key={ch.id} className="text-xs">{ch.icon}</span>
                      ))}
                      {space.channels.length > 4 && (
                        <span className="text-2xs text-text-muted">+{space.channels.length - 4}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
