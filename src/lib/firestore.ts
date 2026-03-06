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
  type QueryConstraint,
  type Unsubscribe,
  deleteDoc,
  setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Space, Post, Notification, Channel, User } from '@/types'

// ─── Timestamp dönüşümü ───────────────────────────────────────────────────────
function fromTimestamp(ts: any): Date {
  if (!ts) return new Date()
  if (ts instanceof Timestamp) return ts.toDate()
  if (ts?.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

function postFromDoc(doc: any): Post {
  const d = doc.data()
  return {
    ...d,
    id: doc.id,
    createdAt: fromTimestamp(d.createdAt),
    updatedAt: fromTimestamp(d.updatedAt),
    attachments: (d.attachments ?? []).map((a: any) => ({
      ...a,
      uploadedAt: fromTimestamp(a.uploadedAt),
    })),
  } as Post
}

function notifFromDoc(doc: any): Notification {
  const d = doc.data()
  return {
    ...d,
    id: doc.id,
    createdAt: fromTimestamp(d.createdAt),
  } as Notification
}

function spaceFromDoc(doc: any): Space {
  const d = doc.data()
  return {
    ...d,
    id: doc.id,
    createdAt: fromTimestamp(d.createdAt),
    channels: (d.channels ?? []).map((c: any) => ({
      ...c,
      createdAt: fromTimestamp(c.createdAt),
    })),
  } as Space
}

function userFromDoc(doc: any): User {
  const d = doc.data()
  return {
    ...d,
    uid: doc.id,
    joinedAt: fromTimestamp(d.joinedAt),
    lastActiveAt: fromTimestamp(d.lastActiveAt),
  } as User
}

// ─── USER ─────────────────────────────────────────────────────────────────────


export async function updateUserLastActive(uid: string) {
  await updateDoc(doc(db, 'users', uid), {
    lastActiveAt: serverTimestamp(),
  })
}

// ─── SPACES ───────────────────────────────────────────────────────────────────
export async function getSpaces(): Promise<Space[]> {
  const snap = await getDocs(
    query(collection(db, 'spaces'), where('isPublic', '==', true), orderBy('memberCount', 'desc'))
  )
  return snap.docs.map(spaceFromDoc)
}

export function subscribeToSpaces(callback: (spaces: Space[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'spaces'), where('isPublic', '==', true), orderBy('memberCount', 'desc')),
    (snap) => callback(snap.docs.map(spaceFromDoc))
  )
}

export function subscribeToAllSpaces(callback: (spaces: Space[]) => void): Unsubscribe {
  // Admin/mod için tüm topluluklar (özel dahil)
  return onSnapshot(
    query(collection(db, 'spaces'), orderBy('memberCount', 'desc')),
    (snap) => callback(snap.docs.map(spaceFromDoc))
  )
}

export async function getSpace(spaceId: string): Promise<Space | null> {
  const snap = await getDoc(doc(db, 'spaces', spaceId))
  if (!snap.exists()) return null
  return spaceFromDoc(snap)
}

export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  const snap = await getDocs(
    query(collection(db, 'spaces'), where('slug', '==', slug), limit(1))
  )
  if (snap.empty) return null
  return spaceFromDoc(snap.docs[0])
}

// ─── POSTS ────────────────────────────────────────────────────────────────────
export async function getPosts(channelId: string, limitCount = 20): Promise<Post[]> {
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
}

