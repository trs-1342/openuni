// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { isRateLimited, clientIp } from '@/lib/rate-limit'

// HTML enjeksiyonunu önlemek için kullanıcı girdisini escape et
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  try {
    // O-2 (denetim): herkese açık form — IP başına 10 dk'da 5 mesaj (spam engeli;
    // kampüs NAT'ı arkasındaki meşru kullanıcılar için çok sıkı tutulmadı)
    if (await isRateLimited(`contact:${clientIp(req)}`, 5, 600_000)) {
      return NextResponse.json({ error: 'Çok fazla mesaj gönderildi. Lütfen sonra tekrar deneyin.' }, { status: 429 })
    }

    const body = await req.json()
    const { name, email, type, subject, message } = body

    if (!name || !email || !message || !type) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
    }

    // Geçerli e-posta formatı (CRLF/başlık enjeksiyonu ve geçersiz adres engeli)
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Geçerli bir e-posta girin.' }, { status: 400 })
    }

    // E-posta uzunluk kontrolü
    if (message.length < 10) {
      return NextResponse.json({ error: 'Mesaj çok kısa.' }, { status: 400 })
    }
    if (message.length > 5000 || String(name).length > 200 || String(subject ?? '').length > 200) {
      return NextResponse.json({ error: 'Girdi çok uzun.' }, { status: 400 })
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

    const typeLabel = typeLabels[type] ?? esc(type)

    // Yalnızca sabit admin adresine gönderilir (açık relay engeli)
    await transporter.sendMail({
      from:    `"OpenUni İletişim" <${process.env.SMTP_USER}>`,
      to:      process.env.CONTACT_EMAIL ?? process.env.SMTP_USER,
      replyTo: email,
      // D-7: konu satırından satır sonları temizlenir (header injection savunma katmanı)
      subject: `[OpenUni ${typeLabel}] ${esc(subject).replace(/[\r\n]+/g, ' ') || 'Yeni Mesaj'}`,
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
              <td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${esc(name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748B;font-size:13px;">E-posta</td>
              <td style="padding:8px 0;font-size:13px;"><a href="mailto:${esc(email)}" style="color:#4F7EF7;">${esc(email)}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748B;font-size:13px;">Tür</td>
              <td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${typeLabel}</td>
            </tr>
            ${subject ? `<tr><td style="padding:8px 0;color:#64748B;font-size:13px;">Konu</td><td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${esc(subject)}</td></tr>` : ''}
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

    // NOT: Gönderene otomatik yanıt e-postası bilinçli olarak kaldırıldı.
    // İstemcinin verdiği keyfi adrese e-posta göndermek açık mail relay'e (spam amplifikasyonu)
    // yol açıyordu. Form herkese açık olduğundan tek giden e-posta sabit admin adresinedir.

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Contact API]', err)
    return NextResponse.json(
      { error: 'E-posta gönderilemedi. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
