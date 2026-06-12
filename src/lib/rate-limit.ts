// src/lib/rate-limit.ts — Kalıcı rate limit (O-2 denetim düzeltmesi)
//
// In-memory Map'ler serverless'ta instance başına sıfırlandığından tek başına
// etkisizdi. Bu helper iki katman kullanır:
//   1) Bellek (hızlı yol — aynı instance'a gelen ardışık istekler)
//   2) Firestore `rateLimits/{key}` (admin SDK varsa — instance'lar arası ortak)
// Admin SDK yoksa yalnızca bellek katmanı çalışır (mevcut davranıştan kötü değil).
// Dönüş: true = LİMİT AŞILDI (istek engellenmeli).

import { getAdminApp, isAdminConfigured } from './firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const mem = new Map<string, { count: number; reset: number }>()

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_.@-]/g, '_').slice(0, 200)
}

export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const k = sanitizeKey(key)

  // 1) Bellek katmanı
  const m = mem.get(k)
  if (m && now < m.reset) {
    m.count++
    if (m.count > max) return true
  } else {
    mem.set(k, { count: 1, reset: now + windowMs })
    // bellek sızıntısını önle
    setTimeout(() => { const cur = mem.get(k); if (cur && Date.now() >= cur.reset) mem.delete(k) }, windowMs + 1000)
  }

  // 2) Kalıcı katman (admin SDK)
  try {
    if (!isAdminConfigured()) return false
    const db = getFirestore(getAdminApp()!)
    const ref = db.collection('rateLimits').doc(k)
    return await db.runTransaction(async tx => {
      const snap = await tx.get(ref)
      const d = snap.exists ? (snap.data() as { count: number; reset: number }) : null
      if (!d || now > d.reset) {
        tx.set(ref, { count: 1, reset: now + windowMs })
        return false
      }
      tx.update(ref, { count: d.count + 1 })
      return d.count + 1 > max
    })
  } catch {
    return false  // limiter hatası isteği düşürmez
  }
}

/** Request'ten istemci IP'sini çıkarır (Vercel: x-forwarded-for). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}
