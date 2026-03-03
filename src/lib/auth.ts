// src/lib/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  multiFactor,
  onAuthStateChanged,
  reload,
  setPersistence,
  browserLocalPersistence,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { isValidStudentEmail } from './utils'

setPersistence(auth, browserLocalPersistence).catch(() => {})

const SESSION_MS = 3 * 60 * 60 * 1000 // 3 saat

const AUTH_ERRORS: Record<string, string> = {
  'auth/user-not-found':          'Bu e-posta ile kayıtlı hesap bulunamadı.',
  'auth/wrong-password':          'Şifre hatalı.',
  'auth/invalid-credential':      'E-posta veya şifre hatalı.',
  'auth/email-already-in-use':    'Bu e-posta zaten kullanımda.',
  'auth/weak-password':           'Şifre en az 6 karakter olmalıdır.',
  'auth/too-many-requests':       'Çok fazla deneme. Lütfen birkaç dakika bekleyin.',
  'auth/network-request-failed':  'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
  'auth/user-disabled':           'Bu hesap devre dışı bırakılmış.',
  'auth/requires-recent-login':   'Bu işlem için yeniden giriş yapmanız gerekiyor.',
}

export function getAuthErrorMessage(code: string): string | null {
  return AUTH_ERRORS[code] ?? null
}

// ─── Oturum süresi ─────────────────────────────────────────────────────────
function setSessionTime() {
  if (typeof window !== 'undefined')
    localStorage.setItem('ou_session', Date.now().toString())
}
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false
  const t = localStorage.getItem('ou_session')
  if (!t) return false
  return Date.now() - parseInt(t) > SESSION_MS
}
export function clearSession() {
  if (typeof window !== 'undefined')
    localStorage.removeItem('ou_session')
}

// ─── Register ─────────────────────────────────────────────────────────────
export interface RegisterData {
  email: string; password: string
  displayName: string; department: string; grade?: string
}

export async function registerUser(data: RegisterData): Promise<User> {
  if (!isValidStudentEmail(data.email))
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta kabul edilir.')
  const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password)
  try { await updateProfile(user, { displayName: data.displayName }) } catch { /* kritik değil */ }
  try { await sendEmailVerification(user) } catch { /* sonra tekrar gönderilebilir */ }
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid, email: user.email,
      displayName: data.displayName, department: data.department,
      grade: data.grade ? parseInt(data.grade) : null,
      role: 'student', isVerified: false, bookmarks: [],
      joinedAt: serverTimestamp(), lastActiveAt: serverTimestamp(),
    })
  } catch { /* Rules ayarlanana kadar sessiz */ }
  return user
}

// ─── Login ─────────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<User> {
  if (!isValidStudentEmail(email))
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta ile giriş yapılabilir.')
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  setSessionTime()
  return user
}

// ─── Logout ────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  clearSession()
  await signOut(auth)
}

// ─── Email doğrulama ───────────────────────────────────────────────────────
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Aktif oturum bulunamadı.')
  await sendEmailVerification(user)
}

export async function checkEmailVerified(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  await reload(user)
  return user.emailVerified
}

// ─── Şifre değiştirme ─────────────────────────────────────────────────────
/**
 * Önce mevcut şifreyle yeniden kimlik doğrulama yapar,
 * sonra yeni şifreye günceller.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Aktif oturum bulunamadı.')

  // Güvenlik: reauthenticate gerektirir
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

// ─── Veri indirme ──────────────────────────────────────────────────────────
/**
 * Kullanıcının Firestore verilerini JSON olarak döndürür.
 * Tarayıcıda download tetikler.
 */
export async function downloadMyData(uid: string): Promise<void> {
  const { getUserProfile } = await import('./firestore')
  const profile = await getUserProfile(uid)

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    notice: 'Bu dosya OpenUni platformundan dışa aktarılan kişisel verilerinizi içerir.',
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `openuni-verilerim-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Auth state subscription ───────────────────────────────────────────────
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user && isSessionExpired()) {
      clearSession()
      await signOut(auth)
      callback(null)
      return
    }
    callback(user)
  })
}

// ─── Ensure profile ────────────────────────────────────────────────────────
export async function ensureUserProfile(user: User) {
  try {
    const ref  = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid, email: user.email,
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Kullanıcı',
        department: '', grade: null, role: 'student',
        isVerified: false, bookmarks: [],
        joinedAt: serverTimestamp(), lastActiveAt: serverTimestamp(),
      })
    }
  } catch { /* Rules hazır değilse sessiz */ }
}
