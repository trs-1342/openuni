import {
  collection,
  collectionGroup,
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
  const post: any = {
    ...d,
    id: doc.id,
    createdAt: fromTimestamp(d.createdAt),
    updatedAt: fromTimestamp(d.updatedAt),
    attachments: (d.attachments ?? []).map((a: any) => ({
      ...a,
      uploadedAt: fromTimestamp(a.uploadedAt),
    })),
  }
  if (post.poll?.endsAt?.toDate) {
    post.poll = { ...post.poll, endsAt: post.poll.endsAt.toDate() }
  } else if (post.poll?.endsAt && typeof post.poll.endsAt === 'object' && 'seconds' in post.poll.endsAt) {
    post.poll = { ...post.poll, endsAt: new Date(post.poll.endsAt.seconds * 1000) }
  }
  return post as Post
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

// ─── Hassas iletişim verisi (email, studentId) — users/{uid}/private/contact ──
// KVKK: bu alanlar ana kullanıcı dokümanından ayrı, yalnızca sahip+mod erişimli
// alt-dokümanda tutulur. (Kurallar: users/{userId}/private/{docId})
const PRIVATE_DOC = 'contact'

export interface UserPrivateData { email?: string | null; studentId?: string | null }

export async function getUserPrivateData(uid: string): Promise<UserPrivateData> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', PRIVATE_DOC))
    return snap.exists() ? (snap.data() as UserPrivateData) : {}
  } catch {
    return {}
  }
}

export async function setUserPrivateData(uid: string, data: UserPrivateData): Promise<void> {
  const clean: Record<string, any> = {}
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined) clean[k] = v })
  await setDoc(doc(db, 'users', uid, 'private', PRIVATE_DOC), clean, { merge: true })
}

// Admin/moderatör: tüm kullanıcıların hassas verisini tek seferde çeker (collection group).
// Kurallar yalnızca moderatöre tüm private dokümanları okutur.
async function getAllPrivateData(): Promise<Record<string, UserPrivateData>> {
  const map: Record<string, UserPrivateData> = {}
  try {
    const snap = await getDocs(collectionGroup(db, 'private'))
    snap.docs.forEach(d => {
      // path: users/{uid}/private/contact → parent.parent.id == uid
      const uid = d.ref.parent.parent?.id
      if (uid) map[uid] = d.data() as UserPrivateData
    })
  } catch { /* mod değilse sessizce boş döner */ }
  return map
}

// ─── INVITES (davet) ────────────────────────────────────────────────────────
export interface Invite {
  code: string; createdBy: string; createdByName?: string
  spaceId?: string; spaceName?: string
  uses: number; maxUses: number  // maxUses 0 = sınırsız
  expiresAt?: Date | null; createdAt: Date
}

function genInviteCode(): string {
  // Karışık olmayan, okunaklı kod (8 karakter)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function createInvite(data: {
  createdBy: string; createdByName?: string
  spaceId?: string; spaceName?: string
  maxUses?: number; expiresInDays?: number
}): Promise<string> {
  const code = genInviteCode()
  const payload: Record<string, any> = {
    code, createdBy: data.createdBy, createdByName: data.createdByName ?? '',
    uses: 0, maxUses: data.maxUses ?? 0,
    createdAt: serverTimestamp(),
  }
  if (data.spaceId)   payload.spaceId   = data.spaceId
  if (data.spaceName) payload.spaceName = data.spaceName
  if (data.expiresInDays && data.expiresInDays > 0) {
    payload.expiresAt = Timestamp.fromDate(new Date(Date.now() + data.expiresInDays * 86400_000))
  }
  await setDoc(doc(db, 'invites', code), payload)
  return code
}

