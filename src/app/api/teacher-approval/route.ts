// src/app/api/teacher-approval/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, verifyIdToken, getUserRole, serverHasCapability } from '@/lib/server-auth'
import { loadEmailTemplate } from '@/lib/server-templates'
import { renderTemplateText, renderTemplateHtml } from '@/lib/email-templates'
import { sendTemplatedEmail } from '@/lib/mailer'
import { writeServerLog } from '@/lib/server-log'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'

export async function POST(req: NextRequest) {
  try {
    // GÜVENLİK: keyfi adrese e-posta gönderildiği için çağıran admin/moderatör olmalı.
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const caller = await verifyIdToken(token)
    if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const roleInfo = await getUserRole(caller.uid, token)
    // Capability modeliyle uyumlu: owner / manageUsers / moderateGlobal (veya eski admin/moderator)
    if (!serverHasCapability(roleInfo, 'moderateGlobal')) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const { action, email, displayName } = await req.json()

    if (!email || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametre.' }, { status: 400 })
    }

    const firstName = (displayName ?? email.split('@')[0]).split(' ')[0]

    // O2: şablon Firestore'dan (yoksa varsayılan); değişkenler escape edilerek render edilir
    const isApprove = action === 'approve'
    const tplId     = isApprove ? 'teacherApprove' : 'teacherReject'
    const link      = isApprove ? `${APP_URL}/auth/login` : `${APP_URL}/contact`
    const tpl  = await loadEmailTemplate(tplId, token)
    const vars = { ad: firstName, link }
    await sendTemplatedEmail({
      to:       email,
      subject:  renderTemplateText(tpl.subject, vars),
      bodyHtml: renderTemplateHtml(tpl.body, vars),
      button:   isApprove
        ? { label: 'Giriş Yap →', url: link }
        : { label: 'İletişime Geç →', url: link },
    })

    // O1: e-posta gönderim logu
    writeServerLog({
      level: 'info', event: 'email.sent', source: 'email',
      message: `Öğretmen ${isApprove ? 'onay' : 'ret'} e-postası gönderildi: ${email}`,
      userId: caller.uid, userEmail: caller.email,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[teacher-approval]', err?.message)
    writeServerLog({
      level: 'error', event: 'email.error', source: 'email',
      message: 'Öğretmen onay/ret e-postası gönderilemedi', details: { error: String(err?.message ?? err) },
    })
    return NextResponse.json({ error: 'Email gönderilemedi.' }, { status: 500 })
  }
}
