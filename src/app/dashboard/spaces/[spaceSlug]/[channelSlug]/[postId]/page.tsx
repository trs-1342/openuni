'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/Badge'
import { useComments } from '@/hooks/useComments'
import { getPost, getSpaceBySlug, incrementViewCount } from '@/lib/firestore'
import { timeAgo, formatFileSize, CHANNEL_META, cn } from '@/lib/utils'
import type { Post, Space } from '@/types'
import {
  ChevronRight, Eye, MessageSquare, Paperclip,
  FileText, Download, Send, Loader2, ArrowLeft,
  Pin, Menu,
} from 'lucide-react'
import { useState as useMenuState } from 'react'

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded ${className}`} />
}

function CommentItem({ comment }: { comment: any }) {
  return (
    <div className="flex gap-3 group">
      <Avatar name={comment.author.displayName} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium text-text-primary">{comment.author.displayName}</span>
          <RoleBadge role={comment.author.role} />
          <span className="text-2xs text-text-muted">{timeAgo(comment.createdAt)}</span>
          {comment.isEdited && <span className="text-2xs text-text-muted italic">(düzenlendi)</span>}
        </div>
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  )
}

export default function PostDetailPage() {
  const params = useParams<{ spaceSlug: string; channelSlug: string; postId: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [space, setSpace] = useState<Space | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [commentText, setCommentText] = useState('')

  const channel = space?.channels.find(c => c.slug === params.channelSlug)
  const { comments, isLoading: commentsLoading, isSubmitting, addComment } = useComments(params.postId)

  useEffect(() => {
    async function load() {
      const [p, s] = await Promise.all([
        getPost(params.postId),
        getSpaceBySlug(params.spaceSlug),
      ])
      setPost(p)
      setSpace(s)
      setIsLoading(false)
      if (p) incrementViewCount(p.id).catch(() => {})
    }
    load()
  }, [params.postId, params.spaceSlug])

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    await addComment(commentText)
    setCommentText('')
  }

  const meta = channel ? CHANNEL_META[channel.type] : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <Link href={`/dashboard/spaces/${params.spaceSlug}/${params.channelSlug}`}
            className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-display font-semibold text-text-primary text-sm truncate">
            {isLoading ? '...' : post?.title}
          </span>
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-3.5 items-center gap-3">
          <Link
            href={`/dashboard/spaces/${params.spaceSlug}/${params.channelSlug}`}
            className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Geri
          </Link>
          {!isLoading && space && channel && meta && (
            <nav className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>{space.iconEmoji} {space.name}</span>
              <ChevronRight className="w-3 h-3" />
              <span className={meta.textClass}>{meta.icon} {channel.name}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-text-secondary truncate max-w-[200px]">{post?.title}</span>
            </nav>
          )}
        </div>

        {/* İçerik */}
        <div className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-32" />
            </div>
          ) : !post ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-text-secondary font-medium">Gönderi bulunamadı</p>
            </div>
          ) : (
            <article className="space-y-6">
              {/* Post header */}
              <div>
                {post.isPinned && (
                  <div className="flex items-center gap-1.5 text-xs text-accent-amber mb-3">
                    <Pin className="w-3.5 h-3.5" />
                    Sabitlenmiş gönderi
                  </div>
                )}
                <h1 className="font-display font-bold text-xl lg:text-2xl text-text-primary leading-snug mb-4">
                  {post.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Avatar name={post.author.displayName} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{post.author.displayName}</span>
                      <RoleBadge role={post.author.role} />
                    </div>
                    <span className="text-xs text-text-muted">{timeAgo(post.createdAt)}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.viewCount}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-sm bg-surface text-text-muted border border-surface-border">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* İçerik */}
              <div className="card">
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Dosyalar */}
              {post.attachments.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5" />
                    Ekler ({post.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {post.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-surface-border hover:border-brand/40 hover:bg-surface-hover transition-all group"
                      >
                        <FileText className="w-4 h-4 text-accent-purple shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate font-medium">{att.name}</p>
                          <p className="text-2xs text-text-muted">{formatFileSize(att.size)}</p>
                        </div>
                        <Download className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Yorumlar */}
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Yorumlar
                  {!commentsLoading && (
                    <span className="text-text-muted font-normal">({comments.length})</span>
                  )}
                </h3>

                {/* Yorum yaz */}
                {channel && !channel.isReadOnly && (
                  <form onSubmit={handleComment} className="mb-6">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <textarea
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Yorumunu yaz..."
                          rows={3}
                          className="input resize-none text-sm w-full"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(e as any)
                          }}
                        />
                        <p className="text-2xs text-text-muted mt-1">⌘+Enter ile gönder</p>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !commentText.trim()}
                        className={cn(
                          'btn-primary px-3 py-2 self-start text-xs',
                          (isSubmitting || !commentText.trim()) && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        {isSubmitting
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Send className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </form>
                )}

                {/* Yorum listesi */}
                {commentsLoading ? (
                  <div className="space-y-4">
                    {[1,2].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-surface animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-surface rounded animate-pulse w-1/4" />
                          <div className="h-10 bg-surface rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10 card">
                    <div className="text-2xl mb-2">💬</div>
                    <p className="text-sm text-text-secondary">Henüz yorum yok</p>
                    <p className="text-xs text-text-muted mt-1">İlk yorumu sen yap!</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map(comment => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </main>
    </div>
  )
}