export async function getMyInvites(uid: string): Promise<Invite[]> {
  const snap = await getDocs(query(collection(db, 'invites'), where('createdBy', '==', uid)))
  return snap.docs.map(d => {
    const x = d.data()
    return {
      ...x, code: d.id,
      expiresAt: x.expiresAt?.toDate?.() ?? null,
      createdAt: x.createdAt?.toDate?.() ?? new Date(),
    } as Invite
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getInvite(code: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, 'invites', code.toLowerCase().trim()))
  if (!snap.exists()) return null
  const x = snap.data()
  return { ...x, code: snap.id, expiresAt: x.expiresAt?.toDate?.() ?? null, createdAt: x.createdAt?.toDate?.() ?? new Date() } as Invite
}

export async function deleteInvite(code: string): Promise<void> {
  await deleteDoc(doc(db, 'invites', code))
}

// ─── MEMBERSHIPS (topluluk üyeliği) ────────────────────────────────────────────
function membershipId(uid: string, spaceId: string) { return `${uid}_${spaceId}` }

export interface MemberSnapshot { displayName?: string; username?: string; avatarUrl?: string }

export async function joinSpace(uid: string, spaceId: string, snapshot: MemberSnapshot = {}): Promise<void> {
  const ref = doc(db, 'memberships', membershipId(uid, spaceId))
  // Zaten üyeyse sayaç tekrar artmasın (çift-tık/yarış koruması)
  if ((await getDoc(ref)).exists()) return
  // Snapshot: topluluk sahibi, üye "görünmek istemiyorum" dese bile adını görebilsin (Y2)
  const clean: Record<string, any> = { uid, spaceId, joinedAt: serverTimestamp() }
  if (snapshot.displayName) clean.displayName = snapshot.displayName
  if (snapshot.username)    clean.username    = snapshot.username
  if (snapshot.avatarUrl)   clean.avatarUrl   = snapshot.avatarUrl
  await setDoc(ref, clean)
  try { await updateDoc(doc(db, 'spaces', spaceId), { memberCount: increment(1) }) } catch {}
}

export async function leaveSpace(uid: string, spaceId: string): Promise<void> {
  const ref = doc(db, 'memberships', membershipId(uid, spaceId))
  // Üye değilse sayaç eksilmesin
  if (!(await getDoc(ref)).exists()) return
  await deleteDoc(ref)
  try { await updateDoc(doc(db, 'spaces', spaceId), { memberCount: increment(-1) }) } catch {}
}

// Kullanıcının katıldığı topluluk id'lerini canlı dinler
export function subscribeToMyMemberships(uid: string, callback: (spaceIds: string[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'memberships'), where('uid', '==', uid)),
    (snap) => callback(snap.docs.map(d => d.data().spaceId as string)),
    (err) => console.error('[subscribeToMyMemberships]', err.code, err.message)
  )
}

// Bir topluluğun üye uid'leri
export async function getSpaceMemberIds(spaceId: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'memberships'), where('spaceId', '==', spaceId)))
  return snap.docs.map(d => d.data().uid as string)
}

