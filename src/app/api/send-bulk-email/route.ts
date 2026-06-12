// src/app/api/send-bulk-email/route.ts — Owner'a özel toplu/seçili e-posta (O3)
//
// YALNIZCA owner (NEXT_PUBLIC_ADMIN_EMAIL) çağırabilir; alıcı listesi, başlık ve
// içerik owner panelinden gelir. İçerik düz metindir, escape edilerek standart
// OpenUni çerçevesinde gönderilir ({{ad}} yer tutucusu alıcı adına çözülür).
// Planlı gönderimler `scheduledEmails` koleksiyonunda bekler; zamanı gelenler
// owner paneli açıldığında bu uca tekrar gönderilir (bkz. /dashboard/email).

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server-auth'
import { renderTemplateText, renderTemplateHtml } from '@/lib/email-templates'
import { sendTemplatedEmail } from '@/lib/mailer'
import { writeServerLog } from '@/lib/server-log'

const OWNER_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'khalil.khattab@ogr.gelisim.edu.tr'
const MAX_RECIPIENTS = 100

export async function POST(req: NextRequest) {
  try {
    // GÜVENLİK: yalnızca owner (token'daki e-posta sabit owner adresiyle eşleşmeli)
    const caller = await requireAuth(req)
    if (!caller || caller.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Bu işlem yalnızca sistem sahibine açıktır.' }, { status: 403 })
    }

    const { recipients, subject, content } = await req.json()

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'En az bir alıcı seçilmeli.' }, { status: 400 })
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Tek seferde en fazla ${MAX_RECIPIENTS} alıcıya gönderilebilir.` }, { status: 400 })
    }
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 200) {
      return NextResponse.json({ error: 'Geçerli bir başlık girin (max 200 karakter).' }, { status: 400 })
    }
    if (typeof content !== 'string' || !content.trim() || content.length > 10000) {
      return NextResponse.json({ error: 'Geçerli bir içerik girin (max 10000 karakter).' }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const valid = recipients.filter((r: any) =>
      r && typeof r.email === 'string' && emailRe.test(r.email))
    if (valid.length === 0) {
      return NextResponse.json({ error: 'Geçerli alıcı bulunamadı.' }, { status: 400 })
    }

    // Her alıcıya tek tek gönder ({{ad}} kişiselleştirmesi için)
    let sent = 0
    const failed: string[] = []
    for (const r of valid) {
      const vars = { ad: String(r.name ?? r.email.split('@')[0]) }
      try {
        await sendTemplatedEmail({
          to:       r.email,
          subject:  renderTemplateText(subject, vars),
          bodyHtml: renderTemplateHtml(content, vars),
        })
        sent++
      } catch {
        failed.push(r.email)
      }
    }

    writeServerLog({
      level: failed.length > 0 ? 'warn' : 'info',
      event: 'email.bulk', source: 'email',
      message: `Toplu e-posta gönderildi: ${sent}/${valid.length} alıcı — "${subject.slice(0, 80)}"`,
      details: { sent, failedCount: failed.length, failed: failed.slice(0, 20) },
      userId: caller.uid, userEmail: caller.email,
    })

    return NextResponse.json({ ok: true, sent, failed })
  } catch (err: any) {
    console.error('[send-bulk-email]', err?.message)
    writeServerLog({
      level: 'error', event: 'email.error', source: 'email',
      message: 'Toplu e-posta gönderimi başarısız', details: { error: String(err?.message ?? err) },
    })
    return NextResponse.json({ error: 'Gönderim başarısız.' }, { status: 500 })
  }
}
