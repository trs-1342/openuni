import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getBearerToken } from '@/lib/server-auth'
import { loadEmailTemplate } from '@/lib/server-templates'
import { renderTemplateText, renderTemplateHtml } from '@/lib/email-templates'
import { sendTemplatedEmail } from '@/lib/mailer'
import { writeServerLog } from '@/lib/server-log'

export async function POST(req: NextRequest) {
  try {
    // GÜVENLİK: yalnızca giriş yapmış kullanıcı; e-posta SADECE kendi adresine gider.
    const caller = await requireAuth(req)
    if (!caller || !caller.email) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
    const { displayName, postTitle, postContent, postUrl, channelName, spaceName } = await req.json()
    if (!postTitle || !postUrl) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    // O2: şablon Firestore'dan (yoksa varsayılan); değişkenler escape edilerek render edilir
    const preview = String(postContent ?? '').replace(/\*\*/g, '').slice(0, 200)
      + (String(postContent ?? '').length > 200 ? '…' : '')
    const tpl  = await loadEmailTemplate('postNotify', getBearerToken(req))
    const vars = {
      ad:       String(displayName ?? caller.email.split('@')[0]),
      baslik:   String(postTitle),
      ozet:     preview,
      kanal:    String(channelName ?? ''),
      topluluk: String(spaceName ?? ''),
      link:     String(postUrl),
    }
    // Açık relay engeli: alıcı istemciden alınmaz, doğrulanmış kullanıcının kendi e-postasıdır.
    await sendTemplatedEmail({
      to:       caller.email,
      subject:  renderTemplateText(tpl.subject, vars),
      bodyHtml: renderTemplateHtml(tpl.body, vars),
      button:   { label: 'Paylaşımı Görüntüle →', url: String(postUrl) },
    })

    writeServerLog({
      level: 'info', event: 'email.sent', source: 'email',
      message: `Paylaşım bildirimi gönderildi: ${caller.email}`,
      userId: caller.uid, userEmail: caller.email,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-post-notify]', err?.message)
    writeServerLog({
      level: 'error', event: 'email.error', source: 'email',
      message: 'Paylaşım bildirimi gönderilemedi', details: { error: String(err?.message ?? err) },
    })
    return NextResponse.json({ error: 'Gönderilemedi' }, { status: 500 })
  }
}
