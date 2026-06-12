// src/lib/firebase-admin.ts — Sunucu tarafı Firebase Admin (yalnızca API route'larında)
//
// Username ile giriş için kullanılır: e-posta gizli (private alt-doküman) olduğundan,
// username→e-posta çözümü ancak ayrıcalıklı (admin) okuma ile güvenli yapılabilir.
//
// Yapılandırma (Vercel env): aşağıdakilerden biri tanımlı olmalı:
//   FIREBASE_SERVICE_ACCOUNT  = servis hesabı JSON'unun tamamı (tek satır)
//   veya: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
// Tanımlı değilse admin devre dışı kalır (username ile giriş çalışmaz; e-posta ile giriş çalışır).

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let cachedApp: App | null = null

function loadCredentials(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    try {
      const j = JSON.parse(raw)
      if (j.project_id && j.client_email && j.private_key) {
        return { projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key }
      }
    } catch { /* JSON parse hatası */ }
  }
  const projectId   = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let   privateKey  = process.env.FIREBASE_PRIVATE_KEY
  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n') // env'de kaçışlı satır sonları
    return { projectId, clientEmail, privateKey }
  }
  return null
}

export function getAdminApp(): App | null {
  if (cachedApp) return cachedApp
  if (getApps().length > 0) { cachedApp = getApps()[0]; return cachedApp }
  const creds = loadCredentials()
  if (!creds) return null
  cachedApp = initializeApp({ credential: cert(creds) })
  return cachedApp
}

export function isAdminConfigured(): boolean {
  return getAdminApp() !== null
}

// username → e-posta çözümü (yalnızca sunucu; ayrıcalıklı okuma).
// Bulunamazsa null döner.
export async function getEmailByUsername(username: string): Promise<string | null> {
  const app = getAdminApp()
  if (!app) return null
  const db = getFirestore(app)
  const snap = await db.collection('users')
    .where('username', '==', username.toLowerCase()).limit(1).get()
  if (snap.empty) return null
  const uid = snap.docs[0].id
  // E-posta private alt-dokümanda; admin kuralları aşar
  const priv = await db.doc(`users/${uid}/private/contact`).get()
  return (priv.exists ? (priv.data()?.email as string | undefined) : undefined) ?? null
}