// Topluluk üyeleri (snapshot ile) — topluluk sahibi/mod görebilir; gizli üyeler de listelenir.
export interface SpaceMemberRow { uid: string; displayName?: string; username?: string; avatarUrl?: string; joinedAt: Date }
export async function getSpaceMembers(spaceId: string): Promise<SpaceMemberRow[]> {
  const snap = await getDocs(query(collection(db, 'memberships'), where('spaceId', '==', spaceId)))
  return snap.docs.map(d => {
    const x = d.data()
    return {
      uid: x.uid, displayName: x.displayName, username: x.username, avatarUrl: x.avatarUrl,
      joinedAt: x.joinedAt?.toDate?.() ?? new Date(),
    }
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
    (snap) => callback(snap.docs.map(spaceFromDoc)),
    (err) => console.error('[subscribeToSpaces]', err.code, err.message)
  )
}

export function subscribeToAllSpaces(callback: (spaces: Space[]) => void): Unsubscribe {
  // Admin/mod için tüm topluluklar (özel dahil)
  return onSnapshot(
    query(collection(db, 'spaces'), orderBy('memberCount', 'desc')),
    (snap) => callback(snap.docs.map(spaceFromDoc)),
    (err) => console.error('[subscribeToAllSpaces]', err.code, err.message)
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
    (snap) => callback(snap.docs.map(postFromDoc)),
    (err) => console.error('[subscribeToPosts]', err.code, err.message)
  )
}

export async function createPost(data_input: {
  channelId: string
  spaceId: string
  author: Post['author']
  title: string
  content: string
  tags: string[]
  attachments: Post['attachments']
  isAnnouncement: boolean
  postKind?: Post['postKind']
  poll?: Post['poll']
}, userProfile?: { isBanned?: boolean; isMuted?: boolean }): Promise<string> {
  let data = data_input
  // Banned veya muted kullanıcı post atamaz
  if (userProfile?.isBanned) throw new Error('Hesabınız askıya alındığı için paylaşım yapamazsınız.')
  if (userProfile?.isMuted) throw new Error('Hesabınız susturulduğu için paylaşım yapamazsınız.')
  if ((userProfile as any)?.isAdminVerified === false) throw new Error('Hesabınız henüz admin tarafından onaylanmadı. Onaylandıktan sonra paylaşım yapabilirsiniz.')
  // İçerik limitleri
  if (!data.title.trim()) throw new Error('Başlık boş olamaz.')
  if (data.title.length > 200) throw new Error('Başlık en fazla 200 karakter olabilir.')
  if (data.content.length > 20000) throw new Error('İçerik çok uzun.')
  if (data.tags.length > 10) throw new Error('En fazla 10 etiket eklenebilir.')
  // author.role ve userType'ı Firestore'dan fresh oku — post oluşturulurken stale profile'dan gelmesin
  try {
    const userSnap = await getDoc(doc(db, 'users', data.author.uid))
    if (userSnap.exists()) {
      const userData = userSnap.data()
      const freshRole = userData.role
      const freshUserType = userData.userType
      if (freshRole) data = { ...data, author: { ...data.author, role: freshRole } }
      if (freshUserType) data = { ...data, author: { ...data.author, userType: freshUserType } as any }
    }
  } catch { /* role fetch başarısız olursa mevcut değeri kullan */ }

  // author'dan null/undefined alanları temizle (Firestore undefined kabul etmez)
  const cleanAuthor: Record<string, any> = {}
  Object.entries(data.author).forEach(([k, v]) => { if (v !== undefined) cleanAuthor[k] = v })

  // data'dan undefined olan alanları temizle (özellikle poll olmadığında)
  const postData: Record<string, any> = {
    channelId:      data.channelId,
    spaceId:        data.spaceId,
    author:         cleanAuthor,
    authorId:       data.author.uid,
    title:          data.title,
    content:        data.content,
    tags:           data.tags,
    attachments:    data.attachments,
    isAnnouncement: data.isAnnouncement,
    postKind:       data.postKind ?? 'sosyal',
    isPinned:       false,
    status:         'published',
    commentCount:   0,
    viewCount:      0,
    viewedBy:       [],
    createdAt:      serverTimestamp(),
    updatedAt:      serverTimestamp(),
  }
  if (data.poll) postData.poll = data.poll

  const ref = await addDoc(collection(db, 'posts'), postData)

  // Space'deki channel postCount'u artır.
  // Okuma (getDoc) onaylı kullanıcıya açıktır; YALNIZCA yazma (updateDoc) korunur.
  // NOT: spaces güncellemesi yalnızca moderatör/topluluk-sahibine açıktır (kurallar);
  // normal yazar için bu yazım reddedilir. postCount KOZMETİKtir — reddedilirse
  // post oluşturma akışı KESİLMEMELİ (try/catch ile yutulur; _decrementChannelPostCount
  // ile aynı desen). Aksi halde sıkı kurallar deploy edilince normal kullanıcı post atamaz.
  const spaceRef = doc(db, 'spaces', data.spaceId)
  const spaceSnap = await getDoc(spaceRef)
  if (spaceSnap.exists()) {
    const spaceData = spaceSnap.data()
    const channels: Channel[] = spaceData.channels ?? []
    const updated = channels.map((ch: any) =>
      ch.id === data.channelId ? { ...ch, postCount: (ch.postCount ?? 0) + 1 } : ch
    )
    try { await updateDoc(spaceRef, { channels: updated }) }
    catch { /* postCount kozmetik — yetki yoksa sessizce geç */ }
  }

  // Kullanıcıya post email bildirimi — emailPostNotify açıksa gönder (fire & forget)
  try {
    const authorSnap = await getDoc(doc(db, 'users', data.author.uid))
    if (authorSnap.exists()) {
      const u = authorSnap.data()
      // e-posta API'de doğrulanmış token'dan alınır; burada yalnızca tercih kontrol edilir
      if (u.emailPostNotify === true) {
        const channelName = (spaceSnap.exists()
          ? (spaceSnap.data().channels ?? []).find((ch: any) => ch.id === data.channelId)?.name
          : '') ?? ''
        const spaceName = spaceSnap.exists() ? spaceSnap.data().name : ''
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'
        // Auth token ekle — sunucu alıcıyı token'dan belirler (açık relay engeli)
        const { auth } = await import('./firebase')
        const idToken = await auth.currentUser?.getIdToken().catch(() => null)
        if (idToken) {
          fetch('/api/send-post-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              displayName: u.displayName,
              postTitle: data.title, postContent: data.content,
              postUrl: `${appUrl}/dashboard/spaces/${data.spaceId}/${data.channelId}/${ref.id}`,
              channelName, spaceName,
            }),
          }).catch(() => {})
        }
      }
    }
  } catch { /* email hatası kritik değil */ }

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
    (snap) => callback(snap.docs.map(notifFromDoc)),
    (err) => console.error('[subscribeToNotifications]', err.code, err.message)
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
    (snap) => callback(snap.docs.map(commentFromDoc)),
    (err) => console.error('[subscribeToComments]', err.code, err.message)
  )
}

