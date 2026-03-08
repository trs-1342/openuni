// src/lib/mailer.ts — Merkezi email gönderici (server-side only)
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

const FROM = `"OpenUni" <${process.env.SMTP_USER ?? 'noreply@openuni'}>`
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://openigu.vercel.app'

// ─── Ortak HTML wrapper ────────────────────────────────────────────────────
function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#131929;border-radius:16px;border:1px solid #1E2535;overflow:hidden;max-width:560px;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #1E2535;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px;height:36px;background:#4F7EF7;border-radius:10px;text-align:center;vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" width="36" height="36"><tr><td align="center" valign="middle">
                <span style="color:white;font-weight:800;font-size:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1;">O</span>
              </td></tr></table>
            </td>
            <td style="padding-left:10px;">
              <div style="font-weight:700;color:#fff;font-size:15px;">OpenUni</div>
              <div style="font-size:11px;color:#64748B;">IGÜ Platformu</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px;">${body}</td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #1E2535;background:#0F1117;">
          <p style="margin:0;font-size:11px;color:#3A4560;text-align:center;">
            <a href="${APP_URL}" style="color:#4F7EF7;text-decoration:none;">openigu.vercel.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

// ─── 1. Admin log emaili ──────────────────────────────────────────────────
export async function sendAdminLog(opts: {
  subject: string
  title: string
  rows: { label: string; value: string }[]
  level?: 'info' | 'warn' | 'error'
}) {
  if (!ADMIN_EMAIL) return
  const color = opts.level === 'error' ? '#EF4444' : opts.level === 'warn' ? '#F59E0B' : '#4F7EF7'
  const badge = opts.level === 'error' ? '🔴' : opts.level === 'warn' ? '🟡' : '🔵'

  const rows = opts.rows.map(r =>
    `<tr>
      <td style="padding:8px 0;color:#64748B;font-size:13px;width:140px;vertical-align:top;">${r.label}</td>
      <td style="padding:8px 0;color:#E2E8F0;font-size:13px;">${r.value}</td>
    </tr>`
  ).join('')

  const body = `
    <p style="margin:0 0 4px;font-size:11px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:.5px;">${badge} ${(opts.level ?? 'info').toUpperCase()}</p>
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#F1F5F9;">${opts.title}</p>
    <div style="background:#1A2235;border-radius:10px;padding:16px;border:1px solid #1E2535;">
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>
    <p style="margin:16px 0 0;font-size:11px;color:#64748B;">
      Zaman: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
    </p>`

  await createTransporter().sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[OpenUni Log] ${opts.subject}`,
    html: emailWrapper(opts.subject, body),
  })
}

// ─── 2. Yeni kayıt bildirimi (admin'e) ────────────────────────────────────
export async function sendNewUserLog(user: {
  displayName: string
  email: string
  userType: string
  fakulte?: string
  department?: string
  studentId?: string
  username?: string
}) {
  await sendAdminLog({
    subject: `Yeni Kayıt: ${user.displayName}`,
    title: '👤 Yeni Kullanıcı Kaydoldu',
    level: 'info',
    rows: [
      { label: 'Ad Soyad',    value: user.displayName },
      { label: 'E-posta',     value: user.email },
      { label: 'Username',    value: user.username ?? '—' },
      { label: 'Tür',         value: user.userType },
      { label: 'Fakülte',     value: user.fakulte ?? '—' },
      { label: 'Bölüm',       value: user.department ?? '—' },
      { label: 'Öğrenci No',  value: user.studentId ?? '—' },
    ],
  })
}

// ─── 3. Post bildirimi (kullanıcıya) ─────────────────────────────────────
export async function sendPostNotification(opts: {
  to: string
  displayName: string
  postTitle: string
  postContent: string
  postUrl: string
  channelName: string
  spaceName: string
}) {
  const preview = opts.postContent.replace(/\*\*/g, '').slice(0, 200) + (opts.postContent.length > 200 ? '…' : '')
  const body = `
    <p style="margin:0 0 6px;font-size:13px;color:#64748B;">Merhaba <strong style="color:#E2E8F0;">${opts.displayName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;line-height:1.6;">
      <strong style="color:#E2E8F0;">${opts.spaceName} › ${opts.channelName}</strong> kanalına yeni bir paylaşım yaptın.
    </p>

    <div style="background:#1A2235;border-radius:12px;padding:20px;border:1px solid #1E2535;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#F1F5F9;">${opts.postTitle}</p>
      <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">${preview}</p>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#4F7EF7;border-radius:8px;">
        <a href="${opts.postUrl}" style="display:inline-block;padding:12px 24px;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">
          Paylaşımı Görüntüle →
        </a>
      </td></tr>
    </table>

    <p style="margin:20px 0 0;font-size:11px;color:#3A4560;">
      Bu bildirimi almak istemiyorsan <a href="${APP_URL}/dashboard/settings" style="color:#4F7EF7;text-decoration:none;">Ayarlar</a> sayfasından kapatabilirsin.
    </p>`

  await createTransporter().sendMail({
    from: FROM,
    to: opts.to,
    subject: `Paylaşımın yayınlandı: ${opts.postTitle}`,
    html: emailWrapper('Paylaşım Bildirimi', body),
  })
}

// ─── 4. Hata logu (admin'e) ───────────────────────────────────────────────
export async function sendErrorLog(context: string, error: any, extra?: Record<string, string>) {
  await sendAdminLog({
    subject: `Hata: ${context}`,
    title: `⚠️ Sistem Hatası`,
    level: 'error',
    rows: [
      { label: 'Bağlam',  value: context },
      { label: 'Hata',    value: String(error?.message ?? error) },
      { label: 'Stack',   value: (error?.stack ?? '—').slice(0, 300) },
      ...Object.entries(extra ?? {}).map(([label, value]) => ({ label, value })),
    ],
  })
}
