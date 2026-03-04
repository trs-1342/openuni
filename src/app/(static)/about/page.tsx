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