export async function createComment(data_input: {
  postId: string
  parentId?: string
  replyToAuthor?: string
  author: Comment['author']
  content: string
}, userProfile?: { isBanned?: boolean; isMuted?: boolean }): Promise<string> {
  let data = data_input
  if (userProfile?.isBanned) throw new Error('Hesabınız askıya alındığı için yorum yapamazsınız.')
  if (userProfile?.isMuted) throw new Error('Hesabınız susturulduğu için yorum yapamazsınız.')
  if ((userProfile as any)?.isAdminVerified === false) throw new Error('Hesabınız henüz onaylanmadı.')
  if (!data.content.trim()) throw new Error('Yorum boş olamaz.')
  if (data.content.length > 5000) throw new Error('Yorum en fazla 5000 karakter olabilir.')
  // author.role ve userType'ı Firestore'dan fresh oku
  try {
    const userSnap = await getDoc(doc(db, 'users', data.author.uid))
    if (userSnap.exists()) {
      const userData = userSnap.data()
      const freshRole = userData.role
      const freshUserType = userData.userType
      if (freshRole) data = { ...data, author: { ...data.author, role: freshRole } }
      if (freshUserType) data = { ...data, author: { ...data.author, userType: freshUserType } as any }
    }
  } catch { /* mevcut değeri kullan */ }

  // author'dan undefined alanları temizle
  const cleanCommentAuthor: Record<string, any> = {}
  Object.entries(data.author).forEach(([k, v]) => { if (v !== undefined) cleanCommentAuthor[k] = v })

  const ref = await addDoc(collection(db, 'comments'), {
    ...data,
    author: cleanCommentAuthor,
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

// Bir posta ait tüm yorumları siler (yetim yorum birikmesini önler)
async function _deleteCommentsForPost(postId: string): Promise<void> {
  try {
    const commentsSnap = await getDocs(query(collection(db, 'comments'), where('postId', '==', postId)))
    if (commentsSnap.empty) return
    let batch = writeBatch(db)
    let count = 0
    for (const c of commentsSnap.docs) {
      batch.delete(c.ref)
      count++
      if (count >= 490) { await batch.commit(); batch = writeBatch(db); count = 0 }
    }
    if (count > 0) await batch.commit()
  } catch (e) { console.warn('[deletePost] yorum temizleme hatası:', e) }
}

export async function deletePost(postId: string): Promise<void> {
  const postSnap = await getDoc(doc(db, 'posts', postId))
  if (postSnap.exists()) {
    const { spaceId, channelId } = postSnap.data()
    // Önce postCount'u azalt, sonra belgeyı kalıcı sil
    await _decrementChannelPostCount(spaceId, channelId)
  }
  await _deleteCommentsForPost(postId)
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
// Y-1 (denetim): username KALICIDIR (Firestore kuralı zorlar). Eski setUsername /
// applyNormalizedUsername istemci yolları kaldırıldı; format migrasyonu ve
// benzersizlik artık sunucudadır (/api/normalize-username, /api/check-username).

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



// KVKK: başka kullanıcıların listelendiği/profilinin görüntülendiği yollarda
// hassas alanlar (e-posta, öğrenci no) istemciye gönderilmez.
// NOT: tam koruma için bu alanlar kısıtlı bir alt-koleksiyona taşınmalı (rapora bk.).
function stripSensitive<T extends Record<string, any>>(u: T): T {
  const { email, studentId, ...rest } = u
  return rest as T
}

export async function getListedUsers(limitCount = 100): Promise<User[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('isListedInDirectory', '==', true),
      where('isAdminVerified', '==', true),
      limit(limitCount)
    )
  )
  return snap.docs.map(d => {
    const data = d.data()
    return stripSensitive({
      ...data,
      uid: d.id,
      joinedAt:     data.joinedAt?.toDate?.()     ?? new Date(),
      lastActiveAt: data.lastActiveAt?.toDate?.() ?? new Date(),
      banUntil:     data.banUntil?.toDate?.()     ?? null,
      muteUntil:    data.muteUntil?.toDate?.()    ?? null,
    }) as User
  })
}

// includeUnlisted: yalnızca moderatör/admin true geçmeli (kurallar gereği listede
// olmayan dokümanları yalnızca mod okuyabilir; aksi halde sorgu reddedilir).
export async function getUserByUsername(username: string, includeUnlisted = false): Promise<User | null> {
  const constraints = [where('username', '==', username.toLowerCase())]
  // GİZLİLİK: normal kullanıcılar yalnızca listede görünenleri bulabilir (enumerasyon engeli)
  if (!includeUnlisted) constraints.push(where('isListedInDirectory', '==', true))
  const snap = await getDocs(query(collection(db, 'users'), ...constraints, limit(1)))
  if (snap.empty) return null
  const d = snap.docs[0].data()
  return stripSensitive({
    ...d,
    uid: snap.docs[0].id,
    joinedAt:     d.joinedAt?.toDate?.()     ?? new Date(),
    lastActiveAt: d.lastActiveAt?.toDate?.() ?? new Date(),
    banUntil:     d.banUntil?.toDate?.()     ?? null,
    muteUntil:    d.muteUntil?.toDate?.()    ?? null,
  }) as User
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
  const PROTECTED_FIELDS = ['role', 'isBanned', 'isMuted', 'banReason', 'muteReason', 'banUntil', 'muteUntil', 'uid', 'email', 'isAdminVerified']
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
  writeSystemLog({ level: 'warn', event: 'mod.ban', source: 'admin',
    message: `Kullanıcı engellendi (${targetUid})`, details: { targetUid, reason, until: until?.toISOString() ?? 'süresiz' } })
}

export async function adminVerifyUser(targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { isAdminVerified: true })
  writeSystemLog({ level: 'info', event: 'mod.verify', source: 'admin',
    message: `Kullanıcı onaylandı (${targetUid})`, details: { targetUid } })
}

export async function adminUnverifyUser(targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { isAdminVerified: false })
  writeSystemLog({ level: 'warn', event: 'mod.unverify', source: 'admin',
    message: `Kullanıcı onayı kaldırıldı (${targetUid})`, details: { targetUid } })
}

