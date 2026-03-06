// src/app/dashboard/documents/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { deletePost, archivePost, getSpace } from '@/lib/firestore'
import { timeAgo, cn } from '@/lib/utils'
import { getDocs, query, collection, where, orderBy, limit, getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Menu, FileText, Search, Trash2, Archive,
  Download, Loader2, BookOpen, AlertCircle, ExternalLink,
} from 'lucide-react'
import type { Post, Space } from '@/types'

function postFromDoc(d: any): Post {
  const data = d.data()
  return {
    ...data,
    id: d.id,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  }
}

export default function DocumentsPage() {
  const [posts,       setPosts]       = useState<Post[]>([])
  const [spaceMap,    setSpaceMap]    = useState<Record<string, Space>>({})
  const [loading,     setLoading]     = useState(true)
  const [indexError,  setIndexError]  = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  const { user: firebaseUser } = useAuthStore()
  const { profile } = useUserProfile()
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''
  const isAdmin = firebaseUser?.email === ADMIN_EMAIL || profile?.role === 'admin'
  const isMod   = profile?.role === 'moderator'

  async function loadPosts() {
    setLoading(true)
    setIndexError(null)
    try {
      // Sadece status filtresi + orderBy — composite index gerektirir.
      // İlk açılışta Firebase hata fırlatır ve hata mesajında index oluşturma linki gelir.
      const snap = await getDocs(
        query(
          collection(db, 'posts'),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
          limit(200)
        )
      )

      const all = snap.docs.map(postFromDoc)

      // Client-side filtre: dosya eki olan postlar
      const withAttachments = all.filter(p => (p.attachments?.length ?? 0) > 0)
      setPosts(withAttachments)

      // Benzersiz spaceId'leri topla ve Space'leri çek
      const uniqueSpaceIds = Array.from(new Set<string>(withAttachments.map(p => p.spaceId).filter(Boolean)))
      if (uniqueSpaceIds.length > 0) {
        const spaces = await Promise.all(uniqueSpaceIds.map(id => getSpace(id)))
        const map: Record<string, Space> = {}
        spaces.forEach(s => { if (s) map[s.id] = s })
        setSpaceMap(map)
      }
    } catch (err: any) {
      // Firebase index hatası — mesajında link var
      const msg: string = err?.message ?? ''
      if (msg.includes('index') || msg.includes('firestore.googleapis.com')) {
        // Firebase hata mesajından direkt linki al
        const linkMatch = msg.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)
        setIndexError(linkMatch?.[0] ?? 'INDEX_NEEDED')
      } else {
        console.error('Documents yüklenemedi:', err)
        setIndexError('UNKNOWN')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPosts() }, [])

  function getPostLink(post: Post): string {
    const space = spaceMap[post.spaceId]
    if (!space) return '#'
    const channel = space.channels.find(c => c.id === post.channelId)
    if (!channel) return '#'
    return `/dashboard/spaces/${space.slug}/${channel.slug}/${post.id}`
  }

  async function handleDelete(postId: string) {
    if (!confirm('Bu paylaşımı silmek istediğine emin misin?')) return
    await deletePost(postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function handleArchive(postId: string) {
    if (!confirm('Bu paylaşımı arşivlemek istediğine emin misin?')) return
    await archivePost(postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const filtered = posts.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.author.displayName.toLowerCase().includes(search.toLowerCase())
  )

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
          <span className="font-display font-semibold text-text-primary flex-1">Belgeler</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-brand" />
            <div>
              <h1 className="font-display font-semibold text-text-primary">Belgeler & Dosyalar</h1>
              <p className="text-xs text-text-muted mt-0.5">Dosya eki içeren tüm paylaşımlar</p>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">

          {/* Index hatası bildirimi */}
          {indexError && (
            <div className="card border-accent-amber/40 bg-accent-amber/5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Firestore index gerekiyor</p>
                  <p className="text-xs text-text-muted mt-1">
                    Bu sayfa için Firebase Console'da bir kez index oluşturman gerekiyor.
                    Aşağıdaki bağlantıya tıkla, Firebase otomatik olarak oluşturacak (~1-2 dakika).
                  </p>
                </div>
              </div>
              {indexError !== 'INDEX_NEEDED' && indexError !== 'UNKNOWN' ? (
                <a
                  href={indexError}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-brand hover:text-brand-hover font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Firebase Console'da index oluştur
                </a>
              ) : (
                <p className="text-xs text-text-muted">
                  Firebase Console → Firestore → Indexes → Composite index ekle:<br />
                  <code className="bg-surface px-1 rounded text-accent-amber">
                    posts: status (Asc) + createdAt (Desc)
                  </code>
                </p>
              )}
              <button onClick={loadPosts}
                className="btn-secondary text-xs px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5" /> Tekrar dene
              </button>
            </div>
          )}

          {/* Arama */}
          {!indexError && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Belge veya kişi ara..."
                className="input pl-10"
              />
            </div>
          )}

          {/* İçerik */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : !indexError && filtered.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-secondary">Belge bulunamadı</p>
              <p className="text-xs text-text-muted mt-1">Henüz dosya eki olan paylaşım yok</p>
            </div>
          ) : !indexError ? (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">{filtered.length} belge</p>
              {filtered.map(post => {
                const isOwner   = post.authorId === firebaseUser?.uid
                const canDelete = isOwner || isAdmin
                const canArchive = (isOwner || isMod) && !isAdmin
                const link = getPostLink(post)

                return (
                  <div key={post.id} className="card space-y-3">
                    {/* Başlık + yazar + aksiyonlar */}
                    <div className="flex items-start gap-3">
                      <Avatar name={post.author.displayName} src={post.author.avatarUrl} size="sm" className="shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={link}
                          className={cn(
                            'font-medium text-sm hover:text-brand transition-colors line-clamp-2',
                            link === '#' ? 'text-text-muted pointer-events-none' : 'text-text-primary'
                          )}
                        >
                          {post.title}
                        </Link>
                        <p className="text-2xs text-text-muted mt-0.5">
                          {post.author.displayName} · {timeAgo(post.createdAt)}
                          {spaceMap[post.spaceId] && (
                            <span className="ml-1 text-text-muted/60">
                              · {spaceMap[post.spaceId].name}
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Aksiyon butonları */}
                      <div className="flex items-center gap-1 shrink-0">
                        {canArchive && (
                          <button
                            onClick={() => handleArchive(post.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent-amber hover:bg-accent-amber/10 transition-colors"
                            title="Arşivle"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dosya ekleri */}
                    {post.attachments?.length > 0 && (
                      <div className="space-y-1.5 pl-9">
                        {post.attachments.map((att: any) => (
                          <a
                            key={att.id ?? att.url}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-surface-border hover:border-brand/40 hover:bg-surface-hover transition-all group"
                          >
                            <FileText className="w-3.5 h-3.5 text-text-muted group-hover:text-brand shrink-0 transition-colors" />
                            <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors truncate flex-1">
                              {att.name}
                            </span>
                            <Download className="w-3.5 h-3.5 text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Etiketler */}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-9">
                        {post.tags.map(tag => (
                          <span key={tag}
                            className="text-2xs px-2 py-0.5 rounded-full bg-surface border border-surface-border text-text-muted">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
