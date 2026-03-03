'use client'

import { useRouter } from 'next/navigation'
import { PostForm } from '@/components/posts/PostForm'
import type { Channel } from '@/types'

interface Props {
  channel: Channel
  spaceSlug: string
}

export function PostFormClient({ channel, spaceSlug }: Props) {
  const router = useRouter()

  return (
    <PostForm
      channel={channel}
      spaceSlug={spaceSlug}
      onCancel={() => router.back()}
    />
  )
}
