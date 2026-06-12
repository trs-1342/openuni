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
import { isValidStudentEmail, generateUsername, validateDisplayName, validateUsername } from './utils'
import { OWNER_EMAIL } from './permissions'

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
    visitorUniversity?: string
    [key: string]: string | undefined
  }
}

export async function registerUser(data: RegisterData): Promise<User> {
  // Email'i normalize et (büyük harf bypass engeli)
  data.email = data.email.trim().toLowerCase()
  const isVisitor = data.extra?.userType === 'visitor'
  if (!isVisitor && !isValidStudentEmail(data.email)) {
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta kabul edilir.')
  }

  // Ad Soyad doğrulaması (form bypass'ına karşı ikinci kontrol)
  const nameErr = validateDisplayName(data.displayName)
  if (nameErr) throw new Error(nameErr)
  data.displayName = data.displayName.trim()

  // Y-1 (denetim): username benzersizliği + rezervasyon, HESAP OLUŞTURULMADAN ÖNCE
  // sunucudan kontrol edilir (admin SDK yoksa kontrol atlanır, kayıt devam eder).
  if (data.username) {
    try {
      const res = await fetch('/api/check-username', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username }),
      })
      if (res.ok) {
        const status = await res.json()
        if (status.reserved) throw new Error('Bu kullanıcı adı kullanılamaz (rezerve edilmiş). Lütfen başka bir kullanıcı adı seç.')
        if (status.available === false) throw new Error('Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı seç.')
      }
    } catch (err: any) {
      if (err?.message?.includes('kullanıcı adı')) throw err
      // ağ/sunucu hatası kaydı engellemez
    }
  }

  // 1) Firebase Auth'da kullanıcı oluştur
  let user: User
  try {
    ;({ user } = await createUserWithEmailAndPassword(auth, data.email, data.password))
  } catch (err: any) {
    // O1: kayıt hatası logu — auth oturumu olmadığından sunucu log ucuna gider (fire & forget)
    fetch('/api/log-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'auth.register_error',
        message: `Kayıt başarısız: ${data.email}`,
        details: { code: err?.code ?? 'unknown' },
      }),
    }).catch(() => {})
    throw err
  }

  // 1b) Username rezerve mi? (silinen hesapların username'leri tekrar alınamaz)
  // Auth oluştuktan sonra (giriş yapılmış) kontrol edilir; rezerveyse hesabı geri al.
  if (data.username) {
    try {
      const { doc: _doc, getDoc: _getDoc } = await import('firebase/firestore')
      const reserved = await _getDoc(_doc(db, 'deletedUsernames', data.username.toLowerCase().trim()))
      if (reserved.exists()) {
        await user.delete().catch(() => {})
        throw new Error('Bu kullanıcı adı kullanılamaz (rezerve edilmiş). Lütfen başka bir kullanıcı adı seç.')
      }
    } catch (err: any) {
      // Rezerve hatasıysa yukarı fırlat; okuma hatasıysa kaydı engelleme
      if (err?.message?.includes('rezerve')) throw err
    }
  }

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
      displayName:     data.displayName,
      username:        data.username ?? generateUsername(data.displayName, user.uid),
      usernameChangesLeft: 2,
      isListedInDirectory: true,
      department:      data.department,
      grade:           data.grade === 'hazirlik' ? 'hazirlik' : data.grade ? parseInt(data.grade) : null,
      // KVKK: email ve studentId ana dokümanda DEĞİL, users/{uid}/private/contact'ta tutulur.
      // Öğretmen onay bekliyor: userType geçici olarak 'pending_teacher'
      userType:        isTeacher ? 'pending_teacher' : (data.extra?.userType ?? 'lisans'),
      ...(data.extra?.userType === 'visitor' && data.extra?.visitorUniversity
        ? { visitorUniversity: data.extra.visitorUniversity } : {}),
      ...(data.extra?.teacherTitle ? { teacherTitle: data.extra.teacherTitle } : {}),
      fakulte:         data.extra?.fakulte ?? null,
      // GÜVENLİK: role/isAdminVerified istemciden YÜKSELTİLEMEZ.
      // Firestore kuralları create sırasında bu alanların güvenli varsayılanda
      // olmasını zorlar. Admin hesabı Firebase Console'dan manuel yükseltilir.
      role:            'student',
      capabilities:    [],
      bookmarks:       [],
      isVerified:      false,
      teacherApproved: isTeacher ? false : null,
      isAdminVerified: false,
      isBanned:        false,
      isMuted:         false,
      joinedAt:        serverTimestamp(),
      lastActiveAt:    serverTimestamp(),
    })
    // Hassas iletişim verisini ayrı (yalnızca sahip+mod erişimli) alt-dokümana yaz
    try {
      await setDoc(doc(db, 'users', user.uid, 'private', 'contact'), {
        email:     user.email ?? null,
        studentId: data.extra?.studentId ?? null,
      })
    } catch (e) { console.warn('[registerUser] private contact yazılamadı:', e) }
    // Yeni kayıt admin log emaili — fire and forget (auth token ile)
    const adminLogToken = await user.getIdToken().catch(() => null)
    if (adminLogToken) fetch('/api/send-admin-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminLogToken}` },
      body: JSON.stringify({
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

    // O1: yeni kayıt sistem logu (oturum açık — doğrudan Firestore'a yazılır)
    try {
      const { writeSystemLog } = await import('./firestore')
      writeSystemLog({
        level: 'info', event: 'user.register', source: 'auth',
        message: `Yeni kullanıcı kaydı: ${data.displayName} (@${data.username ?? '—'})`,
        details: { userType: data.extra?.userType ?? 'lisans', department: data.department ?? '' },
        userId: user.uid, userEmail: data.email,
      })
    } catch { /* log kritik değil */ }

    // Öğretmen ise onay kuyruğuna ekle
    if (isTeacher) {
      await setDoc(doc(db, 'teacherApprovals', user.uid), {
        uid:          user.uid,
        email:        user.email,
        displayName:  data.displayName,
        department:   data.department,
        fakulte:      data.extra?.fakulte ?? '',
        teacherTitle: data.extra?.teacherTitle ?? '',
        status:       'pending',
        createdAt:    serverTimestamp(),
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
  // Kendi güzel emailimizi de gönder (auth token ile; sunucu alıcıyı token'dan belirler)
  const idToken = await user.getIdToken().catch(() => null)
  if (idToken) fetch('/api/send-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      displayName:      displayName ?? user.displayName,
      verificationLink: `${typeof window !== 'undefined' ? window.location.origin : 'https://openigu.vercel.app'}/auth/verify-email`,
    }),
  }).catch(() => {})
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

// İlk girişte Firestore profili yoksa oluştur
// ÖNEMLİ: Bu fonksiyon HİÇBİR ZAMAN mevcut verileri silmemeli.
// setDoc(..., { merge: true }) kullanarak sadece eksik alanları ekler.
export async function ensureUserProfile(user: User) {
  try {
    const { doc: firestoreDoc, getDoc, setDoc: firestoreSetDoc, serverTimestamp: st } =
      await import('firebase/firestore')
    const { db: firestoreDb } = await import('./firebase')
    const { generateUsername } = await import('./utils')
    const ref = firestoreDoc(firestoreDb, 'users', user.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      // Profil hiç yok — yeni oluştur (merge:true ile güvenli)
      const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Kullanıcı'
      await firestoreSetDoc(ref, {
        uid:                  user.uid,
        displayName:          displayName,
        username:             generateUsername(displayName, user.uid),
        usernameChangesLeft:  2,
        department:           '',
        grade:                null,
        userType:             'lisans',
        fakulte:              null,
        // KVKK: email/studentId ana dokümanda değil, private/contact'ta tutulur
        // GÜVENLİK: istemci role/isAdminVerified yükseltemez (Firestore kuralları engeller)
        role:                 'student',
        isVerified:           user.emailVerified,
        isListedInDirectory:  true,
        isAdminVerified:      false,
        isBanned:             false,
        isMuted:              false,
        bookmarks:            [],
        joinedAt:             st(),
        lastActiveAt:         st(),
      }, { merge: true }) // ← merge:true — eğer race condition ile profil oluştuysa verileri ezmez
      // Hassas veriyi ayrı alt-dokümana yaz
      try {
        await firestoreSetDoc(firestoreDoc(firestoreDb, 'users', user.uid, 'private', 'contact'),
          { email: user.email ?? null }, { merge: true })
      } catch { /* kritik değil */ }
    } else {
      // Mevcut profil var — SADECE eksik alanları ekle, mevcut verilere ASLA dokunma
      const data = snap.data()
      const updates: Record<string, any> = { lastActiveAt: st() }

      // Sadece UNDEFINED olan alanları doldur — boş string veya null bile olsa dokunma
      if (data.isListedInDirectory === undefined) updates.isListedInDirectory = true
      if (data.usernameChangesLeft === undefined) updates.usernameChangesLeft = 2
      if (data.bookmarks           === undefined) updates.bookmarks           = []
      if (data.isBanned            === undefined) updates.isBanned            = false
      if (data.isMuted             === undefined) updates.isMuted             = false

      // username — sadece null/undefined ise üret, boş string dahil
      // (ilk atamaya kurallar izin verir; sonrası kalıcı — Y-1)
      if (!data.username) {
        const displayName = data.displayName ?? user.displayName ?? 'user'
        updates.username = generateUsername(displayName, user.uid)
      } else if (validateUsername(data.username)) {
        // GERİYE DÖNÜK MİGRASYON (Y-1): username artık kurallarda kalıcı olduğundan
        // normalize işlemi SUNUCUDA (admin SDK) yapılır; benzersizlik + gönderi
        // güncellemesi route içindedir. Admin SDK yoksa migrasyon ertelenir.
        try {
          const idToken = await user.getIdToken()
          fetch('/api/normalize-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          }).catch(() => {})
        } catch (e) { console.warn('[ensureUserProfile] username migrasyon hatası:', e) }
      }

      // userType — sadece hiç yazılmamışsa varsayılan ata
      if (!data.userType) updates.userType = 'lisans'

      // Email doğrulama senkronu
      if (!data.isVerified && user.emailVerified) updates.isVerified = true

      // GÜVENLİK: isAdminVerified istemciden set EDİLMEZ.
      // Admin/onay yükseltmesi yalnızca moderatör/admin tarafından (kurallar gereği) yapılır.

      // OWNER BOOTSTRAP: sistem sahibi login olduğunda isSystemOwner bayrağı işaretlenir.
      // ROL DEĞİŞMEZ (owner mevcut rolüyle kalır; istemci role kontrolleri bozulmaz).
      // Böylece owner hesabı kurallarda moderasyon/yönetimden korunur (targetIsOwner).
      // (Bu yazma owner-update kuralından geçer; başka kimse isSystemOwner yapamaz.)
      if (user.email === OWNER_EMAIL && data.isSystemOwner !== true) {
        updates.isSystemOwner = true
      }

      // ÖNEMLİ: Aşağıdaki alanlara HİÇBİR KOŞULDA dokunma:
      // role, fakulte, department, grade, displayName, visitorUniversity

      const { updateDoc, deleteField, setDoc: fsSetDoc } = await import('firebase/firestore')

      // KVKK TEMBEL MİGRASYON: eski kayıtlarda email/studentId ana dokümandaysa,
      // private/contact'a taşı ve ana dokümandan kaldır (her kullanıcı kendi verisini taşır).
      if (data.email !== undefined || data.studentId !== undefined) {
        try {
          await fsSetDoc(
            firestoreDoc(firestoreDb, 'users', user.uid, 'private', 'contact'),
            {
              ...(data.email     !== undefined ? { email: data.email }         : {}),
              ...(data.studentId !== undefined ? { studentId: data.studentId } : {}),
            },
            { merge: true }
          )
          if (data.email     !== undefined) updates.email     = deleteField()
          if (data.studentId !== undefined) updates.studentId = deleteField()
        } catch (e) { console.warn('[ensureUserProfile] migrasyon hatası:', e) }
      }

      await updateDoc(ref, updates)
    }
  } catch (err) {
    console.warn('[ensureUserProfile] hata:', err)
  }
}

// ─── Parola Sıfırlama ─────────────────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@') || normalized.length < 5) {
    throw new Error('Geçerli bir e-posta adresi girin.')
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

// ─── Yeniden Doğrulama (hassas işlemler için) ─────────────────────────────
// Parolayı doğrular; oturum ele geçirilse bile parola olmadan hassas işlem yapılamaz.
export async function reauthenticate(password: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Aktif oturum bulunamadı.')
  const credential = EmailAuthProvider.credential(user.email, password)
  await reauthenticateWithCredential(user, credential)
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
  const { getUserProfile, getPostsByUser, getArchivedPosts, getUserPrivateData } = await import('./firestore')
  const [profile, privateData, publishedPosts, archivedPosts] = await Promise.all([
    getUserProfile(uid),
    getUserPrivateData(uid),
    getPostsByUser(uid, 200),
    getArchivedPosts(uid),
  ])

  // Şifre alanlarını temizle; hassas veriyi (email/studentId) private'tan ekle
  const safeProfile = profile ? {
    ...Object.fromEntries(
      Object.entries(profile).filter(([k]) => !['password', 'passwordHash'].includes(k))
    ),
    email:     privateData.email     ?? (profile as any).email     ?? null,
    studentId: privateData.studentId ?? (profile as any).studentId ?? null,
  } : null

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

// ─── Hesap Silme ───────────────────────────────────────────────────────────
export interface DeleteAccountOptions {
  deletePosts?: boolean      // eki OLMAYAN gönderiler silinsin (yoksa anonimleştir)
  deleteDocuments?: boolean   // eki OLAN gönderiler (dosyalar) silinsin (yoksa anonimleştir)
  deleteComments?: boolean    // yorumlar silinsin (yoksa anonimleştir)
}

// Firebase Storage indirme URL'sinden depolama yolunu çıkarır (dosya silme için)
function storagePathFromUrl(url: string): string | null {
  try {
    const m = url.match(/\/o\/([^?]+)/)
    return m ? decodeURIComponent(m[1]) : null
  } catch { return null }
}

// Kullanıcı hesabını siler. Seçeneklere göre gönderiler/dökümanlar/yorumlar
// TAMAMEN silinir ya da anonimleştirilir ("Silinen Hesap"). Username kalıcı olarak
// rezerve edilir (bir daha alınamaz). Her grup ayrı batch'te işlenir.
export async function deleteAccount(password: string, options: DeleteAccountOptions = {}): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Aktif oturum bulunamadı.')

  // 1) Şifre ile yeniden doğrula
  const credential = EmailAuthProvider.credential(user.email, password)
  await reauthenticateWithCredential(user, credential)

  const fs = await import('firebase/firestore')
  const { db: fdb } = await import('./firebase')
  const uid = user.uid
  const ANON_AUTHOR = { uid: 'deleted', displayName: 'Silinen Hesap', username: null, role: 'student', userType: null, photoURL: null }

  // Username'i al (kalıcı rezervasyon için — kullanıcı dokümanı silinmeden ÖNCE)
  let username: string | null = null
  try {
    const usnap = await fs.getDoc(fs.doc(fdb, 'users', uid))
    username = usnap.exists() ? (usnap.data().username ?? null) : null
  } catch {}

  // Storage dosyalarını sil (eki olan gönderi silinirken)
  async function deletePostFiles(atts: any[]) {
    if (!atts || atts.length === 0) return
    const { ref: sref, deleteObject } = await import('firebase/storage')
    const { storage } = await import('./firebase')
    for (const a of atts) {
      const path = a?.url ? storagePathFromUrl(a.url) : null
      if (path) { try { await deleteObject(sref(storage, path)) } catch {} }
    }
  }

  // 2) Gönderiler & dökümanlar — eke göre ayır, seçeneğe göre sil/anonimleştir
  try {
    const postsSnap = await fs.getDocs(fs.query(fs.collection(fdb, 'posts'), fs.where('authorId', '==', uid)))
    let batch = fs.writeBatch(fdb); let count = 0
    const flush = async () => { if (count > 0) { await batch.commit(); batch = fs.writeBatch(fdb); count = 0 } }
    for (const pd of postsSnap.docs) {
      const data = pd.data()
      const hasFiles = (data.attachments?.length ?? 0) > 0
      const shouldDelete = hasFiles ? options.deleteDocuments : options.deletePosts
      if (shouldDelete) {
        if (hasFiles) await deletePostFiles(data.attachments)
        batch.delete(pd.ref)
      } else {
        batch.update(pd.ref, { author: ANON_AUTHOR, authorId: 'deleted' })
      }
      count++
      if (count >= 450) await flush()
    }
    await flush()
  } catch (e) { console.warn('[deleteAccount] gönderi/döküman işleme hatası:', e) }

  // 3) Yorumlar — sil ya da anonimleştir
  try {
    const commentsSnap = await fs.getDocs(fs.query(fs.collection(fdb, 'comments'), fs.where('authorId', '==', uid)))
    let batch = fs.writeBatch(fdb); let count = 0
    for (const cd of commentsSnap.docs) {
      if (options.deleteComments) batch.delete(cd.ref)
      else batch.update(cd.ref, { author: ANON_AUTHOR, authorId: 'deleted' })
      count++
      if (count >= 450) { await batch.commit(); batch = fs.writeBatch(fdb); count = 0 }
    }
    if (count > 0) await batch.commit()
  } catch (e) { console.warn('[deleteAccount] yorum işleme hatası:', e) }

  // 4) Bildirimleri sil (her zaman)
  try {
    const notifsSnap = await fs.getDocs(fs.query(fs.collection(fdb, 'notifications'), fs.where('userId', '==', uid)))
    let batch = fs.writeBatch(fdb); let count = 0
    for (const nd of notifsSnap.docs) {
      batch.delete(nd.ref); count++
      if (count >= 450) { await batch.commit(); batch = fs.writeBatch(fdb); count = 0 }
    }
    if (count > 0) await batch.commit()
  } catch (e) { console.warn('[deleteAccount] bildirim silme hatası:', e) }

  // 5) Username'i KALICI rezerve et (bir daha alınamasın) — user dokümanı silinmeden önce
  if (username) {
    try {
      await fs.setDoc(fs.doc(fdb, 'deletedUsernames', username), {
        username, deletedAt: fs.serverTimestamp(),
      })
    } catch (e) { console.warn('[deleteAccount] username rezervasyon hatası:', e) }
  }

  // 6) teacherApprovals / davetler / hassas veri
  try { await fs.deleteDoc(fs.doc(fdb, 'teacherApprovals', uid)) } catch {}
  try { await fs.deleteDoc(fs.doc(fdb, 'users', uid, 'private', 'contact')) } catch {}

  // 7) Üyelikleri sil
  try {
    const memSnap = await fs.getDocs(fs.query(fs.collection(fdb, 'memberships'), fs.where('uid', '==', uid)))
    let batch = fs.writeBatch(fdb); let count = 0
    for (const md of memSnap.docs) { batch.delete(md.ref); count++; if (count >= 450) { await batch.commit(); batch = fs.writeBatch(fdb); count = 0 } }
    if (count > 0) await batch.commit()
  } catch {}

  // 8) Firestore kullanıcı dokümanını sil
  try { await fs.deleteDoc(fs.doc(fdb, 'users', uid)) } catch (e) { console.warn('[deleteAccount] kullanıcı dokümanı silme hatası:', e) }

  // 9) Firebase Auth hesabını sil — en son
  await user.delete()
}