export async function unbanUser(targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isBanned: false, banReason: '', banUntil: null,
  })
  writeSystemLog({ level: 'info', event: 'mod.unban', source: 'admin',
    message: `Kullanıcının engeli kaldırıldı (${targetUid})`, details: { targetUid } })
}

export async function muteUser(targetUid: string, reason: string, until: Date | null): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isMuted: true, muteReason: reason, muteUntil: until ?? null,
  })
  writeSystemLog({ level: 'warn', event: 'mod.mute', source: 'admin',
    message: `Kullanıcı susturuldu (${targetUid})`, details: { targetUid, reason, until: until?.toISOString() ?? 'süresiz' } })
}

export async function unmuteUser(targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), {
    isMuted: false, muteReason: '', muteUntil: null,
  })
  writeSystemLog({ level: 'info', event: 'mod.unmute', source: 'admin',
    message: `Kullanıcının susturması kaldırıldı (${targetUid})`, details: { targetUid } })
}

export async function setUserRole(targetUid: string, role: import('@/types').UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { role })
}

// ─── Yetki (capability) atama ─────────────────────────────────────────────────
// Yalnızca owner / manageUsers yetkisi olan çağırabilir (Firestore kuralları zorlar).
export async function setUserCapabilities(targetUid: string, capabilities: string[]): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { capabilities })
}

