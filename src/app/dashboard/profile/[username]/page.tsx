'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getUserProfile, getUserByUsername, getPostsByUser, getUserStats } from '@/lib/firestore'
import { timeAgo, cn } from '@/lib/utils'
import { USER_TYPE_LABELS } from '@/lib/departments'
import type { User, Post } from '@/types'
import {
  ArrowLeft, Menu, MessageSquare, Eye, FileText,
  GraduationCap, BookOpen, Calendar, Loader2,
  ShieldCheck, Crown, Paperclip, Tag,
} from 'lucide-react'

function Skeleton({ className, ...props }: { className?: string; [k: string]: any }) {
  return <div className={cn('bg-surface animate-pulse rounded', className)} />
}

function PostCard({ post, ...props }: { post: Post; [k: string]: any }) {
  return (
    <Link href={`/dashboard/spaces/${post.spaceId}/${post.channelId}/${post.id}`}
      className="block card hover:bg-surface-hover hover:border-surface-active transition-all duration-200 group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {post.isAnnouncement && (
              <span className="text-2xs bg-accent-amber/10 text-accent-amber border border-accent-amber/20 px-1.5 py-0.5 rounded font-medium">📣 Duyuru</span>
            )}
            {post.isPinned && (
              <span className="text-2xs bg-brand/10 text-brand border border-brand/20 px-1.5 py-0.5 rounded font-medium">📌 Sabitlendi</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors line-clamp-2 leading-snug">
            {post.title}
          </h3>
          {post.tags?.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <Tag className="w-3 h-3 text-text-muted shrink-0" />
              {post.tags.slice(0, 3).map((tag: any) => (
                <span key={tag} className="text-2xs text-text-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {post.attachments?.some((a: any) => a.type === 'image') && (
          <div className="w-16 h-14 rounded-lg overflow-hidden border border-surface-border shrink-0">
            <img
              src={post.attachments.find((a: any) => a.type === 'image')?.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-surface-border/50">
        <span className="flex items-center gap-1 text-2xs text-text-muted">
          <Eye className="w-3 h-3" />{post.viewCount ?? 0}
        </span>
        <span className="flex items-center gap-1 text-2xs text-text-muted">
          <MessageSquare className="w-3 h-3" />{post.commentCount ?? 0}
        </span>
        {post.attachments?.length > 0 && (
          <span className="flex items-center gap-1 text-2xs text-text-muted">
            <Paperclip className="w-3 h-3" />{post.attachments.length}
          </span>
        )}
        <span className="ml-auto text-2xs text-text-muted">{timeAgo(post.createdAt)}</span>
      </div>
    </Link>
  )
}

export default function ProfilePage() {
  const params    = useParams()
  const router    = useRouter()
  const usernameParam = params?.username as string

  const { user: currentUser }  = useAuthStore()
  const { profile: myProfile } = useUserProfile()

  const [profile,   setProfile]   = useState<User | null>(null)
  const [posts,     setPosts]     = useState<Post[]>([])
  const [stats,     setStats]     = useState<{ postCount: number; commentCount: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isOwnProfile = currentUser?.uid === profile?.uid
  const isAdmin      = myProfile?.role === 'admin' || currentUser?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    if (!usernameParam) return
    setIsLoading(true)
    async function loadProfile() {
      // Önce username ile dene
      let p = await getUserByUsername(usernameParam)
      // Bulamazsa uid ile dene (eski linkler için fallback)
      if (!p) p = await getUserProfile(usernameParam)
      if (!p) { setIsLoading(false); return }
      setProfile(p)
      const [ps, st] = await Promise.all([
        getPostsByUser(p.uid),
        getUserStats(p.uid),
      ])
      setPosts(ps)
      setStats(st)
      setIsLoading(false)
    }
    loadProfile()
  }, [usernameParam])

  const roleLabel = profile?.role === 'admin'
    ? { label: 'Admin', icon: Crown, color: 'text-accent-amber', bg: 'bg-accent-amber/10 border-accent-amber/20' }
    : profile?.role === 'moderator'
    ? { label: 'Moderatör', icon: ShieldCheck, color: 'text-accent-purple', bg: 'bg-accent-purple/10 border-accent-purple/20' }
    : null

  const userTypeLabel = profile?.userType
    ? USER_TYPE_LABELS[profile.userType as keyof typeof USER_TYPE_LABELS]
    : null

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
          <button onClick={() => router.back()} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1 truncate">
            {profile?.displayName ?? 'Profil'}
          </span>
        </div>

        {/* Desktop back */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-3 items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Geri
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6 space-y-5">

          {isLoading ? (
            <>
              <div className="card p-6 flex items-start gap-5">
                <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3.5 w-56" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
            </>
          ) : !profile ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">👤</p>
              <p className="font-medium text-text-secondary">Kullanıcı bulunamadı</p>
              <p className="text-sm text-text-muted mt-1">Bu profil mevcut değil veya silinmiş olabilir.</p>
            </div>
          ) : (
            <>
              {/* Profil kartı */}
              <div className="card p-6">
                <div className="flex items-start gap-4 sm:gap-5">
                  <Avatar
                    src={profile.avatarUrl}
                    name={profile.displayName}
                    size="lg"
                    className="w-20 h-20 text-2xl shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-display font-bold text-xl text-text-primary">
                        {profile.displayName}
                      </h1>
                      {roleLabel && (
                        <span className={cn('inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-full border', roleLabel.bg, roleLabel.color)}>
                          <roleLabel.icon className="w-3 h-3" />
                          {roleLabel.label}
                        </span>
                      )}
                    </div>

                    {(profile as any).username && (
                      <p className="text-sm text-brand font-medium mt-0.5">@{(profile as any).username}</p>
                    )}
                    <p className="text-xs text-text-muted mt-0.5">{profile.email}</p>

                    {/* Meta bilgiler */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                      {userTypeLabel && (
                        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <GraduationCap className="w-3.5 h-3.5 text-text-muted" />
                          {userTypeLabel}
                        </span>
                      )}
                      {profile.fakulte && (
                        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                          {profile.fakulte}
                        </span>
                      )}
                      {profile.department && (
                        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <FileText className="w-3.5 h-3.5 text-text-muted" />
                          {profile.department}
                        </span>
                      )}
                      {profile.grade && (
                        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <span className="text-text-muted text-xs">📅</span>
                          {profile.grade === 'hazirlik' ? 'Hazırlık' : `${profile.grade}. Sınıf`}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(profile.joinedAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} katıldı
                      </span>
                    </div>
                  </div>

                  {/* Kendi profili ise düzenle butonu */}
                  {isOwnProfile && (
                    <Link href="/dashboard/settings"
                      className="shrink-0 text-xs text-text-muted border border-surface-border hover:border-surface-active hover:text-text-secondary px-3 py-1.5 rounded-lg transition-all">
                      Düzenle
                    </Link>
                  )}
                </div>

                {/* Ban/Mute uyarısı — admin görsün */}
                {isAdmin && profile.isBanned && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
                    🚫 Hesap askıya alındı{profile.banReason ? ` — ${profile.banReason}` : ''}
                  </div>
                )}
                {isAdmin && profile.isMuted && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-lg px-3 py-2">
                    🔇 Hesap susturuldu
                  </div>
                )}
              </div>

              {/* İstatistikler */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Gönderi',   value: stats?.postCount    ?? 0, icon: FileText,     color: 'text-brand' },
                  { label: 'Yorum',     value: stats?.commentCount ?? 0, icon: MessageSquare, color: 'text-accent-green' },
                  { label: 'Görüntülenme', value: posts.reduce((s, p) => s + (p.viewCount ?? 0), 0), icon: Eye, color: 'text-accent-purple' },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="card text-center py-4 px-2">
                      <Icon className={cn('w-5 h-5 mx-auto mb-1.5', s.color)} />
                      <p className={cn('text-2xl font-bold font-display', s.color)}>{s.value}</p>
                      <p className="text-2xs text-text-muted mt-0.5">{s.label}</p>
                    </div>
                  )
                })}
              </div>

              {/* Gönderiler */}
              <div>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Gönderiler ({posts.length})
                </h2>

                {posts.length === 0 ? (
                  <div className="text-center py-10 card">
                    <p className="text-3xl mb-2">📝</p>
                    <p className="text-sm text-text-secondary font-medium">
                      {isOwnProfile ? 'Henüz gönderi paylaşmadın' : 'Henüz gönderi yok'}
                    </p>
                    {isOwnProfile && (
                      <Link href="/dashboard/spaces"
                        className="inline-block mt-3 text-xs text-brand hover:text-brand/80 transition-colors">
                        Bir topluluğa katılıp gönderi paylaş →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
