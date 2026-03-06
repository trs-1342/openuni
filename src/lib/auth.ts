import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reload,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { isValidStudentEmail, generateUsername } from './utils'

const AUTH_ERRORS: Record<string, string> = {
  'auth/user-not-found':         'Bu e-posta ile kayıtlı hesap bulunamadı.',
  'auth/wrong-password':         'Şifre hatalı.',
  'auth/invalid-credential':     'E-posta veya şifre hatalı.',
  'auth/email-already-in-use':   'Bu e-posta zaten kullanımda.',
  'auth/weak-password':          'Şifre en az 6 karakter olmalıdır.',
  'auth/too-many-requests':      'Çok fazla deneme. Lütfen birkaç dakika bekleyin.',
  'auth/network-request-failed': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
  'auth/user-disabled':          'Bu hesap devre dışı bırakılmış.',
}

export function getAuthErrorMessage(code: string): string {
  return AUTH_ERRORS[code] ?? null
}

export interface RegisterData {
  email: string
  password: string
  displayName: string
  department: string
  grade?: string
  username?: string
  extra?: {
    studentId?: string
    userType?: string
    fakulte?: string
  }
}

export async function registerUser(data: RegisterData): Promise<User> {
  // Email'i normalize et (büyük harf bypass engeli)
  data.email = data.email.trim().toLowerCase()
  if (!isValidStudentEmail(data.email)) {
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta kabul edilir.')
  }

  // 1) Firebase Auth'da kullanıcı oluştur
  const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password)

  // 2) Display name güncelle — hata olsa bile devam et
  try {
    await updateProfile(user, { displayName: data.displayName })
  } catch { /* kritik değil */ }

  // 3) Firebase doğrulama e-postası gönder
  // Firebase kendi emailini gönderiyor — en güvenilir yöntem
  // actionCodeSettings.url = kayıt sonrası yönlendirilecek sayfa (token Firebase tarafından işleniyor)
  try {
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}/dashboard`,
      handleCodeInApp: false,
    }
    await sendEmailVerification(user, actionCodeSettings)
  } catch (emailErr: any) {
    // Email gönderilemedi ama hesap oluşturuldu — kullanıcı settings'ten tekrar gönderebilir
    console.warn('[register] Email verification failed:', emailErr?.message)
  }

  // 4) Firestore'a kullanıcı profili kaydet — hata olsa bile auth başarılı sayılır
  try {
    const isTeacher = data.extra?.userType === 'ogretmen'
    await setDoc(doc(db, 'users', user.uid), {
      uid:             user.uid,
      email:           user.email,
      displayName:     data.displayName,
      username:        data.username ?? generateUsername(data.displayName, user.uid),
      usernameChangesLeft: 2,
      isListedInDirectory: true,
      department:      data.department,
      grade:           data.grade === 'hazirlik' ? 'hazirlik' : data.grade ? parseInt(data.grade) : null,
      studentId:       data.extra?.studentId ?? null,
      // Öğretmen onay bekliyor: userType geçici olarak 'pending_teacher'
      userType:        isTeacher ? 'pending_teacher' : (data.extra?.userType ?? 'lisans'),
      fakulte:         data.extra?.fakulte ?? null,
      role:            user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? 'admin' : 'student',
      bookmarks:       [],
      isVerified:      false,
      teacherApproved: isTeacher ? false : null,
      isAdminVerified: false,
      joinedAt:        serverTimestamp(),
      lastActiveAt:    serverTimestamp(),
    })
    // Yeni kayıt admin log emaili — fire and forget
    fetch('/api/send-admin-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret:  process.env.INTERNAL_API_SECRET,
        subject: `Yeni Kayıt: ${data.displayName}`,
        title:   '👤 Yeni Kullanıcı Kaydoldu',
        level:   'info',
        rows: [
          { label: 'Ad Soyad',   value: data.displayName },
          { label: 'E-posta',    value: data.email },
          { label: 'Username',   value: data.username ?? '—' },
          { label: 'Tür',        value: data.extra?.userType ?? 'lisans' },
          { label: 'Fakülte',    value: data.extra?.fakulte ?? '—' },
          { label: 'Bölüm',      value: data.department ?? '—' },
          { label: 'Öğrenci No', value: data.extra?.studentId ?? '—' },
        ],
      }),
    }).catch(() => {}) // email hatası kayıt akışını kesmez

    // Öğretmen ise onay kuyruğuna ekle
    if (isTeacher) {
      await setDoc(doc(db, 'teacherApprovals', user.uid), {
        uid:         user.uid,
        email:       user.email,
        displayName: data.displayName,
        department:  data.department,
        fakulte:     data.extra?.fakulte ?? '',
        status:      'pending',
        createdAt:   serverTimestamp(),
      })
    }
  } catch (firestoreErr) {
    // Firestore hatası kayıt akışını kesmez; kullanıcı auth'da oluşturuldu
    // Profil daha sonra ilk girişte tekrar yazılabilir
    console.warn('[registerUser] Firestore profil kaydı başarısız:', firestoreErr)
  }

  return user
}

export async function loginUser(email: string, password: string): Promise<User> {
  email = email.trim().toLowerCase()
  if (!isValidStudentEmail(email)) {
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta ile giriş yapılabilir.')
  }
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function resendVerificationEmail(displayName?: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Aktif oturum bulunamadı.')
  // Firebase native gönderim
  await sendEmailVerification(user)
  // Kendi güzel emailimizi de gönder
  fetch('/api/send-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email:            user.email,
      displayName:      displayName ?? user.displayName,
      verificationLink: `${typeof window !== 'undefined' ? window.location.origin : 'https://openigu.vercel.app'}/auth/verify-email`,
    }),
  }).catch(() => {})
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

// İlk girişte Firestore profili yoksa oluştur
export async function ensureUserProfile(user: User) {
  try {
    const { doc: firestoreDoc, getDoc, setDoc: firestoreSetDoc, serverTimestamp: st } =
      await import('firebase/firestore')
    const { db: firestoreDb } = await import('./firebase')
    const ref = firestoreDoc(firestoreDb, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      // Yeni profil oluştur (kayıt dışı bir şekilde profil yoksa)
      await firestoreSetDoc(ref, {
        uid:                  user.uid,
        email:                user.email,
        displayName:          user.displayName ?? user.email?.split('@')[0] ?? 'Kullanıcı',
        username:             null,
        usernameChangesLeft:  2,
        department:           '',
        grade:                null,
        studentId:            null,
        userType:             'lisans',
        fakulte:              null,
        role:                 user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? 'admin' : 'student',
        isVerified:           user.emailVerified,
        isListedInDirectory:  true,
        isAdminVerified:      user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? true : false,
        bookmarks:            [],
        joinedAt:             st(),
        lastActiveAt:         st(),
      })
    } else {
      // Mevcut profili güncelle — sadece eksik alanları ekle, mevcut verileri silme
      const data = snap.data()
      // Sadece eksik alanları ekle — mevcut verilere (role, studentId, fakulte vb.) ASLA dokunma
      const updates: Record<string, any> = { lastActiveAt: st() }
      if (data.isListedInDirectory === undefined) updates.isListedInDirectory = true
      if (data.usernameChangesLeft  === undefined) updates.usernameChangesLeft  = 2
      if (data.bookmarks            === undefined) updates.bookmarks            = []
      if (data.userType             === undefined) updates.userType             = 'lisans'
      if (!data.isVerified && user.emailVerified)  updates.isVerified           = true
      // Admin emaili her zaman onaylı olsun
      if (user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && !data.isAdminVerified) updates.isAdminVerified = true
      // role, studentId, fakulte, department, grade — mevcut değerlere HİÇBİR KOŞULDA dokunma
      const { updateDoc } = await import('firebase/firestore')
      await updateDoc(ref, updates)
    }
  } catch (err) {
    console.warn('[ensureUserProfile] hata:', err)
  }
}

// ─── Parola Sıfırlama ─────────────────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  if (!isValidStudentEmail(normalized)) {
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta kabul edilir.')
  }
  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}/auth/login`,
    handleCodeInApp: false,
  }
  await sendPasswordResetEmail(auth, normalized, actionCodeSettings)
}

