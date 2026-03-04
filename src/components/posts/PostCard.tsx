'use client'

import Link from 'next/link'
import { cn, timeAgo, formatFileSize, CHANNEL_META } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { ChannelBadge, RoleBadge } from '@/components/ui/Badge'
import type { Post } from '@/types'
import { MessageSquare, Eye, Pin, Paperclip, FileText, ChevronRight, Download, ImageIcon, File } from 'lucide-react'

type PostCardProps = { post: any; spaceSlug?: any; channelSlug?: any; variant?: any; [key: string]: any }

export function PostCard({ post, spaceSlug, channelSlug, variant = 'default' }: PostCardProps) {
  const href = `/dashboard/spaces/${spaceSlug}/${channelSlug}/${post.id}`
  const channelMeta = CHANNEL_META[post.isAnnouncement ? 'announcement' : 'academic']

  return (
    <Link href={href} className="block group">
      <article className={cn(
        'card hover:bg-surface-hover border hover:border-surface-active transition-all duration-200',
        post.isPinned && 'border-l-2 border-l-accent-amber',
        post.isAnnouncement && 'border-l-2 border-l-accent-amber bg-accent-amber/5',
      )}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={post.author.displayName} size="sm" className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-text-secondary">{post.author.displayName}</span>
              <RoleBadge role={post.author.role} />
              <span className="text-2xs text-text-muted">{timeAgo(post.createdAt)}</span>
              {post.isPinned && (
                <span className="flex items-center gap-1 text-2xs text-accent-amber">
                  <Pin className="w-2.5 h-2.5" />
                  Sabitlenmiş
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={cn(
              'mt-1.5 font-semibold text-text-primary leading-snug group-hover:text-brand transition-colors',
              variant === 'default' ? 'text-sm' : 'text-xs'
            )}>
              {post.title}
            </h3>

            {/* Content Preview */}
            {variant === 'default' && (
              <p className="mt-1 text-xs text-text-secondary leading-relaxed line-clamp-2">
                {post.content.replace(/\*\*/g, '')}
              </p>
            )}

            {/* Tags */}
            {post.tags.length > 0 && variant === 'default' && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag: any) => (
                  <span key={tag} className="text-2xs px-2 py-0.5 rounded-sm bg-surface text-text-muted border border-surface-border">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Attachments */}
            {post.attachments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {post.attachments.map((att) => {
                  const isImage = att.type === 'image'
                  const isPdf   = att.type === 'pdf'
                  const Icon    = isImage ? ImageIcon : isPdf ? FileText : File
                  const iconColor = isImage ? 'text-brand' : isPdf ? 'text-accent-red' : 'text-accent-amber'
                  return (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={!isImage}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 px-3 py-2 rounded bg-background border border-surface-border text-xs text-text-secondary hover:border-brand/40 hover:text-text-primary transition-all group/file"
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', iconColor)} />
                      <span className="flex-1 truncate">{att.name}</span>
                      <span className="text-text-muted tabular-nums shrink-0">{formatFileSize(att.size)}</span>
                      <Download className="w-3 h-3 text-text-muted group-hover/file:text-brand shrink-0 transition-colors" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary shrink-0 mt-0.5 transition-colors" />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-border/50">
          <span className="flex items-center gap-1.5 text-2xs text-text-muted">
            <Eye className="w-3 h-3" />
            {post.viewCount}
          </span>
          <span className="flex items-center gap-1.5 text-2xs text-text-muted">
            <MessageSquare className="w-3 h-3" />
            {post.commentCount} yorum
          </span>
          {post.attachments.length > 0 && (
            <span className="flex items-center gap-1.5 text-2xs text-text-muted">
              <Paperclip className="w-3 h-3" />
              {post.attachments.length} dosya
            </span>
          )}
        </div>
      </article>
    </Link>
  )
}