export async function getRecentPosts(spaceId: string, limitCount = 10): Promise<Post[]> {
  const snap = await getDocs(
    query(
      collection(db, 'posts'),
      where('spaceId', '==', spaceId),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  )
  return snap.docs.map(postFromDoc)
}

export async function getRecentPostsForUser(spaceIds: string[], limitCount = 15): Promise<Post[]> {
  if (spaceIds.length === 0) return []
  // Firestore 'in' max 10 element destekler
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
}

export function subscribeToPosts(
  channelId: string,
  callback: (posts: Post[]) => void
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
    (snap) => callback(snap.docs.map(postFromDoc))
  )
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
}, userProfile?: { isBanned?: boolean; isMuted?: boolean }): Promise<string> {
  // Banned veya muted kullanıcı post atamaz
  if (userProfile?.isBanned) throw new Error('Hesabınız askıya alındığı için paylaşım yapamazsınız.')
  if (userProfile?.isMuted) throw new Error('Hesabınız susturulduğu için paylaşım yapamazsınız.')
  // İçerik limitleri
  if (!data.title.trim()) throw new Error('Başlık boş olamaz.')
  if (data.title.length > 200) throw new Error('Başlık en fazla 200 karakter olabilir.')
  if (data.content.length > 20000) throw new Error('İçerik çok uzun.')
  if (data.tags.length > 10) throw new Error('En fazla 10 etiket eklenebilir.')
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

  // Space'deki channel postCount'u artır
  const spaceRef = doc(db, 'spaces', data.spaceId)
  const spaceSnap = await getDoc(spaceRef)
  if (spaceSnap.exists()) {
    const spaceData = spaceSnap.data()
    const channels: Channel[] = spaceData.channels ?? []
    const updated = channels.map((ch: any) =>
      ch.id === data.channelId ? { ...ch, postCount: (ch.postCount ?? 0) + 1 } : ch
    )
    await updateDoc(spaceRef, { channels: updated })
  }

  return ref.id
}

export async function incrementViewCount(postId: string, uid?: string) {
  const ref  = doc(db, 'posts', postId)
  if (uid) {
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const viewedBy: string[] = snap.data()?.viewedBy ?? []
    if (viewedBy.includes(uid)) return
    await updateDoc(ref, { viewCount: increment(1), viewedBy: [...viewedBy, uid] })
  } else {
    await updateDoc(ref, { viewCount: increment(1) })
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export async function getNotifications(userId: string): Promise<Notification[]> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
  )
  return snap.docs.map(notifFromDoc)
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifs: Notification[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    ),
    (snap) => callback(snap.docs.map(notifFromDoc))
  )
}

export async function markNotificationRead(notifId: string) {
  await updateDoc(doc(db, 'notifications', notifId), { isRead: true })
}

export async function markAllNotificationsRead(userId: string) {
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
}

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────
import type { Comment } from '@/types'

function commentFromDoc(doc: any): Comment {
  const d = doc.data()
  return {
    ...d,
    id: doc.id,
    createdAt: fromTimestamp(d.createdAt),
    updatedAt: fromTimestamp(d.updatedAt),
  } as Comment
}

export async function getComments(postId: string): Promise<Comment[]> {
  const snap = await getDocs(
    query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    )
  )
  return snap.docs.map(commentFromDoc)
}

export function subscribeToComments(
  postId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    ),
    (snap) => callback(snap.docs.map(commentFromDoc))
  )
}

export async function createComment(data: {
  postId: string
  parentId?: string
  replyToAuthor?: string
  author: Comment['author']
  content: string
}, userProfile?: { isBanned?: boolean; isMuted?: boolean }): Promise<string> {
  if (userProfile?.isBanned) throw new Error('Hesabınız askıya alındığı için yorum yapamazsınız.')
  if (userProfile?.isMuted) throw new Error('Hesabınız susturulduğu için yorum yapamazsınız.')
  if (!data.content.trim()) throw new Error('Yorum boş olamaz.')
  if (data.content.length > 5000) throw new Error('Yorum en fazla 5000 karakter olabilir.')
  const ref = await addDoc(collection(db, 'comments'), {
    ...data,
    authorId: data.author.uid,
    isEdited: false,
    reactions: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  // Post'un commentCount'unu artır
  await updateDoc(doc(db, 'posts', data.postId), {
    commentCount: increment(1),
  })
  return ref.id
}

export async function getPost(postId: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  return postFromDoc(snap)
}

// ─── Post güncelleme / silme / arşiv ─────────────────────────────────────────
export async function updatePost(postId: string, data: {
  title?: string; content?: string; tags?: string[]
}): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    ...data, isEdited: true,
    editedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
}

export async function deletePost(postId: string): Promise<void> {
  const postSnap = await getDoc(doc(db, 'posts', postId))
  if (postSnap.exists()) {
    const { spaceId, channelId } = postSnap.data()
    // Önce postCount'u azalt, sonra belgeyı kalıcı sil
    await _decrementChannelPostCount(spaceId, channelId)
  }
  await deleteDoc(doc(db, 'posts', postId))
}

export async function archivePost(postId: string): Promise<void> {
  const postSnap = await getDoc(doc(db, 'posts', postId))
  await updateDoc(doc(db, 'posts', postId), { status: 'archived', updatedAt: serverTimestamp() })
  if (postSnap.exists()) {
    const { spaceId, channelId } = postSnap.data()
    _decrementChannelPostCount(spaceId, channelId)
  }
}

async function _decrementChannelPostCount(spaceId: string, channelId: string): Promise<void> {
  try {
    const spaceRef = doc(db, 'spaces', spaceId)
    const spaceSnap = await getDoc(spaceRef)
    if (!spaceSnap.exists()) return
    const channels: Channel[] = spaceSnap.data().channels ?? []
    const updated = channels.map((ch: any) =>
      ch.id === channelId ? { ...ch, postCount: Math.max(0, (ch.postCount ?? 1) - 1) } : ch
    )
    await updateDoc(spaceRef, { channels: updated })
  } catch {}
}

export async function pinPost(postId: string, isPinned: boolean): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), { isPinned, updatedAt: serverTimestamp() })
}

