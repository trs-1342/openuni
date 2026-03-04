// src/app/api/send-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Rate limit: aynı email için 60 saniyede 1 istek
const rateLimitMap = new Map<string, number>()

function isRateLimited(email: string): boolean {
  const last = rateLimitMap.get(email)
  const now  = Date.now()
  if (last && now - last < 60_000) return true
  rateLimitMap.set(email, now)
  // Bellek sızıntısını önle — 10 dakika sonra temizle
  setTimeout(() => rateLimitMap.delete(email), 600_000)
  return false
}

export async function POST(req: NextRequest) {
  try {
    const { email, displayName, verificationLink } = await req.json()

    // Validasyon
    if (!email || !verificationLink) {
      return NextResponse.json({ error: 'Eksik parametre.' }, { status: 400 })
    }
    if (!email.endsWith('@ogr.gelisim.edu.tr')) {
      return NextResponse.json({ error: 'Geçersiz email.' }, { status: 400 })
    }
    if (!verificationLink.startsWith('https://')) {
      return NextResponse.json({ error: 'Geçersiz link.' }, { status: 400 })
    }

    // Rate limit
    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: 'Çok fazla istek. 1 dakika bekleyip tekrar deneyin.' },
        { status: 429 }
      )
    }

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const firstName = (displayName ?? email.split('@')[0]).split(' ')[0]

    await transporter.sendMail({
      from:    `"OpenUni" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: 'E-posta adresinizi doğrulayın — OpenUni',
      html: `
        <!DOCTYPE html>
        <html lang="tr">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#0F1117;font-family:system-ui,-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#131929;border-radius:16px;border:1px solid #1E2535;overflow:hidden;max-width:560px;">

                <!-- Header -->
                <tr>
                  <td style="padding:28px 32px 24px;border-bottom:1px solid #1E2535;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px;height:36px;background:#4F7EF7;border-radius:10px;text-align:center;vertical-align:middle;">
                          <span style="color:white;font-weight:700;font-size:18px;line-height:36px;">O</span>
                        </td>
                        <td style="padding-left:10px;">
                          <div style="font-weight:700;color:#fff;font-size:16px;">OpenUni</div>
                          <div style="font-size:11px;color:#64748B;">IGÜ Platformu</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F1F5F9;">
                      Merhaba, ${firstName} 👋
                    </p>
                    <p style="margin:0 0 24px;font-size:14px;color:#94A3B8;line-height:1.6;">
                      OpenUni'ye hoş geldin! Hesabını aktifleştirmek için aşağıdaki butona tıkla.
                      Bu link <strong style="color:#E2E8F0;">24 saat</strong> geçerlidir.
                    </p>

                    <!-- Button -->
                    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                      <tr>
                        <td style="background:#4F7EF7;border-radius:10px;">
                          <a href="${verificationLink}"
                            style="display:inline-block;padding:14px 32px;color:#fff;font-weight:600;font-size:15px;text-decoration:none;border-radius:10px;">
                            ✉️ E-postamı Doğrula
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link fallback -->
                    <div style="background:#1A2235;border-radius:8px;padding:14px;border:1px solid #1E2535;">
                      <p style="margin:0 0 6px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">
                        Buton çalışmıyorsa bu linki kopyalayıp tarayıcına yapıştır:
                      </p>
                      <p style="margin:0;font-size:11px;color:#4F7EF7;word-break:break-all;">
                        ${verificationLink}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 32px;border-top:1px solid #1E2535;background:#0F1117;">
                    <p style="margin:0;font-size:11px;color:#3A4560;text-align:center;">
                      Bu emaili sen istemediysen güvenle yoksayabilirsin. •
                      <a href="https://openigu.vercel.app" style="color:#4F7EF7;text-decoration:none;">openigu.vercel.app</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-verification]', err?.message)
    return NextResponse.json({ error: 'Email gönderilemedi.' }, { status: 500 })
  }
}