export async function grantCapability(targetUid: string, cap: string, current: string[] = []): Promise<void> {
  if (current.includes(cap)) return
  await updateDoc(doc(db, 'users', targetUid), { capabilities: [...current, cap] })
  writeSystemLog({ level: 'warn', event: 'mod.capability_grant', source: 'admin',
    message: `Yetki verildi: ${cap} (${targetUid})`, details: { targetUid, cap } })
}

export async function revokeCapability(targetUid: string, cap: string, current: string[] = []): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { capabilities: current.filter(c => c !== cap) })
  writeSystemLog({ level: 'warn', event: 'mod.capability_revoke', source: 'admin',
    message: `Yetki kaldırıldı: ${cap} (${targetUid})`, details: { targetUid, cap } })
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
  // Onay aynı zamanda erişim verir (isAdminVerified) — onaylı hoca platforma girebilir.
  await updateDoc(doc(db, 'users', uid), { userType: 'ogretmen', teacherApproved: true, isAdminVerified: true })
  await updateDoc(doc(db, 'teacherApprovals', uid), { status: 'approved', resolvedAt: serverTimestamp() })
  writeSystemLog({ level: 'info', event: 'teacher.approve', source: 'admin',
    message: `Öğretmen başvurusu onaylandı (${uid})`, details: { targetUid: uid } })
}

export async function rejectTeacher(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { userType: 'lisans', teacherApproved: false })
  await updateDoc(doc(db, 'teacherApprovals', uid), { status: 'rejected', resolvedAt: serverTimestamp() })
  writeSystemLog({ level: 'info', event: 'teacher.reject', source: 'admin',
    message: `Öğretmen başvurusu reddedildi (${uid})`, details: { targetUid: uid } })
}

export async function getAllUsers(): Promise<User[]> {
  // Admin paneli: ana dokümanlar + hassas veriler (private alt-dokümanlar) birleştirilir.
  // email/studentId artık private'ta; eski kayıtlarda hâlâ ana dokümanda olabilir (geçiş dönemi).
  const [snap, privateMap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getAllPrivateData(),
  ])
  return snap.docs.map(d => {
    const data = d.data()
    const priv = privateMap[d.id] ?? {}
    return {
      ...data, uid: d.id,
      // private'taki değer öncelikli; yoksa eski ana doküman değeri (geçiş uyumu)
      email:     priv.email     ?? data.email     ?? null,
      studentId: priv.studentId ?? data.studentId ?? null,
      joinedAt: data.joinedAt?.toDate?.() ?? new Date(),
      lastActiveAt: data.lastActiveAt?.toDate?.() ?? new Date(),
      banUntil: data.banUntil?.toDate?.() ?? null,
      muteUntil: data.muteUntil?.toDate?.() ?? null,
    }
  }) as import('@/types').User[]
}

export async function getAllPosts(): Promise<Post[]> {
  const snap = await getDocs(query(collection(db, 'posts'), limit(200)))
  return snap.docs.map(postFromDoc)
}

// ─── POLL ─────────────────────────────────────────────────────────────────────
export async function votePoll(postId: string, optionIds: string[], uid: string): Promise<void> {
  const postRef = doc(db, 'posts', postId)
  const snap = await getDoc(postRef)
  if (!snap.exists()) return
  const poll = snap.data().poll
  if (!poll) return

  // Süre dolduysa oy kullanılamaz
  if (poll.endsAt && new Date(poll.endsAt.seconds ? poll.endsAt.seconds * 1000 : poll.endsAt) < new Date()) return

  // Mevcut oyları temizle (çoklu değilse hepsini, çoklu ise de hepsini sıfırla ve yeniden ekle)
  const updatedOptions = poll.options.map((opt: any) => ({
    ...opt,
    votes: opt.votes.filter((v: string) => v !== uid),
  }))
  // Seçilen seçeneklere uid ekle
  optionIds.forEach(id => {
    const idx = updatedOptions.findIndex((o: any) => o.id === id)
    if (idx !== -1 && !updatedOptions[idx].votes.includes(uid)) {
      updatedOptions[idx].votes.push(uid)
    }
  })
  await updateDoc(postRef, { 'poll.options': updatedOptions })
}

