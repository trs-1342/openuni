import { NextRequest, NextResponse } from 'next/server'
import { sendAdminLog } from '@/lib/mailer'
import { requireAuth } from '@/lib/server-auth'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // GÜVENLİK: yalnızca giriş yapmış kullanıcı admin'e log gönderebilir (anonim spam engeli)
    const caller = await requireAuth(req)
    if (!caller) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    // O-2: kullanıcı başına dakikada 3 admin-log e-postası (spam engeli)
    if (await isRateLimited(`adminlog:${caller.uid}`, 3, 60_000)) {
      return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 })
    }
    const { subject, title, rows, level } = await req.json()
    // Y-4 (denetim): şema/uzunluk doğrulaması — içerik mailer'da ayrıca escape edilir
    if (typeof subject !== 'string' || typeof title !== 'string' || !subject.trim() || !title.trim()) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }
    if (subject.length > 200 || title.length > 200) {
      return NextResponse.json({ error: 'Girdi çok uzun' }, { status: 400 })
    }
    if (rows !== undefined && !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Geçersiz format' }, { status: 400 })
    }
    const safeRows = (rows ?? []).slice(0, 12).map((r: any) => ({
      label: String(r?.label ?? '').slice(0, 100),
      value: String(r?.value ?? '').slice(0, 300),
    }))
    await sendAdminLog({ subject, title, rows: safeRows, level })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-admin-log]', err?.message)
    return NextResponse.json({ error: 'Gönderilemedi' }, { status: 500 })
  }
}
