// src/types/index.ts
import type { UserType } from '@/lib/departments'

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  uid: string
  email: string
  studentEmail?: string
  displayName: string
  avatarUrl?: string
  username?: string
  usernameChangesLeft?: number
  isListedInDirectory?: boolean
  studentId?: string
  userType?: UserType
  fakulte?: string
  department?: string
  grade?: number | string
  role: UserRole
  isVerified: boolean
  bookmarks?: string[]
  isBanned?: boolean
  banReason?: string
  banUntil?: Date | null
  isMuted?: boolean
  muteUntil?: Date | null
  joinedAt: Date
  lastActiveAt: Date
}

export type UserRole = 'student' | 'moderator' | 'admin'

export interface Space {
  id: string; name: string; slug: string; description: string
  iconEmoji?: string; coverUrl?: string; department?: string
  isPublic: boolean; memberCount: number; createdBy: string
  createdAt: Date; channels: Channel[]
}

export interface SpaceMember {
  userId: string; spaceId: string; role: SpaceMemberRole
  joinedAt: Date; notificationsEnabled: boolean
}

export type SpaceMemberRole = 'member' | 'moderator' | 'admin'

export interface Channel {
  id: string; spaceId: string; name: string; slug: string
  description: string; type: ChannelType; icon: string; color: ChannelColor
  rules: ChannelRule[]; postCount: number; isReadOnly: boolean
  isPinned: boolean; createdAt: Date
}

export type ChannelType = 'announcement' | 'academic' | 'archive' | 'listing' | 'suggestion' | 'social'
export type ChannelColor = 'amber' | 'green' | 'purple' | 'blue' | 'red' | 'teal'
export interface ChannelRule { id: string; text: string }


export interface PollOption {
  id: string
  text: string
  votes: string[]   // uid listesi
}

export interface Poll {
  question: string
  options: PollOption[]
  allowMultiple: boolean          // çoklu seçim
  endsAt: Date | null             // null = süresiz
  showResultsAfterEnd: boolean    // true = sadece bitiş sonrası göster
  isEnded: boolean
}

export interface Post {
  id: string; channelId: string; spaceId: string
  authorId: string; author: Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'role' | 'username'>
  title: string; content: string; attachments: Attachment[]
  tags: string[]; isPinned: boolean; isAnnouncement: boolean
  status: PostStatus; commentCount: number; viewCount: number
  reactions?: Record<string, string[]>
  poll?: Poll
  isEdited?: boolean; editedAt?: Date
  createdAt: Date; updatedAt: Date
}

export type PostStatus = 'published' | 'pending' | 'rejected' | 'archived'

export interface Attachment {
  id: string; postId?: string; commentId?: string
  name: string; url: string; type: AttachmentType
  size: number; uploadedBy: string; uploadedAt: Date
}

export type AttachmentType = 'pdf' | 'image' | 'doc' | 'video' | 'other'

export interface Comment {
  id: string; postId: string; parentId?: string; replyToAuthor?: string
  authorId: string; author: Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'role' | 'username'>
  content: string; reactions?: Record<string, string[]>
  isEdited: boolean; createdAt: Date; updatedAt: Date
}

export interface Notification {
  id: string; userId: string; type: NotificationType
  title: string; body: string; link?: string; isRead: boolean; createdAt: Date
}

export type NotificationType = 'new_post' | 'new_comment' | 'mention' | 'announcement' | 'moderation' | 'system' | 'reaction'

export interface NavItem { label: string; href: string; icon: string; badge?: number }