export async function retractVote(postId: string, uid: string): Promise<void> {
  const postRef = doc(db, 'posts', postId)
  const snap = await getDoc(postRef)
  if (!snap.exists()) return
  const poll = snap.data().poll
  if (!poll) return
  const updatedOptions = poll.options.map((opt: any) => ({
    ...opt,
    votes: opt.votes.filter((v: string) => v !== uid),
  }))
  await updateDoc(postRef, { 'poll.options': updatedOptions })
}

export async function endPoll(postId: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), { 'poll.isEnded': true })
}

export async function hardDeletePost(postId: string): Promise<void> {
  await _deleteCommentsForPost(postId)
  await deleteDoc(doc(db, 'posts', postId))
}

// ─── SPACE YÖNETİMİ ───────────────────────────────────────────────────────────

export async function deleteSpace(spaceId: string): Promise<void> {
  // Önce bu space'e ait postları (ve yorumlarını) sil
  const postsSnap = await getDocs(query(collection(db, 'posts'), where('spaceId', '==', spaceId)))
  // Postlara ait yorumları temizle (yetim yorum birikmesini önler)
  for (const p of postsSnap.docs) {
    await _deleteCommentsForPost(p.id)
  }
  const batch = writeBatch(db)
  postsSnap.docs.forEach(d => batch.delete(d.ref))
  // Sonra space'i sil
  batch.delete(doc(db, 'spaces', spaceId))
  await batch.commit()
  writeSystemLog({ level: 'warn', event: 'space.delete', source: 'space',
    message: `Topluluk silindi (${spaceId})`, details: { spaceId, deletedPosts: postsSnap.size } })
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

  writeSystemLog({ level: 'info', event: 'space.create', source: 'space',
    message: `Topluluk oluşturuldu: ${data.name}`, details: { spaceId: ref.id, name: data.name, isPublic: data.isPublic } })

  return ref.id
}

export async function getBookmarkedPosts(postIds: string[]): Promise<Post[]> {
  if (!postIds || postIds.length === 0) return []
  const results = await Promise.all(postIds.map(id => getDoc(doc(db, 'posts', id))))
  return results.filter(s => s.exists()).map(postFromDoc)
}

// ─── ÖĞRENCİ KARTI DOĞRULAMA (O5) ────────────────────────────────────────────
// Kullanıcı öğrenci kartı fotoğrafıyla doğrulama (isAdminVerified) talep eder.
// KVKK: kart görseli Storage'da studentCards/{uid}/ altında; yalnızca sahibi ve
// yetkili (owner/manageUsers) okuyabilir. Dokümanda URL DEĞİL storagePath tutulur
// (indirme bağlantısı yetkili tarafça kurallara tabi olarak üretilir).
// İnceleme bitince kart görseli silinir (veri minimizasyonu).
export interface VerificationRequest {
  uid: string
  displayName?: string
  username?: string
  studentId?: string
  cardPath: string           // Storage yolu (studentCards/{uid}/...)
  status: 'pending' | 'approved' | 'rejected'
  reason?: string            // ret gerekçesi
  createdAt: Date
  resolvedAt?: Date | null
}

export async function submitVerificationRequest(data: {
  uid: string; displayName?: string; username?: string; studentId?: string; cardPath: string
}): Promise<void> {
  const payload: Record<string, any> = {
    uid: data.uid, cardPath: data.cardPath,
    status: 'pending', reason: '',
    createdAt: serverTimestamp(), resolvedAt: null,
  }
  if (data.displayName) payload.displayName = data.displayName
  if (data.username)    payload.username    = data.username
  if (data.studentId)   payload.studentId   = data.studentId
  await setDoc(doc(db, 'verificationRequests', data.uid), payload)
  writeSystemLog({ level: 'info', event: 'verify.request', source: 'verification',
    message: 'Öğrenci kartı doğrulama talebi gönderildi', details: { uid: data.uid } })
}

export async function getMyVerificationRequest(uid: string): Promise<VerificationRequest | null> {
  try {
    const snap = await getDoc(doc(db, 'verificationRequests', uid))
    if (!snap.exists()) return null
    const x = snap.data()
    return {
      ...x, uid: snap.id,
      createdAt:  x.createdAt?.toDate?.()  ?? new Date(),
      resolvedAt: x.resolvedAt?.toDate?.() ?? null,
    } as VerificationRequest
  } catch { return null }
}

