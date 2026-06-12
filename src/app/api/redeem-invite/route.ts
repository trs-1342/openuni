// src/app/api/redeem-invite/route.ts — Davet kodunu kullan (sunucu, admin SDK)
//
// Davet eden güvenilir (invite yetkili) biri olduğundan, davetle gelen kullanıcıya
// erişim (isAdminVerified) verilir; davet sayacı artırılır; invitedBy yetkili biçimde yazılır.
// Admin yapılandırılmadıysa 503 döner (istemci yine de topluluğa katılabilir, ama onay bekler).

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server-auth'
import { getAdminApp, isAdminConfigured } from '@/lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const caller = await requireAuth(req)
    if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: 'Davet sistemi yapılandırılmadı.' }, { status: 503 })
    }
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Davet kodu gerekli.' }, { status: 400 })
    }

    const db = getFirestore(getAdminApp()!)
    const inviteRef = db.doc(`invites/${code.toLowerCase().trim()}`)
    const snap = await inviteRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Davet bulunamadı.' }, { status: 404 })
    }
    const inv = snap.data() as any

    // Süre dolmuş mu?
    if (inv.expiresAt && inv.expiresAt.toDate && inv.expiresAt.toDate() < new Date()) {
      return NextResponse.json({ error: 'Davetin süresi dolmuş.' }, { status: 410 })
    }
    // Kullanım limiti (maxUses 0 = sınırsız)
    if (inv.maxUses && inv.maxUses > 0 && (inv.uses ?? 0) >= inv.maxUses) {
      return NextResponse.json({ error: 'Davet kullanım limiti dolmuş.' }, { status: 410 })
    }
    // Davet eden kendi davetini kullanamaz
    if (inv.createdBy === caller.uid) {
      return NextResponse.json({ error: 'Kendi davetini kullanamazsın.' }, { status: 400 })
    }

    // Idempotency: kullanıcı daha önce davetle doğrulandıysa sayacı tekrar tüketme
    const userRef = db.doc(`users/${caller.uid}`)
    const alreadyInvited = (await userRef.get()).get('invitedBy')
    if (alreadyInvited) {
      return NextResponse.json({ ok: true, spaceId: inv.spaceId ?? null, inviterName: inv.createdByName ?? null })
    }

    // Erişim ver + davet edeni kaydet (yetkili biçimde)
    await userRef.set({ isAdminVerified: true, invitedBy: inv.createdBy }, { merge: true })
    // Davet sayacını artır
    await inviteRef.update({ uses: FieldValue.increment(1) })

    // O1: davet kullanımı logu
    const { writeServerLog } = await import('@/lib/server-log')
    writeServerLog({
      level: 'info', event: 'invite.redeem', source: 'invite',
      message: `Davet kullanıldı: ${code.toLowerCase().trim()}`,
      details: { inviter: inv.createdBy, spaceId: inv.spaceId ?? null },
      userId: caller.uid, userEmail: caller.email,
    })

    return NextResponse.json({ ok: true, spaceId: inv.spaceId ?? null, inviterName: inv.createdByName ?? null })
  } catch (err: any) {
    console.error('[redeem-invite]', err?.message)
    return NextResponse.json({ error: 'Davet kullanılamadı.' }, { status: 500 })
  }
}
