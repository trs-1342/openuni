'use client'

import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-14 h-14 text-lg',
}

// Deterministic color from name
function getAvatarColor(name: string | undefined | null): string {
  if (!name) return 'from-slate-500 to-slate-600'
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-amber-500 to-amber-600',
    'from-red-500 to-red-600',
    'from-teal-500 to-teal-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const colorGradient = getAvatarColor(name)

  return (
    <div className={cn('relative shrink-0 rounded-full overflow-hidden', sizeMap[size], className)}>
      {src ? (
        <Image src={src} alt={name ?? ""} fill className="object-cover" />
      ) : (
        <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br font-semibold text-white select-none', colorGradient)}>
          {initials}
        </div>
      )}
    </div>
  )
}