// ─── Reactions ────────────────────────────────────────────────────────────────
export async function toggleReaction(
  collection_: 'posts' | 'comments',
  docId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const ref = doc(db, collection_, docId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const reactions: Record<string, string[]> = snap.data()?.reactions ?? {}
  const users = reactions[emoji] ?? []
  const already = users.includes(userId)
  await updateDoc(ref, {
    [`reactions.${emoji}`]: already
      ? users.filter(u => u !== userId)
      : [...users, userId],
  })
}

// ─── Yorum düzenleme / silme ─────────────────────────────────────────────────
export async function updateComment(commentId: string, content: string): Promise<void> {
  await updateDoc(doc(db, 'comments', commentId), {
    content, isEdited: true, updatedAt: serverTimestamp(),
  })
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  await updateDoc(doc(db, 'comments', commentId), { content: '[silindi]', updatedAt: serverTimestamp() })
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) })
}

// ─── Bookmark ─────────────────────────────────────────────────────────────────
export async function toggleBookmark(userId: string, postId: string, current: string[]): Promise<void> {
  const already = current.includes(postId)
  await updateDoc(doc(db, 'users', userId), {
    bookmarks: already ? current.filter(id => id !== postId) : [...current, postId],
  })
}


export async function getPostsByUser(uid: string, limitCount = 20): Promise<Post[]> {
  const snap = await getDocs(
    query(collection(db, 'posts'),
      where('authorId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount * 3)
    )
  )
  return snap.docs.map(postFromDoc).filter(p => p.status === 'published').slice(0, limitCount)
}

export async function getUserStats(uid: string): Promise<{ postCount: number; commentCount: number }> {
  const [postsSnap, commentsSnap] = await Promise.all([
    getDocs(query(collection(db, 'posts'), where('authorId', '==', uid))),
    getDocs(query(collection(db, 'comments'), where('authorId', '==', uid))),
  ])
  const postCount = postsSnap.docs.filter(d => d.data().status === 'published').length
  return { postCount, commentCount: commentsSnap.size }
}


// ─── Username Sistemi ─────────────────────────────────────────────────────────
export async function isUsernameTaken(username: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('username', '==', username.toLowerCase()), limit(1))
  )
  return !snap.empty
}

