// src/app/api/teacher-approval/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { action, email, displayName } = await req.json()

    if (!email || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametre.' }, { status: 400 })
    }

    const firstName = (displayName ?? email.split('@')[0]).split(' ')[0]
    const transporter = createTransporter()

    if (action === 'approve') {
      await transporter.sendMail({
        from:    `"OpenUni" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: 'Öğretmen hesabınız onaylandı — OpenUni',
        html: `
          <!DOCTYPE html><html lang="tr">
          <body style="margin:0;padding:0;background:#0F1117;font-family:system-ui,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
              <tr><td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#131929;border-radius:16px;border:1px solid #1E2535;overflow:hidden;max-width:560px;">
                  <tr>
                    <td style="padding:28px 32px 24px;border-bottom:1px solid #1E2535;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:36px;height:36px;background:#4F7EF7;border-radius:10px;text-align:center;vertical-align:middle;">
                          <span style="color:white;font-weight:700;font-size:18px;">O</span>
                        </td>
                        <td style="padding-left:10px;">
                          <div style="font-weight:700;color:#fff;font-size:16px;">OpenUni</div>
                          <div style="font-size:11px;color:#64748B;">IGÜ Platformu</div>
                        </td>
                      </tr></table>
                    </td>
                  </tr>
                  <tr><td style="padding:32px;">
                    <div style="width:48px;height:48px;background:#16a34a20;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
                      <span style="font-size:24px;">✅</span>
                    </div>
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F1F5F9;">Tebrikler, ${firstName}!</p>
                    <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;line-height:1.6;">
                      Öğretmen / Akademisyen hesabın onaylandı. Artık OpenUni'de öğretmen olarak giriş yapabilirsin.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                      <tr>
                        <td style="background:#4F7EF7;border-radius:10px;">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}/auth/login"
                            style="display:inline-block;padding:13px 28px;color:#fff;font-weight:600;font-size:14px;text-decoration:none;">
                            Giriş Yap →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td></tr>
                  <tr>
                    <td style="padding:16px 32px;border-top:1px solid #1E2535;background:#0F1117;">
                      <p style="margin:0;font-size:11px;color:#3A4560;text-align:center;">
                        OpenUni — <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}" style="color:#4F7EF7;text-decoration:none;">openigu.vercel.app</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body></html>
        `,
      })
    } else {
      await transporter.sendMail({
        from:    `"OpenUni" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: 'Öğretmen hesap başvurunuz hakkında — OpenUni',
        html: `
          <!DOCTYPE html><html lang="tr">
          <body style="margin:0;padding:0;background:#0F1117;font-family:system-ui,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
              <tr><td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#131929;border-radius:16px;border:1px solid #1E2535;overflow:hidden;max-width:560px;">
                  <tr>
                    <td style="padding:28px 32px 24px;border-bottom:1px solid #1E2535;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:36px;height:36px;background:#4F7EF7;border-radius:10px;text-align:center;vertical-align:middle;">
                          <span style="color:white;font-weight:700;font-size:18px;">O</span>
                        </td>
                        <td style="padding-left:10px;">
                          <div style="font-weight:700;color:#fff;font-size:16px;">OpenUni</div>
                          <div style="font-size:11px;color:#64748B;">IGÜ Platformu</div>
                        </td>
                      </tr></table>
                    </td>
                  </tr>
                  <tr><td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F1F5F9;">Merhaba, ${firstName}</p>
                    <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;line-height:1.6;">
                      Öğretmen / Akademisyen hesap başvurunu inceledik. Maalesef e-posta adresin kurumsal öğretmen adresiyle eşleşmediği için
                      başvurun onaylanamadı. Hesabın standart öğrenci hesabı olarak devam edecek.
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;line-height:1.6;">
                      Eğer bu bir hata olduğunu düşünüyorsan iletişim formumuzu kullanarak bize ulaşabilirsin.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#1E2535;border-radius:10px;border:1px solid #2D3748;">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}/contact"
                            style="display:inline-block;padding:13px 28px;color:#94A3B8;font-size:14px;text-decoration:none;">
                            İletişime Geç →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td></tr>
                  <tr>
                    <td style="padding:16px 32px;border-top:1px solid #1E2535;background:#0F1117;">
                      <p style="margin:0;font-size:11px;color:#3A4560;text-align:center;">
                        OpenUni — <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'}" style="color:#4F7EF7;text-decoration:none;">openigu.vercel.app</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body></html>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[teacher-approval]', err?.message)
    return NextResponse.json({ error: 'Email gönderilemedi.' }, { status: 500 })
  }
}
