import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  reload,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
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

export function getAuthErrorMessage(code: string): string | null {
  return AUTH_ERRORS[code] ?? null
}

export interface RegisterData {
  email: string
  password: string
  displayName: string
  department: string
  grade?: string
}

export async function registerUser(data: RegisterData): Promise<User> {
  if (!isValidStudentEmail(data.email)) {
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta kabul edilir.')
  }

  // 1) Firebase Auth kaydı — bu hata verirse catch'e düşer, doğru davranış
  const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password)

  // 2-4) Bunlar hata verse de auth başarılı sayılır
  try { await updateProfile(user, { displayName: data.displayName }) } catch { /* kritik değil */ }
  try { await sendEmailVerification(user) } catch { /* sonra tekrar gönderilebilir */ }
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid:          user.uid,
      email:        user.email,
      displayName:  data.displayName,
      department:   data.department,
      grade:        data.grade ? parseInt(data.grade) : null,
      role:         'student',
      isVerified:   false,
      joinedAt:     serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    })
  } catch { /* Rules ayarlanana kadar sessiz geç */ }

  return user
}

export async function loginUser(email: string, password: string): Promise<User> {
  if (!isValidStudentEmail(email)) {
    throw new Error('Yalnızca @ogr.gelisim.edu.tr uzantılı e-posta ile giriş yapılabilir.')
  }
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

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

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

/**
 * İlk girişte veya Firestore yazımı başarısız olursa profil oluştur.
 * Permission hatası dahil tüm hatalar sessizce yutulur —
 * Rules ayarlandığında otomatik çalışmaya başlar.
 */
export async function ensureUserProfile(user: User) {
  try {
    const ref  = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:          user.uid,
        email:        user.email,
        displayName:  user.displayName ?? user.email?.split('@')[0] ?? 'Kullanıcı',
        department:   '',
        grade:        null,
        role:         'student',
        isVerified:   false,
        joinedAt:     serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      })
    }
  } catch {
    // Rules henüz ayarlı değilse sessiz geç — konsola bile yazmıyoruz
  }
}