export async function setUsername(uid: string, username: string, currentUsername?: string): Promise<void> {
  const normalized = username.toLowerCase()
  // Başkası kullanıyor mu?
  const snap = await getDocs(
    query(collection(db, 'users'), where('username', '==', normalized), limit(1))
  )
  if (!snap.empty && snap.docs[0].id !== uid) {
    throw new Error('Bu kullanıcı adı zaten alınmış.')
  }
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) throw new Error('Kullanıcı bulunamadı.')
  const userData = userSnap.data()
  const changesLeft = userData.usernameChangesLeft ?? 2
  // İlk kez atanıyorsa (kayıt sonrası) hak düşmez
  const isFirstTime = !userData.username
  if (!isFirstTime && changesLeft <= 0) {
    throw new Error('Kullanıcı adı değiştirme hakkınız kalmadı.')
  }
  await updateDoc(userRef, {
    username: normalized,
    usernameChangesLeft: isFirstTime ? 2 : changesLeft - 1,
    updatedAt: serverTimestamp(),
  })

  // Tüm postlardaki author.username güncelle (batch)
  try {
    const { writeBatch, getDocs: _getDocs, query: _query, collection: _col, where: _where } = await import('firebase/firestore')
    const postsSnap = await _getDocs(_query(_col(db, 'posts'), _where('authorId', '==', uid)))
    if (!postsSnap.empty) {
      const batch = writeBatch(db)
      postsSnap.docs.forEach(d => {
        batch.update(d.ref, { 'author.username': normalized })
      })
      await batch.commit()
    }
  } catch (e) { console.warn('[setUsername] post güncelleme hatası', e) }
}

export async function getArchivedPosts(uid: string): Promise<Post[]> {
  // composite index gerektirmemek için status filtresi client'ta yapılıyor
  const snap = await getDocs(
    query(collection(db, 'posts'),
      where('authorId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(200)
    )
  )
  return snap.docs.map(postFromDoc).filter(p => p.status === 'archived')
}

export async function restorePost(postId: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), { status: 'published', updatedAt: serverTimestamp() })
}



export async function getListedUsers(limitCount = 100): Promise<User[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('isListedInDirectory', '==', true),
      limit(limitCount)
    )
  )
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      uid: d.id,
      joinedAt:     data.joinedAt?.toDate?.()     ?? new Date(),
      lastActiveAt: data.lastActiveAt?.toDate?.() ?? new Date(),
      banUntil:     data.banUntil?.toDate?.()     ?? null,
      muteUntil:    data.muteUntil?.toDate?.()    ?? null,
    } as User
  })
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('username', '==', username.toLowerCase()), limit(1))
  )
  if (snap.empty) return null
  const d = snap.docs[0].data()
  return {
    ...d,
    uid: snap.docs[0].id,
    joinedAt:     d.joinedAt?.toDate?.()     ?? new Date(),
    lastActiveAt: d.lastActiveAt?.toDate?.() ?? new Date(),
    banUntil:     d.banUntil?.toDate?.()     ?? null,
    muteUntil:    d.muteUntil?.toDate?.()    ?? null,
  } as User
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    ...d,
    uid: snap.id,
    joinedAt: d.joinedAt?.toDate?.() ?? new Date(),
    lastActiveAt: d.lastActiveAt?.toDate?.() ?? new Date(),
    banUntil: d.banUntil?.toDate?.() ?? null,
    muteUntil: d.muteUntil?.toDate?.() ?? null,
  } as User
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  // Kritik alanların kullanıcı tarafından değiştirilmesini engelle
  const PROTECTED_FIELDS = ['role', 'isBanned', 'isMuted', 'banReason', 'muteReason', 'banUntil', 'muteUntil', 'uid', 'email']
  const safe = Object.fromEntries(
    Object.entries(data).filter(([key]) => !PROTECTED_FIELDS.includes(key))
  )
  await updateDoc(doc(db, 'users', uid), { ...safe, updatedAt: serverTimestamp() })
}

// ─── Admin: Ban / Mute / Moderatör ───────────────────────────────────────────
export async function banUser(targetUid: string, reason: string, until: Date | null): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isBanned: true, banReason: reason,
    banUntil: until ?? null,
  })
}

export async function unbanUser(targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isBanned: false, banReason: '', banUntil: null,
  })
}

export async function muteUser(targetUid: string, reason: string, until: Date | null): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isMuted: true, muteReason: reason, muteUntil: until ?? null,
  })
}

export async function unmuteUser(targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isMuted: false, muteReason: '', muteUntil: null,
  })
}

export async function setUserRole(targetUid: string, role: import('@/types').UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { role })
}