export async function getPendingVerificationRequests(): Promise<VerificationRequest[]> {
  const snap = await getDocs(
    query(collection(db, 'verificationRequests'), where('status', '==', 'pending'))
  )
  return snap.docs.map(d => {
    const x = d.data()
    return {
      ...x, uid: d.id,
      createdAt:  x.createdAt?.toDate?.()  ?? new Date(),
      resolvedAt: x.resolvedAt?.toDate?.() ?? null,
    } as VerificationRequest
  }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

// Kart görselini Storage'dan sil (inceleme sonrası — veri minimizasyonu, best effort)
async function _deleteCardImage(cardPath: string): Promise<void> {
  try {
    const { ref: sref, deleteObject } = await import('firebase/storage')
    const { storage } = await import('./firebase')
    await deleteObject(sref(storage, cardPath))
  } catch { /* dosya yoksa veya izin sorunu — kritik değil */ }
}

export async function resolveVerificationRequest(
  uid: string, approve: boolean, reason?: string
): Promise<void> {
  const reqSnap = await getDoc(doc(db, 'verificationRequests', uid))
  const cardPath = reqSnap.exists() ? (reqSnap.data().cardPath as string | undefined) : undefined
  if (approve) {
    await adminVerifyUser(uid)
    await updateDoc(doc(db, 'verificationRequests', uid), {
      status: 'approved', reason: '', resolvedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(doc(db, 'verificationRequests', uid), {
      status: 'rejected', reason: reason ?? '', resolvedAt: serverTimestamp(),
    })
  }
  if (cardPath) await _deleteCardImage(cardPath)
  writeSystemLog({
    level: 'info', event: approve ? 'verify.approve' : 'verify.reject', source: 'verification',
    message: approve ? `Kart doğrulaması onaylandı (${uid})` : `Kart doğrulaması reddedildi (${uid})`,
    details: { targetUid: uid, reason: reason ?? '' },
  })
}

// ─── SYSTEM LOGS (O1) ────────────────────────────────────────────────────────
// Log şeması (standart):
//   level   : 'info' | 'warn' | 'error'   (UI: INFO / WARNING / ERROR)
//   event   : makine-okur olay kodu — 'alan.eylem' biçimi (örn. user.register,
//             auth.login_error, email.sent, mod.ban, space.create, invite.redeem)
//   source  : olayın kaynağı ('auth' | 'admin' | 'space' | 'email' | 'api' | ...)
//   message : insan-okur Türkçe özet (≤ 500 karakter)
//   details : serbest detay (JSON string'e çevrilir, genişletilebilir görünüm)
//   userId/userEmail : olayı tetikleyen kullanıcı (verilmezse oturumdan alınır)
export interface SystemLogEntry {
  level: 'info' | 'warn' | 'error'
  event?: string
  message: string
  source?: string
  details?: any
  userEmail?: string
  userId?: string
}

export async function writeSystemLog(entry: SystemLogEntry) {
  try {
    // Aktör verilmemişse oturumdaki kullanıcıdan doldur
    const { auth } = await import('./firebase')
    const cu = auth.currentUser
    const payload: Record<string, any> = {
      level:   entry.level,
      event:   entry.event ?? null,
      source:  entry.source ?? null,
      message: entry.message.slice(0, 500),
      details: entry.details ? (typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)).slice(0, 2000) : null,
      userId:    entry.userId    ?? cu?.uid   ?? null,
      userEmail: entry.userEmail ?? cu?.email ?? null,
      createdAt: serverTimestamp(),
    }
    await addDoc(collection(db, 'systemLogs'), payload)
  } catch {
    // log yazımı başarısız olursa sessizce geç
  }
}

// Owner log görünümü: son kayıtlar (filtre/arama istemcide yapılır)
export interface SystemLogRow {
  id: string; level: 'info' | 'warn' | 'error'; event?: string | null
  source?: string | null; message: string; details?: string | null
  userId?: string | null; userEmail?: string | null; createdAt: Date
}
export async function getSystemLogs(limitCount = 200): Promise<SystemLogRow[]> {
  const snap = await getDocs(query(collection(db, 'systemLogs'), orderBy('createdAt', 'desc'), limit(limitCount)))
  return snap.docs.map(d => {
    const x = d.data()
    return { id: d.id, ...x, createdAt: x.createdAt?.toDate?.() ?? new Date() } as SystemLogRow
  })
}
