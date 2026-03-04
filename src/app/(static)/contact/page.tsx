// // src/app/(static)/contact/page.tsx
// 'use client'

// import { useState } from 'react'
// import Link from 'next/link'
// import {
//   Send, CheckCircle, AlertCircle, Loader2,
//   MessageSquare, Bug, Lightbulb, AlertTriangle, FileText,
// } from 'lucide-react'
// import { cn } from '@/lib/utils'

// const MESSAGE_TYPES = [
//   { id: 'feedback',   label: 'Geri Bildirim',  icon: MessageSquare, color: 'text-brand',          bg: 'bg-brand/10' },
//   { id: 'complaint',  label: 'Şikayet',        icon: AlertTriangle, color: 'text-accent-red',      bg: 'bg-accent-red/10' },
//   { id: 'suggestion', label: 'Öneri',          icon: Lightbulb,     color: 'text-accent-amber',    bg: 'bg-accent-amber/10' },
//   { id: 'bug',        label: 'Hata Bildirimi', icon: Bug,           color: 'text-accent-purple',   bg: 'bg-accent-purple/10' },
//   { id: 'other',      label: 'Diğer',          icon: FileText,      color: 'text-text-muted',      bg: 'bg-surface' },
// ]

// export default function ContactPage() {
//   const [form, setForm] = useState({
//     name: '', email: '', type: '', subject: '', message: '',
//   })
//   const [isLoading, setIsLoading] = useState(false)
//   const [success, setSuccess]     = useState(false)
//   const [error, setError]         = useState('')

//   function update(key: string, value: string) {
//     setForm(prev => ({ ...prev, [key]: value }))
//     setError('')
//   }

//   const canSubmit =
//     form.name.trim() &&
//     form.email.trim() &&
//     form.type &&
//     form.message.trim().length >= 10 &&
//     !isLoading

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault()
//     if (!canSubmit) return

//     setIsLoading(true)
//     setError('')
//     try {
//       const res = await fetch('/api/contact', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(form),
//       })
//       const data = await res.json()
//       if (!res.ok) throw new Error(data.error ?? 'Gönderilemedi.')
//       setSuccess(true)
//       setForm({ name: '', email: '', type: '', subject: '', message: '' })
//     } catch (err: any) {
//       setError(err.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.')
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   if (success) {
//     return (
//       <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
//         <div className="w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto">
//           <CheckCircle className="w-8 h-8 text-accent-green" />
//         </div>
//         <h1 className="font-display font-bold text-2xl text-text-primary">Mesajınız İletildi!</h1>
//         <p className="text-text-secondary text-sm leading-relaxed">
//           Geri bildiriminiz için teşekkür ederiz. En kısa sürede değerlendirip size geri döneceğiz.
//           Otomatik bir onay e-postası gönderildi.
//         </p>
//         <div className="flex justify-center gap-3">
//           <button
//             onClick={() => setSuccess(false)}
//             className="btn-secondary px-5 py-2.5 text-sm"
//           >
//             Yeni Mesaj Gönder
//           </button>
//           <Link href="/" className="btn-primary px-5 py-2.5 text-sm">Ana Sayfaya Dön</Link>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="max-w-2xl mx-auto px-4 py-12">
//       <div className="mb-10 text-center space-y-3">
//         <h1 className="font-display font-bold text-3xl text-text-primary">Bize Ulaşın</h1>
//         <p className="text-text-secondary text-sm leading-relaxed max-w-md mx-auto">
//           Şikayet, öneri veya geri bildiriminizi iletmek için formu doldurun.
//           Mesajınız doğrudan ekibimize ulaşır.
//         </p>
//       </div>

//       <form onSubmit={handleSubmit} className="space-y-5">

//         {/* İletişim türü */}
//         <div>
//           <label className="block text-xs font-medium text-text-secondary mb-2">Mesaj Türü *</label>
//           <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
//             {MESSAGE_TYPES.map(t => {
//               const Icon = t.icon
//               const isSelected = form.type === t.id
//               return (
//                 <button
//                   key={t.id}
//                   type="button"
//                   onClick={() => update('type', t.id)}
//                   className={cn(
//                     'flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-all',
//                     isSelected
//                       ? `${t.bg} border-current ${t.color}`
//                       : 'border-surface-border text-text-muted hover:border-surface-active hover:text-text-secondary'
//                   )}
//                 >
//                   <Icon className={cn('w-4 h-4', isSelected ? t.color : 'text-text-muted')} />
//                   {t.label}
//                 </button>
//               )
//             })}
//           </div>
//         </div>

//         {/* Ad + Email */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-xs font-medium text-text-secondary mb-1.5">Ad Soyad *</label>
//             <input
//               type="text"
//               value={form.name}
//               onChange={e => update('name', e.target.value)}
//               placeholder="Adınız Soyadınız"
//               className="input"
//               required
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-medium text-text-secondary mb-1.5">E-posta *</label>
//             <input
//               type="email"
//               value={form.email}
//               onChange={e => update('email', e.target.value)}
//               placeholder="ornek@ogr.gelisim.edu.tr"
//               className="input"
//               required
//             />
//           </div>
//         </div>

//         {/* Konu */}
//         <div>
//           <label className="block text-xs font-medium text-text-secondary mb-1.5">
//             Konu <span className="text-text-muted font-normal">(isteğe bağlı)</span>
//           </label>
//           <input
//             type="text"
//             value={form.subject}
//             onChange={e => update('subject', e.target.value)}
//             placeholder="Kısaca konuyu belirtin"
//             className="input"
//           />
//         </div>

//         {/* Mesaj */}
//         <div>
//           <label className="block text-xs font-medium text-text-secondary mb-1.5">
//             Mesaj *
//             <span className={cn('ml-2 text-text-muted font-normal', form.message.length >= 10 && 'text-accent-green')}>
//               ({form.message.length} karakter{form.message.length < 10 ? ', en az 10' : ''})
//             </span>
//           </label>
//           <textarea
//             value={form.message}
//             onChange={e => update('message', e.target.value)}
//             placeholder="Mesajınızı buraya yazın. Ne kadar ayrıntılı olursa o kadar iyi..."
//             rows={6}
//             className="input resize-none"
//             required
//           />
//         </div>

//         {/* Hata */}
//         {error && (
//           <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5">
//             <AlertCircle className="w-3.5 h-3.5 shrink-0" />
//             {error}
//           </div>
//         )}

//         {/* Gönder */}
//         <button
//           type="submit"
//           disabled={!canSubmit}
//           className={cn(
//             'btn-primary w-full justify-center py-3 text-sm font-medium',
//             !canSubmit && 'opacity-50 cursor-not-allowed'
//           )}
//         >
//           {isLoading
//             ? <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
//             : <><Send className="w-4 h-4" /> Mesajı Gönder</>
//           }
//         </button>

//         <p className="text-center text-xs text-text-muted">
//           Mesajınız doğrudan ekibimize iletilir.{' '}
//           <Link href="/privacy" className="text-brand hover:text-brand-hover">Gizlilik politikamızı</Link>{' '}
//           okuyabilirsiniz.
//         </p>
//       </form>
//     </div>
//   )
// }

// src/app/(static)/about/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Zap, Heart, Users, Code } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'OpenUni nedir, neden var, nasıl çalışır?',
}

