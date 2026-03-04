'use client'

import { useRouter } from 'next/navigation'
import { PostForm } from '@/components/posts/PostForm'
import type { Channel } from '@/types'

interface Props {
  channel: Channel
  spaceSlug: string
  spaceId: string
}

export function PostFormClient({ channel, spaceSlug, spaceId }: Props) {
  const router = useRouter()

  return (
    <PostForm
      channel={channel}
      spaceSlug={spaceSlug}
      spaceId={spaceId}
      onCancel={() => router.back()}
    />
  )
}
