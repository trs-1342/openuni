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
  role: 'student' | 'moderator' | 'admin'
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const map = {
    student: { label: 'Öğrenci', className: 'bg-surface text-text-muted' },
    moderator: { label: 'Moderatör', className: 'bg-accent-amber/10 text-accent-amber' },
    admin: { label: 'Admin', className: 'bg-accent-red/10 text-accent-red' },
  }
  const { label, className: cls } = map[role]
  return (
    <span className={cn('badge', cls, className)}>
      {label}
    </span>
  )
}
