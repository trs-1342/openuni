import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
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
  return AUTH_ERRORS[code] ?? 'Bir hata oluştu. Lütfen tekrar deneyin.'
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
  const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password)
  await updateProfile(user, { displayName: data.displayName })
  await sendEmailVerification(user)
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

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
