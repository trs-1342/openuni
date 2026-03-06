'use client'

import Link from 'next/link'
import { cn, CHANNEL_META } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import type { Channel } from '@/types'
import { Info, Plus } from 'lucide-react'

interface ChannelHeaderProps {
  channel: Channel
  spaceSlug: string
}

export function ChannelHeader({ channel, spaceSlug }: ChannelHeaderProps) {
  const meta = CHANNEL_META[channel.type] ?? Object.values(CHANNEL_META)[0]
  const { user: firebaseUser } = useAuthStore()
  const { profile } = useUserProfile()

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''
  const isAdmin = firebaseUser?.email === ADMIN_EMAIL || profile?.role === 'admin'
  const isMod   = profile?.role === 'moderator'

  // Duyuru kanalında sadece admin/mod paylaşabilir
  const canPost = channel.isReadOnly ? (isAdmin || isMod) : true

  // Kanal ikonunu önce Firestore'dan (channel.icon), yoksa CHANNEL_META'dan al
  const channelIcon = (channel as any).icon ?? meta.icon

  // Uyarı metnini önce Firestore'dan (warningText), yoksa CHANNEL_META'dan al
  const warningLines: string[] = (channel as any).warningText
    ? [(channel as any).warningText]
    : meta.rules ?? []

  return (
    <div className="border-b border-surface-border bg-background-secondary/50 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-lg border shrink-0',
            meta.bgClass, meta.borderClass
          )}>
            {channelIcon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-semibold text-text-primary truncate">
                {channel.name}
              </h2>
              <span className={cn('badge shrink-0', meta.bgClass, meta.textClass)}>
                {meta.label}
              </span>
            </div>
            {(channel as any).description && (
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {(channel as any).description}
              </p>
            )}
          </div>
        </div>

        {canPost && (
          <Link
            href={`/dashboard/spaces/${spaceSlug}/${channel.slug}/new`}
            className="btn-primary rounded gap-1.5 text-xs px-3 py-2 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Paylaş
          </Link>
        )}
      </div>

      {/* Uyarı / Kural kutusu */}
      {warningLines.length > 0 && (
        <div className={cn(
          'mt-3 px-3 py-2.5 rounded-md border flex items-start gap-2',
          meta.bgClass, meta.borderClass
        )}>
          <Info className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', meta.textClass)} />
          <div className="space-y-1">
            {warningLines.map((line, i) => (
              <p key={i} className="text-xs text-text-secondary">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
