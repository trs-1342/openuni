// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, type, subject, message } = body

    if (!name || !email || !message || !type) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
    }

    // E-posta uzunluk kontrolü
    if (message.length < 10) {
      return NextResponse.json({ error: 'Mesaj çok kısa.' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const typeLabels: Record<string, string> = {
      feedback:   '💬 Geri Bildirim',
      complaint:  '⚠️ Şikayet',
      suggestion: '💡 Öneri',
      bug:        '🐛 Hata Bildirimi',
      other:      '📌 Diğer',
    }

    const typeLabel = typeLabels[type] ?? type

    // Alıcıya gönderilecek e-posta
    await transporter.sendMail({
      from:    `"OpenUni İletişim" <${process.env.SMTP_USER}>`,
      to:      process.env.CONTACT_EMAIL ?? process.env.SMTP_USER,
      replyTo: email,
      subject: `[OpenUni ${typeLabel}] ${subject || 'Yeni Mesaj'}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#0F1117;color:#E2E8F0;padding:24px;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;border-bottom:1px solid #1E2535;padding-bottom:16px;">
            <div style="width:36px;height:36px;background:#4F7EF7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;text-align:center;line-height:36px;">O</div>
            <div>
              <div style="font-weight:700;color:#fff;">OpenUni</div>
              <div style="font-size:12px;color:#64748B;">Yeni İletişim Formu Mesajı</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0;color:#64748B;font-size:13px;width:120px;">Gönderen</td>
              <td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748B;font-size:13px;">E-posta</td>
              <td style="padding:8px 0;font-size:13px;"><a href="mailto:${email}" style="color:#4F7EF7;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748B;font-size:13px;">Tür</td>
              <td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${typeLabel}</td>
            </tr>
            ${subject ? `<tr><td style="padding:8px 0;color:#64748B;font-size:13px;">Konu</td><td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${subject}</td></tr>` : ''}
            <tr>
              <td style="padding:8px 0;color:#64748B;font-size:13px;">Tarih</td>
              <td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${new Date().toLocaleString('tr-TR')}</td>
            </tr>
          </table>

          <div style="background:#1A2235;border-radius:8px;padding:16px;border:1px solid #1E2535;">
            <div style="font-size:12px;color:#64748B;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Mesaj</div>
            <div style="color:#E2E8F0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>

          <div style="margin-top:20px;font-size:11px;color:#3A4560;border-top:1px solid #1E2535;padding-top:16px;">
            Bu e-posta OpenUni iletişim formu aracılığıyla gönderilmiştir.
            Yanıtlamak için reply-to adresini kullanabilirsiniz.
          </div>
        </div>
      `,
    })

    // Gönderen kişiye otomatik yanıt
    await transporter.sendMail({
      from:    `"OpenUni" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: 'Mesajınız alındı — OpenUni',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#0F1117;color:#E2E8F0;padding:24px;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="width:36px;height:36px;background:#4F7EF7;border-radius:8px;font-size:18px;font-weight:700;color:white;text-align:center;line-height:36px;">O</div>
            <div style="font-weight:700;color:#fff;font-size:18px;">OpenUni</div>
          </div>
          <p style="color:#E2E8F0;font-size:15px;">Merhaba <strong>${name}</strong>,</p>
          <p style="color:#94A3B8;font-size:14px;line-height:1.6;">
            Mesajınız başarıyla alındı. En kısa sürede değerlendirip size geri döneceğiz.
          </p>
          <div style="background:#1A2235;border-radius:8px;padding:14px;margin:20px 0;border:1px solid #1E2535;">
            <div style="font-size:12px;color:#64748B;margin-bottom:6px;">Mesaj türü: ${typeLabel}</div>
            ${subject ? `<div style="font-size:12px;color:#64748B;">Konu: ${subject}</div>` : ''}
          </div>
          <p style="color:#64748B;font-size:12px;margin-top:24px;">
            Bu bir otomatik yanıttır. Bu e-postayı yanıtlamayınız.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Contact API]', err)
    return NextResponse.json(
      { error: 'E-posta gönderilemedi. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
