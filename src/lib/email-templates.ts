// src/lib/email-templates.ts — E-posta şablon tanımları (O2)
//
// Şablonlar Firestore'da `emailTemplates/{id}` dokümanlarında tutulur
// ({ subject, body, updatedAt, updatedBy }). Doküman yoksa buradaki varsayılan
// kullanılır. Body DÜZ METİNDİR; {{degisken}} yer tutucuları desteklenir.
// Render sırasında hem şablon metni hem değişken değerleri HTML-escape edilir
// (XSS güvenliği) — şablona HTML yazılamaz.

export interface EmailTemplateDef {
  id: string
  name: string
  description: string
  variables: { key: string; label: string }[]
  defaultSubject: string
  defaultBody: string
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    id: 'verification',
    name: 'E-posta Doğrulama',
    description: 'Kayıt sonrası / tekrar gönderimde kullanıcıya giden doğrulama e-postası.',
    variables: [
      { key: 'ad',   label: 'Kullanıcının adı' },
      { key: 'link', label: 'Doğrulama bağlantısı (buton olarak da eklenir)' },
    ],
    defaultSubject: 'E-posta adresinizi doğrulayın — OpenUni',
    defaultBody:
`Merhaba {{ad}} 👋

OpenUni'ye hoş geldin! Hesabını aktifleştirmek için aşağıdaki butona tıkla. Bu bağlantı 24 saat geçerlidir.

Buton çalışmıyorsa bu bağlantıyı tarayıcına yapıştır:
{{link}}`,
  },
  {
    id: 'postNotify',
    name: 'Paylaşım Bildirimi',
    description: 'Kullanıcı paylaşım yaptığında (tercihi açıksa) kendisine giden onay e-postası.',
    variables: [
      { key: 'ad',       label: 'Kullanıcının adı' },
      { key: 'baslik',   label: 'Gönderi başlığı' },
      { key: 'ozet',     label: 'Gönderi içeriği özeti' },
      { key: 'kanal',    label: 'Kanal adı' },
      { key: 'topluluk', label: 'Topluluk adı' },
      { key: 'link',     label: 'Gönderi bağlantısı (buton olarak da eklenir)' },
    ],
    defaultSubject: 'Paylaşımın yayınlandı: {{baslik}}',
    defaultBody:
`Merhaba {{ad}},

{{topluluk}} › {{kanal}} kanalına yeni bir paylaşım yaptın.

{{baslik}}
{{ozet}}

Bu bildirimi almak istemiyorsan Ayarlar sayfasından kapatabilirsin.`,
  },
  {
    id: 'teacherApprove',
    name: 'Öğretmen Onayı',
    description: 'Öğretmen başvurusu onaylandığında başvurana giden e-posta.',
    variables: [
      { key: 'ad',   label: 'Başvuranın adı' },
      { key: 'link', label: 'Giriş bağlantısı (buton olarak da eklenir)' },
    ],
    defaultSubject: 'Öğretmen hesabınız onaylandı — OpenUni',
    defaultBody:
`Tebrikler, {{ad}}!

Öğretmen / Akademisyen hesabın onaylandı. Artık OpenUni'de öğretmen olarak giriş yapabilirsin.`,
  },
  {
    id: 'teacherReject',
    name: 'Öğretmen Reddi',
    description: 'Öğretmen başvurusu reddedildiğinde başvurana giden e-posta.',
    variables: [
      { key: 'ad',   label: 'Başvuranın adı' },
      { key: 'link', label: 'İletişim bağlantısı (buton olarak da eklenir)' },
    ],
    defaultSubject: 'Öğretmen hesap başvurunuz hakkında — OpenUni',
    defaultBody:
`Merhaba {{ad}},

Öğretmen / Akademisyen hesap başvurunu inceledik. Maalesef başvurun onaylanamadı. Hesabın standart öğrenci hesabı olarak devam edecek.

Bunun bir hata olduğunu düşünüyorsan iletişim formumuzu kullanarak bize ulaşabilirsin.`,
  },
]

export function getTemplateDef(id: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id)
}

// HTML escape (şablon + değişkenler render edilirken uygulanır)
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// {{degisken}} yer tutucularını doldurur (escape ETMEZ — düz metin sonuç).
// Konu satırı gibi düz-metin alanlar için.
export function renderTemplateText(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '')
}

// Şablon gövdesini güvenli HTML'e çevirir: önce metin doldurulur,
// sonra TAMAMI escape edilir, satır sonları <br> olur.
export function renderTemplateHtml(tpl: string, vars: Record<string, string>): string {
  const text = renderTemplateText(tpl, vars)
  return escapeHtml(text).replace(/\r?\n/g, '<br>')
}