// ─── Öğretmen Onay Sistemi ────────────────────────────────────────────────────
export async function submitTeacherApproval(data: {
  uid: string; email: string; displayName: string; department: string; fakulte: string
}): Promise<void> {
  await setDoc(doc(db, 'teacherApprovals', data.uid), {
    ...data,
    status:    'pending',
    createdAt: serverTimestamp(),
  })
}

export async function getPendingTeachers(): Promise<any[]> {
  const snap = await getDocs(
    query(collection(db, 'teacherApprovals'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function approveTeacher(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { userType: 'ogretmen', teacherApproved: true })
  await updateDoc(doc(db, 'teacherApprovals', uid), { status: 'approved', resolvedAt: serverTimestamp() })
}

export async function rejectTeacher(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { userType: 'lisans', teacherApproved: false })
  await updateDoc(doc(db, 'teacherApprovals', uid), { status: 'rejected', resolvedAt: serverTimestamp() })
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({
    ...d.data(), uid: d.id,
    joinedAt: d.data().joinedAt?.toDate?.() ?? new Date(),
    lastActiveAt: d.data().lastActiveAt?.toDate?.() ?? new Date(),
    banUntil: d.data().banUntil?.toDate?.() ?? null,
    muteUntil: d.data().muteUntil?.toDate?.() ?? null,
  })) as import('@/types').User[]
}

export async function getAllPosts(): Promise<Post[]> {
  const snap = await getDocs(query(collection(db, 'posts'), limit(200)))
  return snap.docs.map(postFromDoc)
}

export async function hardDeletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── SPACE YÖNETİMİ ───────────────────────────────────────────────────────────

export async function deleteSpace(spaceId: string): Promise<void> {
  // Önce bu space'e ait postları sil
  const postsSnap = await getDocs(query(collection(db, 'posts'), where('spaceId', '==', spaceId)))
  const batch = writeBatch(db)
  postsSnap.docs.forEach(d => batch.delete(d.ref))
  // Sonra space'i sil
  batch.delete(doc(db, 'spaces', spaceId))
  await batch.commit()
}

export async function updateSpace(spaceId: string, data: {
  name?: string
  description?: string
  iconEmoji?: string
  isPublic?: boolean
  department?: string
}): Promise<void> {
  // Güvenli alanlar - slug ve channels değiştirilemez bu fonksiyonla
  const safe = {
    ...(data.name        !== undefined && { name: data.name.trim() }),
    ...(data.description !== undefined && { description: data.description.trim() }),
    ...(data.iconEmoji   !== undefined && { iconEmoji: data.iconEmoji }),
    ...(data.isPublic    !== undefined && { isPublic: data.isPublic }),
    ...(data.department  !== undefined && { department: data.department.trim() }),
    updatedAt: serverTimestamp(),
  }
  await updateDoc(doc(db, 'spaces', spaceId), safe)
}

export async function updateChannel(
  spaceId: string,
  channelId: string,
  data: { name?: string; description?: string; icon?: string; color?: string; warningText?: string }
): Promise<void> {
  const spaceRef = doc(db, 'spaces', spaceId)
  const snap = await getDoc(spaceRef)
  if (!snap.exists()) return
  const channels = snap.data().channels ?? []
  const updated = channels.map((ch: any) =>
    ch.id === channelId
      ? {
          ...ch,
          ...(data.name        && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() }),
          ...(data.icon        !== undefined && { icon: data.icon }),
          ...(data.color       !== undefined && { color: data.color }),
          ...(data.warningText !== undefined && { warningText: data.warningText }),
        }
      : ch
  )
  await updateDoc(spaceRef, { channels: updated, updatedAt: serverTimestamp() })
}

export async function addChannel(spaceId: string, data: {
  name: string; description?: string; type: string
  icon: string; color: string; warningText?: string
}): Promise<void> {
  const spaceRef = doc(db, 'spaces', spaceId)
  const snap = await getDoc(spaceRef)
  if (!snap.exists()) return
  const slug = data.name.toLowerCase().trim()
    .replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o')
    .replace(/ş/g,'s').replace(/ü/g,'u').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
  const newChannel = {
    id: `${spaceId}-${slug}-${Date.now()}`,
    spaceId,
    name: data.name.trim(),
    slug,
    description: data.description?.trim() ?? '',
    type: data.type,
    icon: data.icon,
    color: data.color,
    warningText: data.warningText ?? '',
    postCount: 0,
    isReadOnly: data.type === 'announcement',
    isPinned: false,
    rules: [],
    createdAt: new Date(),
  }
  const channels = [...(snap.data().channels ?? []), newChannel]
  await updateDoc(spaceRef, { channels, updatedAt: serverTimestamp() })
}

