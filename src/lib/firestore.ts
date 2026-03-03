// src/lib/firestore.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// Index gerektiren hataları konsola yaz, geri kalanları sessiz yut
function handleFirestoreError(err: any, label: string) {
  if (err?.code === 'permission-denied') return // sessiz
  if (err?.message?.includes('index')) {
    // Sadece linki göster, stack trace yok
    const link = err.message.match(/https:\/\/\S+/)?.[0] ?? ''
    console.warn(`[Index eksik — ${label}] Oluştur: ${link}`)
    return
  }
  console.error(`[Firestore — ${label}]`, err.message)
}

// ─── USER ─────────────────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return userFromDoc(snap)
  } catch (err) { handleFirestoreError(err, 'getUserProfile'); return null }
}

export async function updateUserLastActive(uid: string) {
  try {
    await updateDoc(doc(db, 'users', uid), { lastActiveAt: serverTimestamp() })
  } catch { /* sessiz */ }
}

export async function updateUserProfile(uid: string, data: Partial<{
  displayName: string; department: string; grade: number | null; avatarUrl: string
}>) {
  await updateDoc(doc(db, 'users', uid), { ...data, lastActiveAt: serverTimestamp() })
}

// ─── SPACES ───────────────────────────────────────────────────────────────────
// ⚠️ Sadece tek where — orderBy YOK → index gerekmez → client-side sort
export function subscribeToSpaces(callback: (spaces: Space[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'spaces'), where('isPublic', '==', true)),
    (snap) => {
      const spaces = snap.docs
        .map(spaceFromDoc)
        .sort((a, b) => b.memberCount - a.memberCount)
      callback(spaces)
    },
    (err) => handleFirestoreError(err, 'subscribeToSpaces')
  )
}

export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  try {
    const snap = await getDocs(
      query(collection(db, 'spaces'), where('slug', '==', slug), limit(1))
    )
    if (snap.empty) return null
    return spaceFromDoc(snap.docs[0])
  } catch (err) { handleFirestoreError(err, 'getSpaceBySlug'); return null }
}

// ─── POSTS ────────────────────────────────────────────────────────────────────
// ⚠️ Sadece tek where — orderBy YOK → client-side filter + sort
export function subscribeToPosts(channelId: string, callback: (posts: Post[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'posts'), where('channelId', '==', channelId), limit(40)),
    (snap) => {
      const posts = snap.docs
        .map(postFromDoc)
        .filter(p => p.status === 'published')
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return b.createdAt.getTime() - a.createdAt.getTime()
        })
      callback(posts)
    },
    (err) => handleFirestoreError(err, 'subscribeToPosts')
  )
}

export async function getRecentPostsForUser(spaceIds: string[], limitCount = 15): Promise<Post[]> {
  if (!spaceIds.length) return []
  try {
    const snap = await getDocs(
      query(collection(db, 'posts'), where('spaceId', 'in', spaceIds.slice(0, 10)), limit(limitCount))
    )
    return snap.docs
      .map(postFromDoc)
      .filter(p => p.status === 'published')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (err) { handleFirestoreError(err, 'getRecentPosts'); return [] }
}

export async function getPost(postId: string): Promise<Post | null> {
  try {
    const snap = await getDoc(doc(db, 'posts', postId))
    if (!snap.exists()) return null
    return postFromDoc(snap)
  } catch (err) { handleFirestoreError(err, 'getPost'); return null }
}

export async function createPost(data: {
  channelId: string; spaceId: string; author: Post['author']
  title: string; content: string; tags: string[]
  attachments: Post['attachments']; isAnnouncement: boolean
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
  try {
    const spaceRef  = doc(db, 'spaces', data.spaceId)
    const spaceSnap = await getDoc(spaceRef)
    if (spaceSnap.exists()) {
      const channels: Channel[] = spaceSnap.data().channels ?? []
      await updateDoc(spaceRef, {
        channels: channels.map(ch =>
          ch.id === data.channelId ? { ...ch, postCount: (ch.postCount ?? 0) + 1 } : ch
        ),
      })
    }
  } catch { /* sessiz */ }
  return ref.id
}

export async function incrementViewCount(postId: string) {
  try {
    await updateDoc(doc(db, 'posts', postId), { viewCount: increment(1) })
  } catch { /* sessiz */ }
}

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────
export async function getBookmarkedPosts(userId: string): Promise<Post[]> {
  try {
    const snap = await getDoc(doc(db, 'users', userId))
    if (!snap.exists()) return []
    const ids: string[] = snap.data().bookmarks ?? []
    if (!ids.length) return []
    const results = await Promise.all(ids.slice(0, 20).map(id => getPost(id)))
    return results.filter(Boolean) as Post[]
  } catch (err) { handleFirestoreError(err, 'getBookmarks'); return [] }
}

export async function toggleBookmark(userId: string, postId: string): Promise<boolean> {
  try {
    const ref       = doc(db, 'users', userId)
    const snap      = await getDoc(ref)
    const bookmarks: string[] = snap.exists() ? (snap.data().bookmarks ?? []) : []
    const has       = bookmarks.includes(postId)
    await updateDoc(ref, {
      bookmarks: has ? bookmarks.filter(id => id !== postId) : [...bookmarks, postId],
    })
    return !has
  } catch (err) { handleFirestoreError(err, 'toggleBookmark'); return false }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
// ⚠️ Sadece tek where — orderBy YOK → client-side sort
export function subscribeToNotifications(userId: string, callback: (notifs: Notification[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', userId), limit(30)),
    (snap) => {
      const notifs = snap.docs
        .map(notifFromDoc)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      callback(notifs)
    },
    (err) => handleFirestoreError(err, 'subscribeToNotifications')
  )
}

export async function markNotificationRead(notifId: string) {
  try { await updateDoc(doc(db, 'notifications', notifId), { isRead: true }) } catch { /* sessiz */ }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const snap = await getDocs(
      query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false))
    )
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }))
    await batch.commit()
  } catch { /* sessiz */ }
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────
// ⚠️ Sadece tek where — orderBy YOK → client-side sort
export function subscribeToComments(postId: string, callback: (comments: Comment[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'comments'), where('postId', '==', postId), limit(50)),
    (snap) => {
      const comments = snap.docs
        .map(commentFromDoc)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      callback(comments)
    },
    (err) => handleFirestoreError(err, 'subscribeToComments')
  )
}

export async function createComment(data: {
  postId: string; parentId?: string; author: Comment['author']; content: string
}): Promise<string> {
  const ref = await addDoc(collection(db, 'comments'), {
    ...data,
    authorId: data.author.uid,
    isEdited: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  try { await updateDoc(doc(db, 'posts', data.postId), { commentCount: increment(1) }) } catch { /* sessiz */ }
  return ref.id
}
