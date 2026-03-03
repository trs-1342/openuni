import Link from 'next/link'
import { cn, CHANNEL_META } from '@/lib/utils'
import type { Channel } from '@/types'
import { Info, Pin, Search, Plus } from 'lucide-react'

interface ChannelHeaderProps {
  channel: Channel
  spaceSlug: string
}

export function ChannelHeader({ channel, spaceSlug }: ChannelHeaderProps) {
  const meta = CHANNEL_META[channel.type]

  return (
    <div className="border-b border-surface-border bg-background-secondary/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-lg', meta.bgClass, meta.borderClass, 'border')}>
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-text-primary">
                {channel.name}
              </h2>
              <span className={cn('badge', meta.bgClass, meta.textClass)}>
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{channel.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-ghost rounded p-2">
            <Search className="w-4 h-4" />
          </button>
          <button className="btn-ghost rounded p-2">
            <Pin className="w-4 h-4" />
          </button>
          {!channel.isReadOnly && (
            <Link
              href={`/dashboard/spaces/${spaceSlug}/${channel.slug}/new`}
              className="btn-primary rounded gap-1.5 text-xs px-3 py-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Paylaş
            </Link>
          )}
        </div>
      </div>

      {/* Channel Rules Preview */}
      {meta.rules.length > 0 && (
        <div className={cn('mt-3 px-3 py-2.5 rounded-md border flex items-start gap-2', meta.bgClass, meta.borderClass)}>
          <Info className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', meta.textClass)} />
          <div className="space-y-1">
            {meta.rules.map((rule, i) => (
              <p key={i} className="text-xs text-text-secondary">{rule}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
