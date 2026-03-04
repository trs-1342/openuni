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
  type User,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { isValidStudentEmail } from './utils'

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

  // 3) Kendi API route'umuz ile doğrulama e-postası gönder
  try {
    // Firebase'den doğrulama linki üret
    const { sendEmailVerification: fbSendVerification } = await import('firebase/auth')
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}/auth/verify-email`,
      handleCodeInApp: false,
    }
    await fbSendVerification(user, actionCodeSettings)
    // Kendi güzel emailimizi de gönder (background'da)
    fetch('/api/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:            user.email,
        displayName:      data.displayName,
        verificationLink: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}/auth/verify-email`,
      }),
    }).catch(() => {/* sessizce hata yut */})
  } catch { /* e-posta sonra tekrar gönderilebilir */ }

  // 4) Firestore'a kullanıcı profili kaydet — hata olsa bile auth başarılı sayılır
  try {
    const isTeacher = data.extra?.userType === 'ogretmen'
    await setDoc(doc(db, 'users', user.uid), {
      uid:             user.uid,
      email:           user.email,
      displayName:     data.displayName,
      department:      data.department,
      grade:           data.grade === 'hazirlik' ? 'hazirlik' : data.grade ? parseInt(data.grade) : null,
      studentId:       data.extra?.studentId ?? null,
      // Öğretmen onay bekliyor: userType geçici olarak 'pending_teacher'
      userType:        isTeacher ? 'pending_teacher' : (data.extra?.userType ?? 'lisans'),
      fakulte:         data.extra?.fakulte ?? null,
      role:            'student',
      bookmarks:       [],
      isVerified:      false,
      teacherApproved: isTeacher ? false : null,
      joinedAt:        serverTimestamp(),
      lastActiveAt:    serverTimestamp(),
    })
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
      await firestoreSetDoc(ref, {
        uid:          user.uid,
        email:        user.email,
        displayName:  user.displayName ?? user.email?.split('@')[0] ?? 'Kullanıcı',
        department:   '',
        grade:        null,
        role:         'student',
        isVerified:   false,
        joinedAt:     st(),
        lastActiveAt: st(),
      })
    }
  } catch (err) {
    console.warn('[ensureUserProfile] hata:', err)
  }
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
  const { getUserProfile } = await import('./firestore')
  const profile = await getUserProfile(uid)
  const data = {
    exportedAt: new Date().toISOString(),
    profile,
    notice: 'OpenUni platformundan dışa aktarılan kişisel verileriniz.',
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