const values = [
  { icon: Shield, color: 'text-brand',        bg: 'bg-brand/10',        title: 'Güvenli ve Özel',    desc: 'Sadece @ogr.gelisim.edu.tr e-postası olanlar kaydolabilir. Veriler dışarıya sızdırılmaz.' },
  { icon: Zap,    color: 'text-accent-amber',  bg: 'bg-accent-amber/10', title: 'Düzenli ve Hızlı',   desc: 'WhatsApp kaosu yerine kanallara ayrılmış, arşivlenen, aranabilir yapı.' },
  { icon: Heart,  color: 'text-accent-red',    bg: 'bg-accent-red/10',   title: 'Ücretsiz ve Reklamsız', desc: 'Hiçbir ücret talep etmiyoruz, hiçbir reklam göstermiyoruz.' },
  { icon: Users,  color: 'text-accent-green',  bg: 'bg-accent-green/10', title: 'Topluluk Odaklı',    desc: 'Moderatörler öğrencilerden seçilir. Platform ihtiyaçlara göre şekillenir.' },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
      <section className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto font-display font-bold text-3xl text-brand">O</div>
        <h1 className="font-display font-bold text-3xl lg:text-4xl text-text-primary">Neden OpenUni?</h1>
        <p className="text-text-secondary text-base leading-relaxed max-w-2xl mx-auto">
          IGÜ öğrencileri olarak hepimiz aynı sorunu yaşadık: duyurular WhatsApp'ta kaybolur, notlar gruplarda karışır.
          <strong className="text-text-primary"> OpenUni bu sorunu çözmek için yapıldı.</strong>
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/auth/register" className="btn-primary px-6 py-2.5">Hemen Katıl</Link>
          <Link href="/guide"         className="btn-secondary px-6 py-2.5">Nasıl Kullanılır?</Link>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border-accent-red/20 space-y-3">
            <h3 className="font-semibold text-text-primary">❌ Eski Yöntem</h3>
            {['Duyurular WhatsApp’ta kayboluyor','Ders notları farklı linklerde dağınık','Yeni öğrenciler hiçbir şeyi bulamıyor','Moderasyon yok, spam ve kargaşa var'].map(i => (
              <p key={i} className="text-sm text-text-secondary flex items-start gap-2"><span className="text-accent-red mt-0.5 shrink-0">–</span>{i}</p>
            ))}
          </div>
          <div className="card border-accent-green/20 space-y-3">
            <h3 className="font-semibold text-text-primary">✅ OpenUni ile</h3>
            {['Duyurular kanallara göre arşivleniyor','Kaynaklar kalıcı arşiv kanalında','Yeni öğrenci kılavuz kanalıyla hızlıca oryante oluyor','Öğrenci moderatörler içeriği denetliyor'].map(i => (
              <p key={i} className="text-sm text-text-secondary flex items-start gap-2"><span className="text-accent-green mt-0.5 shrink-0">+</span>{i}</p>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl text-text-primary text-center mb-8">Değerlerimiz</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map(v => {
            const Icon = v.icon
            return (
              <div key={v.title} className="card">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${v.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${v.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">{v.title}</h3>
                    <p className="text-sm text-text-secondary">{v.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card text-center space-y-3">
        <Code className="w-6 h-6 text-text-muted mx-auto" />
        <h3 className="font-semibold text-text-primary">Teknoloji</h3>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          Next.js 15, TypeScript, Tailwind CSS, Firebase ile öğrenciler tarafından öğrenciler için geliştirildi.
        </p>
        <p className="text-xs text-text-muted">
          Soru veya katkı için <Link href="/contact" className="text-brand hover:text-brand-hover">bize ulaşın</Link>.
        </p>
      </section>
    </div>
  )
}
