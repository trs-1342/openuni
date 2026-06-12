// src/app/api/send-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getBearerToken } from '@/lib/server-auth'
import { loadEmailTemplate } from '@/lib/server-templates'
import { renderTemplateText, renderTemplateHtml } from '@/lib/email-templates'
import { sendTemplatedEmail } from '@/lib/mailer'
import { writeServerLog } from '@/lib/server-log'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // GÜVENLİK: yalnızca giriş yapmış kullanıcı; e-posta SADECE kendi adresine gider.
    const caller = await requireAuth(req)
    if (!caller || !caller.email) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const email = caller.email
    const { displayName, verificationLink } = await req.json()

    // Validasyon
    if (!verificationLink) {
      return NextResponse.json({ error: 'Eksik parametre.' }, { status: 400 })
    }
    // D-5 (denetim): link yalnızca kendi uygulamamıza işaret edebilir
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'
    if (!verificationLink.startsWith('https://') ||
        !(verificationLink.startsWith(APP_URL) || verificationLink.startsWith('https://openigu.vercel.app'))) {
      return NextResponse.json({ error: 'Geçersiz link.' }, { status: 400 })
    }

    // Rate limit (O-2: kalıcı — instance'lar arası ortak): e-posta başına 60 sn'de 1
    if (await isRateLimited(`verify:${email}`, 1, 60_000)) {
      return NextResponse.json(
        { error: 'Çok fazla istek. 1 dakika bekleyip tekrar deneyin.' },
        { status: 429 }
      )
    }

    const firstName = (displayName ?? email.split('@')[0]).split(' ')[0]

    // O2: şablon Firestore'dan (yoksa varsayılan); değişkenler escape edilerek render edilir
    const tpl  = await loadEmailTemplate('verification', getBearerToken(req))
    const vars = { ad: firstName, link: verificationLink }
    await sendTemplatedEmail({
      to:       email,
      subject:  renderTemplateText(tpl.subject, vars),
      bodyHtml: renderTemplateHtml(tpl.body, vars),
      button:   { label: '✉️ E-postamı Doğrula', url: verificationLink },
    })

    // O1: e-posta gönderim logu
    writeServerLog({
      level: 'info', event: 'email.sent', source: 'email',
      message: `Doğrulama e-postası gönderildi: ${email}`,
      userId: caller.uid, userEmail: email,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-verification]', err?.message)
    writeServerLog({
      level: 'error', event: 'email.error', source: 'email',
      message: 'Doğrulama e-postası gönderilemedi', details: { error: String(err?.message ?? err) },
    })
    return NextResponse.json({ error: 'Email gönderilemedi.' }, { status: 500 })
  }
}