// ─── Şifre Değiştirme ─────────────────────────────────────────────────────
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Aktif oturum bulunamadı.')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

// ─── Email Doğrulama Kontrolü ─────────────────────────────────────────────
export async function checkEmailVerified(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  await reload(user)
  return user.emailVerified
}

// ─── Veri İndirme (KVKK) ──────────────────────────────────────────────────
export async function downloadMyData(uid: string): Promise<void> {
  const { getUserProfile, getPostsByUser, getArchivedPosts } = await import('./firestore')
  const [profile, publishedPosts, archivedPosts] = await Promise.all([
    getUserProfile(uid),
    getPostsByUser(uid, 200),
    getArchivedPosts(uid),
  ])

  // Şifre alanlarını temizle
  const safeProfile = profile ? Object.fromEntries(
    Object.entries(profile).filter(([k]) => !['password', 'passwordHash'].includes(k))
  ) : null

  // Medya URL'lerini topla
  const allPosts = [...publishedPosts, ...archivedPosts]
  const mediaFiles = allPosts.flatMap(p =>
    (p.attachments ?? []).map((a: any) => ({
      postId:     p.id,
      postTitle:  p.title,
      fileName:   a.name,
      fileType:   a.type,
      fileSize:   a.size,
      url:        a.url,
      uploadedAt: a.uploadedAt,
    }))
  )

  const data = {
    exportedAt: new Date().toISOString(),
    notice: 'OpenUni platformundan dışa aktarılan kişisel verileriniz. Şifre bilgisi dahil edilmemiştir.',
    profile: safeProfile,
    stats: {
      publishedPostCount: publishedPosts.length,
      archivedPostCount:  archivedPosts.length,
      totalMediaCount:    mediaFiles.length,
    },
    posts: {
      published: publishedPosts.map(p => ({
        id: p.id, title: p.title, content: p.content,
        tags: p.tags, channelId: p.channelId, spaceId: p.spaceId,
        viewCount: p.viewCount, commentCount: p.commentCount,
        createdAt: p.createdAt, updatedAt: p.updatedAt,
        attachments: p.attachments,
      })),
      archived: archivedPosts.map(p => ({
        id: p.id, title: p.title, content: p.content,
        tags: p.tags, createdAt: p.createdAt, updatedAt: p.updatedAt,
        attachments: p.attachments,
      })),
    },
    media: mediaFiles,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `openuni-verilerim-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
