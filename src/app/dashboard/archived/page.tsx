'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/authStore'
import { getArchivedPosts, restorePost, hardDeletePost } from '@/lib/firestore'
import { timeAgo, cn } from '@/lib/utils'
import type { Post } from '@/types'
import {
  Archive, Menu, ArrowLeft, RotateCcw, Trash2,
  Loader2, Eye, MessageSquare, FileText, AlertTriangle,
} from 'lucide-react'

export default function ArchivedPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [posts,     setPosts]     = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen,setDrawerOpen]= useState(false)
  const [working,   setWorking]   = useState<string | null>(null) // postId
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    getArchivedPosts(user.uid).then(p => {
      setPosts(p)
      setIsLoading(false)
    })
  }, [user])

  async function handleRestore(post: Post) {
    setWorking(post.id)
    try {
      await restorePost(post.id)
      setPosts(prev => prev.filter(p => p.id !== post.id))
      showToast('Gönderi geri yüklendi ✓')
    } catch {
      showToast('Hata oluştu', false)
    } finally { setWorking(null) }
  }

  async function handleDelete(post: Post) {
    if (!confirm(`"${post.title}" gönderisini kalıcı olarak silmek istediğinden emin misin?`)) return
    setWorking(post.id)
    try {
      await hardDeletePost(post.id)
      setPosts(prev => prev.filter(p => p.id !== post.id))
      showToast('Gönderi kalıcı olarak silindi')
    } catch {
      showToast('Hata oluştu', false)
    } finally { setWorking(null) }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl border transition-all',
          toast.ok
            ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
            : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
        )}>
          {toast.msg}
        </div>
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
          <span className="font-display font-semibold text-text-primary flex-1">Arşivlenenler</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />Geri
            </button>
            <div>
              <h1 className="font-display font-semibold text-text-primary flex items-center gap-2">
                <Archive className="w-4 h-4 text-text-muted" />
                Arşivlenen Gönderiler
              </h1>
              <p className="text-xs text-text-muted mt-0.5">Arşivlediğin gönderiler burada saklanır — toplulukta görünmezler</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">

          {/* Bilgi kutusu */}
          <div className="flex items-start gap-3 bg-accent-amber/5 border border-accent-amber/20 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Arşivlenen gönderiler <strong className="text-text-primary">toplulukta görünmez</strong> ancak silinmez.
              Geri yükleyebilir veya kalıcı olarak silebilirsin.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 card">
              <Archive className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-secondary">Arşivlenen gönderi yok</p>
              <p className="text-xs text-text-muted mt-1">Bir gönderiyi arşivlediğinde burada görünür</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted mb-2">{posts.length} arşivlenen gönderi</p>
              {posts.map(post => (
                <div key={post.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{post.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-2xs text-text-muted">
                          <Eye className="w-3 h-3" />{post.viewCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-2xs text-text-muted">
                          <MessageSquare className="w-3 h-3" />{post.commentCount ?? 0}
                        </span>
                        {post.attachments?.length > 0 && (
                          <span className="flex items-center gap-1 text-2xs text-text-muted">
                            <FileText className="w-3 h-3" />{post.attachments.length} dosya
                          </span>
                        )}
                        <span className="text-2xs text-text-muted ml-auto">{timeAgo(post.updatedAt ?? post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border">
                    <button
                      onClick={() => handleRestore(post)}
                      disabled={working === post.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 transition-all disabled:opacity-50"
                    >
                      {working === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Geri Yükle
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      disabled={working === post.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-accent-red/20 text-accent-red hover:bg-accent-red/10 transition-all disabled:opacity-50"
                    >
                      {working === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Kalıcı Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
