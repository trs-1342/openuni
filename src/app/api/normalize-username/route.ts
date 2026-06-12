// src/app/api/normalize-username/route.ts — Username format migrasyonu (Y-1, sunucu)
//
// Username artık Firestore kurallarında KALICI (istemci değiştiremez). Standarda
// uymayan eski username'lerin login'deki tembel migrasyonu bu yüzden sunucuda
// (admin SDK, kuralları aşarak) yapılır. ensureUserProfile login'de çağırır.
// Admin SDK yoksa 503 — migrasyon ertelenir, mevcut username çalışmaya devam eder.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server-auth'
import { getAdminApp, isAdminConfigured } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { validateUsername, normalizeUsername } from '@/lib/utils'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const caller = await requireAuth(req)
    if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    if (await isRateLimited(`normalize:${caller.uid}`, 3, 60_000)) {
      return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 })
    }
    if (!isAdminConfigured()) {
      return NextResponse.json({ ok: false, reason: 'unconfigured' }, { status: 503 })
    }

    const db = getFirestore(getAdminApp()!)
    const userRef = db.doc(`users/${caller.uid}`)
    const snap = await userRef.get()
    if (!snap.exists) return NextResponse.json({ error: 'Profil yok.' }, { status: 404 })

    const current = snap.get('username') as string | undefined
    // Username yok → ensureUserProfile ilk atamayı yapar (kurallar ilk atamaya izin verir)
    if (!current) return NextResponse.json({ ok: true, username: null })
    // Zaten standarda uygun → işlem yok
    if (!validateUsername(current)) return NextResponse.json({ ok: true, username: current })

    // Normalize et + benzersizliği garanti et
    let candidate = normalizeUsername(current, caller.uid)
    const taken = await db.collection('users')
      .where('username', '==', candidate).limit(1).get()
    if (!taken.empty && taken.docs[0].id !== caller.uid) {
      candidate = `${candidate.slice(0, 24)}_${caller.uid.slice(0, 5)}`
    }

    await userRef.update({ username: candidate })

    // Gönderilerdeki author.username'i güncelle (≤500'lük batch'ler)
    const posts = await db.collection('posts').where('authorId', '==', caller.uid).get()
    let batch = db.batch(); let count = 0
    for (const p of posts.docs) {
      batch.update(p.ref, { 'author.username': candidate })
      if (++count >= 450) { await batch.commit(); batch = db.batch(); count = 0 }
    }
    if (count > 0) await batch.commit()

    const { writeServerLog } = await import('@/lib/server-log')
    writeServerLog({
      level: 'info', event: 'user.username_migrated', source: 'auth',
      message: `Username normalize edildi: ${current} → ${candidate}`,
      userId: caller.uid, userEmail: caller.email,
    })

    return NextResponse.json({ ok: true, username: candidate })
  } catch (err: any) {
    console.error('[normalize-username]', err?.message)
    return NextResponse.json({ error: 'Migrasyon başarısız.' }, { status: 500 })
  }
}