export async function deleteChannel(spaceId: string, channelId: string): Promise<void> {
  const spaceRef = doc(db, 'spaces', spaceId)
  const snap = await getDoc(spaceRef)
  if (!snap.exists()) return
  const channels = (snap.data().channels ?? []).filter((ch: any) => ch.id !== channelId)
  await updateDoc(spaceRef, { channels, updatedAt: serverTimestamp() })
}

export async function getChannelPostCount(channelId: string): Promise<number> {
  const snap = await getDocs(query(
    collection(db, 'posts'),
    where('channelId', '==', channelId),
    where('status', '==', 'published')
  ))
  return snap.size
}

export async function getAllDocumentPosts(limitCount = 50): Promise<Post[]> {
  const snap = await getDocs(query(
    collection(db, 'posts'),
    where('channelType', '==', 'archive'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ))
  return snap.docs.map(postFromDoc)
}

export async function createSpace(data: {
  name: string
  description: string
  iconEmoji: string
  isPublic: boolean
  department?: string
  createdBy: string
}): Promise<string> {
  const slug = data.name
    .toLowerCase()
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i')
    .replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const defaultChannels = [
    { id: `${slug}-ann`,  name: 'duyurular',      slug: 'duyurular',      type: 'announcement', icon: '📣', color: 'amber',  postCount: 0, isReadOnly: true,  isPinned: true,  rules: [], createdAt: new Date() },
    { id: `${slug}-ac`,   name: 'akademik-destek', slug: 'akademik-destek', type: 'academic',     icon: '📚', color: 'green',  postCount: 0, isReadOnly: false, isPinned: false, rules: [], createdAt: new Date() },
    { id: `${slug}-arc`,  name: 'kaynak-arsivi',   slug: 'kaynak-arsivi',   type: 'archive',      icon: '🗂️', color: 'purple', postCount: 0, isReadOnly: false, isPinned: false, rules: [], createdAt: new Date() },
    { id: `${slug}-soc`,  name: 'sosyal-alan',     slug: 'sosyal-alan',     type: 'social',       icon: '🎉', color: 'blue',   postCount: 0, isReadOnly: false, isPinned: false, rules: [], createdAt: new Date() },
    { id: `${slug}-sug`,  name: 'oneri-kutusu',    slug: 'oneri-kutusu',    type: 'suggestion',   icon: '💡', color: 'teal',   postCount: 0, isReadOnly: false, isPinned: false, rules: [], createdAt: new Date() },
    { id: `${slug}-list`, name: 'ilan-panosu',     slug: 'ilan-panosu',     type: 'listing',      icon: '📌', color: 'red',    postCount: 0, isReadOnly: false, isPinned: false, rules: [], createdAt: new Date() },
  ]

  const ref = await addDoc(collection(db, 'spaces'), {
    name:        data.name,
    slug,
    description: data.description,
    iconEmoji:   data.iconEmoji,
    isPublic:    data.isPublic,
    department:  data.department ?? '',
    memberCount: 0,
    createdBy:   data.createdBy,
    channels:    defaultChannels,
    createdAt:   serverTimestamp(),
  })

  // spaceId'yi kanallara ekle (ref.id artık biliniyor)
  const channelsWithSpaceId = defaultChannels.map(ch => ({ ...ch, spaceId: ref.id }))
  await updateDoc(ref, { channels: channelsWithSpaceId })

  return ref.id
}

export async function getBookmarkedPosts(postIds: string[]): Promise<Post[]> {
  if (!postIds || postIds.length === 0) return []
  const results = await Promise.all(postIds.map(id => getDoc(doc(db, 'posts', id))))
  return results.filter(s => s.exists()).map(postFromDoc)
}
