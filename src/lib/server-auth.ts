// src/lib/server-auth.ts — Sunucu tarafı kimlik doğrulama (firebase-admin SDK olmadan)
//
// API route'larının çağıranı doğrulaması için. Firebase ID token'ı Google'ın
// public identitytoolkit REST ucu ile doğrularız (servis hesabı gerekmez).
// İstemci `Authorization: Bearer <idToken>` header'ı gönderir.

import { NextRequest } from 'next/server'

const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

export interface VerifiedUser {
  uid: string
  email: string | null
  emailVerified: boolean
}

/** Request'ten Bearer token'ı çıkarır. */
export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

/**
 * Firebase ID token'ı doğrular. Geçerliyse kullanıcıyı, değilse null döner.
 * identitytoolkit accounts:lookup — token süresi/geçerliliği Google tarafından kontrol edilir.
 */
export async function verifyIdToken(idToken: string): Promise<VerifiedUser | null> {
  if (!API_KEY) {
    console.error('[server-auth] NEXT_PUBLIC_FIREBASE_API_KEY tanımsız')
    return null
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const user = data?.users?.[0]
    if (!user?.localId) return null
    return {
      uid:           user.localId,
      email:         user.email ?? null,
      emailVerified: user.emailVerified === true,
    }
  } catch (err) {
    console.error('[server-auth] verifyIdToken hatası:', (err as any)?.message)
    return null
  }
}

/**
 * Kullanıcının Firestore'daki rolünü ID token ile (REST üzerinden) okur.
 * Çağıranın yetkisini (admin/moderator) doğrulamak için kullanılır.
 */
export interface ServerRoleInfo {
  role?: string
  isAdminVerified?: boolean
  isSystemOwner?: boolean
  capabilities?: string[]
}

export async function getUserRole(uid: string, idToken: string): Promise<ServerRoleInfo | null> {
  if (!PROJECT_ID) return null
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const f = data?.fields ?? {}
    return {
      role:            f.role?.stringValue,
      isAdminVerified: f.isAdminVerified?.booleanValue === true,
      isSystemOwner:   f.isSystemOwner?.booleanValue === true,
      capabilities:    (f.capabilities?.arrayValue?.values ?? []).map((v: any) => v.stringValue).filter(Boolean),
    }
  } catch {
    return null
  }
}

// Sunucuda yetki kontrolü (capability modeliyle uyumlu — owner/admin/moderator dahil)
export function serverHasCapability(info: ServerRoleInfo | null, cap: 'moderateGlobal' | 'manageUsers'): boolean {
  if (!info) return false
  if (info.isSystemOwner) return true
  if (Array.isArray(info.capabilities) && info.capabilities.includes(cap)) return true
  if (cap === 'moderateGlobal') return info.role === 'admin' || info.role === 'moderator'
  if (cap === 'manageUsers')    return info.role === 'admin'
  return false
}

/** Request'i doğrular; geçerli kullanıcı döner ya da null. */
export async function requireAuth(req: NextRequest): Promise<VerifiedUser | null> {
  const token = getBearerToken(req)
  if (!token) return null
  return verifyIdToken(token)
}
