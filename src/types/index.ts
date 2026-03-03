// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  uid: string
  email: string
  studentEmail: string
  displayName: string
  avatarUrl?: string
  studentId?: string
  department?: string
  grade?: number // 1-4
  role: UserRole
  isVerified: boolean
  joinedAt: Date
  lastActiveAt: Date
}

export type UserRole = 'student' | 'moderator' | 'admin'

// ─── Space ───────────────────────────────────────────────────────────────────
export interface Space {
  id: string
  name: string
  slug: string
  description: string
  iconEmoji?: string
  coverUrl?: string
  department?: string // null = all departments
  isPublic: boolean
  memberCount: number
  createdBy: string
  createdAt: Date
  channels: Channel[]
}

export interface SpaceMember {
  userId: string
  spaceId: string
  role: SpaceMemberRole
  joinedAt: Date
  notificationsEnabled: boolean
}

export type SpaceMemberRole = 'member' | 'moderator' | 'admin'

// ─── Channel ─────────────────────────────────────────────────────────────────
export interface Channel {
  id: string
  spaceId: string
  name: string
  slug: string
  description: string
  type: ChannelType
  icon: string
  color: ChannelColor
  rules: ChannelRule[]
  postCount: number
  isReadOnly: boolean // moderators only can post
  isPinned: boolean
  createdAt: Date
}

export type ChannelType =
  | 'announcement'  // Duyurular
  | 'academic'      // Akademik destek
  | 'archive'       // PDF/not arşivi
  | 'listing'       // Özel ders & ilan
  | 'suggestion'    // Öneri & istek
  | 'social'        // Sosyal alan

export type ChannelColor =
  | 'amber'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red'
  | 'teal'

export interface ChannelRule {
  id: string
  text: string
}

// ─── Post ────────────────────────────────────────────────────────────────────
export interface Post {
  id: string
  channelId: string
  spaceId: string
  authorId: string
  author: Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'role'>
  title: string
  content: string
  attachments: Attachment[]
  tags: string[]
  isPinned: boolean
  isAnnouncement: boolean
  status: PostStatus
  commentCount: number
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

export type PostStatus = 'published' | 'pending' | 'rejected' | 'archived'

// ─── Attachment ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: string
  postId: string
  name: string
  url: string
  type: AttachmentType
  size: number // bytes
  uploadedBy: string
  uploadedAt: Date
}

export type AttachmentType = 'pdf' | 'image' | 'doc' | 'other'

// ─── Comment ─────────────────────────────────────────────────────────────────
export interface Comment {
  id: string
  postId: string
  parentId?: string // for replies
  authorId: string
  author: Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'role'>
  content: string
  createdAt: Date
  updatedAt: Date
  isEdited: boolean
}

// ─── Notification ────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  isRead: boolean
  createdAt: Date
}

export type NotificationType =
  | 'new_post'
  | 'new_comment'
  | 'mention'
  | 'announcement'
  | 'moderation'
  | 'system'

// ─── UI ──────────────────────────────────────────────────────────────────────
export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}
