import { cn } from '@/lib/utils'
import type { ChannelType } from '@/types'
import { CHANNEL_META } from '@/lib/utils'

interface ChannelBadgeProps {
  type: ChannelType
  className?: string
  showLabel?: boolean
}

export function ChannelBadge({ type, className, showLabel = true }: ChannelBadgeProps) {
  const meta = CHANNEL_META[type]
  return (
    <span className={cn('channel-tag', meta.bgClass, meta.textClass, className)}>
      <span>{meta.icon}</span>
      {showLabel && <span>{meta.label}</span>}
    </span>
  )
}

interface RoleBadgeProps {
  role: 'student' | 'moderator' | 'admin' | 'owner'
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const map: Record<string, { label: string; className: string }> = {
    student: { label: 'Öğrenci', className: 'bg-surface text-text-muted' },
    moderator: { label: 'Moderatör', className: 'bg-accent-amber/10 text-accent-amber' },
    admin: { label: 'Yönetici', className: 'bg-accent-red/10 text-accent-red' },
    owner: { label: 'Sistem Sahibi', className: 'bg-brand/10 text-brand' },
  }
  const entry = map[role] ?? map.student
  return (
    <span className={cn('badge', entry.className, className)}>
      {entry.label}
    </span>
  )
}
