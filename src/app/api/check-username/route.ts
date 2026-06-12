// src/app/api/check-username/route.ts — Kayıt öncesi username durumu (Y-1)
//
// Username benzersizliği ve rezervasyon (deletedUsernames) kontrolü artık hesap
// oluşturulmadan ÖNCE sunucudan sorulur. Admin SDK yoksa { unchecked: true } döner
// ve kayıt mevcut davranışla devam eder (kontrol edilememesi kaydı engellemez).
// Not: username "alınmış mı" bilgisi kayıt UX'inin doğası gereği herkese açıktır.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, isAdminConfigured } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { validateUsername } from '@/lib/utils'
import { isRateLimited, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    if (await isRateLimited(`checkuser:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 })
    }

    const { username } = await req.json()
    if (typeof username !== 'string') {
      return NextResponse.json({ error: 'Kullanıcı adı gerekli.' }, { status: 400 })
    }
    const u = username.toLowerCase().trim()
    if (validateUsername(u)) {
      return NextResponse.json({ available: false, reserved: false, reason: 'format' })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ available: true, reserved: false, unchecked: true })
    }

    const db = getFirestore(getAdminApp()!)
    const [taken, reservedSnap] = await Promise.all([
      db.collection('users').where('username', '==', u).limit(1).get(),
      db.doc(`deletedUsernames/${u}`).get(),
    ])
    const reserved = reservedSnap.exists
    return NextResponse.json({ available: taken.empty && !reserved, reserved })
  } catch (err: any) {
    console.error('[check-username]', err?.message)
    // Kontrol hatası kaydı engellemesin
    return NextResponse.json({ available: true, reserved: false, unchecked: true })
  }
}
