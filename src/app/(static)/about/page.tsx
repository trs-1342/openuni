// src/app/(static)/about/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, Shield, Zap, Heart, GraduationCap, Code } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'OpenUni nedir, neden var, nasıl çalışır?',
}

const values = [
  {
    icon: Shield,
    color: 'text-brand',
    bg: 'bg-brand/10',
    title: 'Güvenli ve Özel',
    desc: 'Sadece @ogr.gelisim.edu.tr e-postası olan öğrenciler kayıt olabilir. Platform dışına veri sızdırılmaz.',
  },
  {
    icon: Zap,
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    title: 'Düzenli ve Hızlı',
    desc: 'WhatsApp gruplarının kaosu yerine kanallara ayrılmış, arşivlenen, aranabilir bir yapı.',
  },
  {
    icon: Heart,
    color: 'text-accent-red',
    bg: 'bg-accent-red/10',
    title: 'Ücretsiz ve Reklamsız',
    desc: 'Hiçbir ücret talep etmiyoruz, hiçbir reklam göstermiyoruz. Tamamen öğrenci odaklı.',
  },
  {
    icon: Users,
    color: 'text-accent-green',
    bg: 'bg-accent-green/10',
    title: 'Topluluk Odaklı',
    desc: 'Moderatörler öğrencilerden seçilir. Platform, öğrencilerin ihtiyaçlarına göre şekillenir.',
  },
]

const team = [
  { name: 'Platform Ekibi', role: 'Geliştirme & Tasarım', emoji: '💻' },
  { name: 'Öğrenci Moderatörler', role: 'İçerik & Topluluk', emoji: '🛡' },
  { name: 'IGÜ Öğrencileri', role: 'Katkıda Bulunanlar', emoji: '🎓' },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">

      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-3xl font-display font-bold text-brand">
          O
        </div>
        <h1 className="font-display font-bold text-3xl lg:text-4xl text-text-primary">
          Neden OpenUni?
        </h1>
        <p className="text-text-secondary text-base leading-relaxed max-w-2xl mx-auto">
          İstanbul Gelişim Üniversitesi öğrencileri olarak hepimiz aynı sorunu yaşadık:
          duyurular WhatsApp'ta kaybolur, ders notları gruplarda karışır, etkinliklerden haberdar olunamazdı.
          <strong className="text-text-primary"> OpenUni bu sorunu çözmek için yapıldı.</strong>
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/auth/register" className="btn-primary px-6 py-2.5">
            Hemen Katıl
          </Link>
          <Link href="/guide" className="btn-secondary px-6 py-2.5">
            Nasıl Kullanılır?
          </Link>
        </div>
      </section>

      {/* Problem → Çözüm */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border-accent-red/20 space-y-3">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <span>❌</span> Eski Yöntem
            </h3>
            {[
              'Duyurular WhatsApp grubunda kayboluyor',
              'Ders notları farklı linklerde dağınık',
              'Hangi hoca hangisini istiyor bilmiyorsun',
              'Yeni öğrenciler hiçbir şeyi bulamıyor',
              'Moderasyon yok, spam ve kargaşa var',
            ].map(item => (
              <p key={item} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-accent-red mt-0.5 shrink-0">–</span>{item}
              </p>
            ))}
          </div>
          <div className="card border-accent-green/20 space-y-3">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <span>✅</span> OpenUni ile
            </h3>
            {[
              'Duyurular kanallara göre arşivleniyor',
              'Kaynaklar kalıcı arşiv kanalında',
              'Akademik destek kanalında sorular yanıtlanıyor',
              'Yeni öğrenci kılavuz kanalıyla hızlıca oryante oluyor',
              'Öğrenci moderatörler içeriği denetliyor',
            ].map(item => (
              <p key={item} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-accent-green mt-0.5 shrink-0">+</span>{item}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Değerler */}
      <section>
        <h2 className="font-display font-bold text-xl text-text-primary text-center mb-8">Değerlerimiz</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map(v => {
            const Icon = v.icon
            return (
              <div key={v.title} className="card hover:bg-surface-hover transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${v.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${v.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">{v.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Ekip */}
      <section>
        <h2 className="font-display font-bold text-xl text-text-primary text-center mb-8">Ekip</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {team.map(member => (
            <div key={member.name} className="card text-center space-y-2">
              <div className="text-3xl">{member.emoji}</div>
              <p className="font-semibold text-text-primary text-sm">{member.name}</p>
              <p className="text-xs text-text-muted">{member.role}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-text-muted mt-6">
          Katkıda bulunmak ister misin?{' '}
          <Link href="/contact" className="text-brand hover:text-brand-hover">Bizimle iletişime geç</Link>
        </p>
      </section>

      {/* Tech stack */}
      <section className="card text-center space-y-3">
        <Code className="w-6 h-6 text-text-muted mx-auto" />
        <h3 className="font-semibold text-text-primary">Teknoloji</h3>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          Next.js 15, TypeScript, Tailwind CSS, Firebase (Auth + Firestore + Storage) ile
          öğrenciler tarafından öğrenciler için geliştirildi.
        </p>
        <p className="text-xs text-text-muted">Açık kaynak olmaya hazırlanıyor.</p>
      </section>

    </div>
  )
}
