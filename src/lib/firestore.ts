import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Space, Post, Notification, Channel, User, Comment } from '@/types'

// ─── Timestamp dönüşümü ───────────────────────────────────────────────────────
function fromTimestamp(ts: any): Date {
  if (!ts) return new Date()
  if (ts instanceof Timestamp) return ts.toDate()
  if (ts?.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

function postFromDoc(d: any): Post {
  const data = d.data()
  return {
    ...data,
    id: d.id,
    createdAt: fromTimestamp(data.createdAt),
    updatedAt: fromTimestamp(data.updatedAt),
    attachments: (data.attachments ?? []).map((a: any) => ({
      ...a,
      uploadedAt: fromTimestamp(a.uploadedAt),
    })),
  } as Post
}

function notifFromDoc(d: any): Notification {
  const data = d.data()
  return { ...data, id: d.id, createdAt: fromTimestamp(data.createdAt) } as Notification
}

function spaceFromDoc(d: any): Space {
  const data = d.data()
  return {
    ...data,
    id: d.id,
    createdAt: fromTimestamp(data.createdAt),
    channels: (data.channels ?? []).map((c: any) => ({
      ...c,
      createdAt: fromTimestamp(c.createdAt),
    })),
  } as Space
}

function userFromDoc(d: any): User {
  const data = d.data()
  return {
    ...data,
    uid: d.id,
    joinedAt: fromTimestamp(data.joinedAt),
    lastActiveAt: fromTimestamp(data.lastActiveAt),
  } as User
}

function commentFromDoc(d: any): Comment {
  const data = d.data()
  return {
    ...data,
    id: d.id,
    createdAt: fromTimestamp(data.createdAt),
    updatedAt: fromTimestamp(data.updatedAt),
  } as Comment
}

// Permission hatalarını konsolda sessizce logla (kullanıcıya gösterme)
function onPermissionError(err: any) {
  if (err?.code === 'permission-denied') {
    // Sessiz — Rules henüz ayarlı değil veya kullanıcı yetkisiz
    return
  }
  console.error('[Firestore]', err)
}

// ─── USER ─────────────────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return userFromDoc(snap)
  } catch (err: any) {
    onPermissionError(err)
    return null
  }
}

export async function updateUserLastActive(uid: string) {
  try {
    await updateDoc(doc(db, 'users', uid), { lastActiveAt: serverTimestamp() })
  } catch { /* sessiz */ }
}

// ─── SPACES ───────────────────────────────────────────────────────────────────
export async function getSpaces(): Promise<Space[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'spaces'), where('isPublic', '==', true), orderBy('memberCount', 'desc'))
    )
    return snap.docs.map(spaceFromDoc)
  } catch (err: any) {
    onPermissionError(err)
    return []
  }
}

export function subscribeToSpaces(
  callback: (spaces: Space[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'spaces'), where('isPublic', '==', true), orderBy('memberCount', 'desc')),
    (snap) => callback(snap.docs.map(spaceFromDoc)),
    (err) => {
      onPermissionError(err)
      onError?.(err)
    }
  )
}

export async function getSpace(spaceId: string): Promise<Space | null> {
  try {
    const snap = await getDoc(doc(db, 'spaces', spaceId))
    if (!snap.exists()) return null
    return spaceFromDoc(snap)
  } catch (err: any) {
    onPermissionError(err)
    return null
  }
}

export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  try {
    const snap = await getDocs(
      query(collection(db, 'spaces'), where('slug', '==', slug), limit(1))
    )
    if (snap.empty) return null
    return spaceFromDoc(snap.docs[0])
  } catch (err: any) {
    onPermissionError(err)
    return null
  }
}

// ─── POSTS ────────────────────────────────────────────────────────────────────
export async function getPosts(channelId: string, limitCount = 20): Promise<Post[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'posts'),
        where('channelId', '==', channelId),
        where('status', '==', 'published'),
        orderBy('isPinned', 'desc'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    )
    return snap.docs.map(postFromDoc)
  } catch (err: any) {
    onPermissionError(err)
    return []
  }
}

export async function getRecentPostsForUser(spaceIds: string[], limitCount = 15): Promise<Post[]> {
  if (spaceIds.length === 0) return []
  try {
    const batch = spaceIds.slice(0, 10)
    const snap = await getDocs(
      query(
        collection(db, 'posts'),
        where('spaceId', 'in', batch),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    )
    return snap.docs.map(postFromDoc)
  } catch (err: any) {
    onPermissionError(err)
    return []
  }
}

export function subscribeToPosts(
  channelId: string,
  callback: (posts: Post[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'posts'),
      where('channelId', '==', channelId),
      where('status', '==', 'published'),
      orderBy('isPinned', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    (snap) => callback(snap.docs.map(postFromDoc)),
    (err) => {
      onPermissionError(err)
      onError?.(err)
    }
  )
}

export async function getPost(postId: string): Promise<Post | null> {
  try {
    const snap = await getDoc(doc(db, 'posts', postId))
    if (!snap.exists()) return null
    return postFromDoc(snap)
  } catch (err: any) {
    onPermissionError(err)
    return null
  }
}

export async function createPost(data: {
  channelId: string
  spaceId: string
  author: Post['author']
  title: string
  content: string
  tags: string[]
  attachments: Post['attachments']
  isAnnouncement: boolean
}): Promise<string> {
  const ref = await addDoc(collection(db, 'posts'), {
    ...data,
    authorId: data.author.uid,
    isPinned: false,
    status: 'published',
    commentCount: 0,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Space'deki channel postCount'u artır (hata olursa post yine de oluştu)
  try {
    const spaceRef = doc(db, 'spaces', data.spaceId)
    const spaceSnap = await getDoc(spaceRef)
    if (spaceSnap.exists()) {
      const channels: Channel[] = spaceSnap.data().channels ?? []
      const updated = channels.map((ch) =>
        ch.id === data.channelId ? { ...ch, postCount: (ch.postCount ?? 0) + 1 } : ch
      )
      await updateDoc(spaceRef, { channels: updated })
    }
  } catch { /* sessiz */ }

  return ref.id
}

export async function incrementViewCount(postId: string) {
  try {
    await updateDoc(doc(db, 'posts', postId), { viewCount: increment(1) })
  } catch { /* sessiz */ }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export function subscribeToNotifications(
  userId: string,
  callback: (notifs: Notification[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    ),
    (snap) => callback(snap.docs.map(notifFromDoc)),
    (err) => {
      onPermissionError(err)
      onError?.(err)
    }
  )
}

export async function markNotificationRead(notifId: string) {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { isRead: true })
  } catch { /* sessiz */ }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      )
    )
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }))
    await batch.commit()
  } catch { /* sessiz */ }
}

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────
export function subscribeToComments(
  postId: string,
  callback: (comments: Comment[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    ),
    (snap) => callback(snap.docs.map(commentFromDoc)),
    (err) => {
      onPermissionError(err)
      onError?.(err)
    }
  )
}

export async function createComment(data: {
  postId: string
  parentId?: string
  author: Comment['author']
  content: string
}): Promise<string> {
  const ref = await addDoc(collection(db, 'comments'), {
    ...data,
    authorId: data.author.uid,
    isEdited: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  try {
    await updateDoc(doc(db, 'posts', data.postId), { commentCount: increment(1) })
  } catch { /* sessiz */ }
  return ref.id
}
