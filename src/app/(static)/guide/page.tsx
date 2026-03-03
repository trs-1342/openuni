// src/app/(static)/guide/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  UserPlus, LogIn, LayoutDashboard, Hash, Bell,
  Bookmark, Search, FileText, MessageSquare, Settings,
  ChevronRight, Lightbulb, AlertTriangle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kullanım Kılavuzu',
  description: 'OpenUni platformunu nasıl kullanacağınızı öğrenin.',
}

const steps = [
  {
    id: 1,
    icon: UserPlus,
    color: 'text-brand',
    bg: 'bg-brand/10',
    title: 'Kayıt Ol',
    desc: 'Öğrenci e-posta adresinle (@ogr.gelisim.edu.tr) kayıt ol. Sadece IGÜ öğrencileri kayıt olabilir.',
    tips: ['@ogr.gelisim.edu.tr uzantılı e-posta zorunlu', 'Şifren en az 6 karakter olmalı', 'Gerçek adını kullan — toplulukta tanınırsın'],
  },
  {
    id: 2,
    icon: LogIn,
    color: 'text-accent-green',
    bg: 'bg-accent-green/10',
    title: 'E-postanı Doğrula',
    desc: 'Kayıt sonrası öğrenci e-postana bir doğrulama bağlantısı gönderilir. Bağlantıya tıkladıktan sonra platforma girebilirsin.',
    tips: ['Spam klasörünü de kontrol et', 'Bağlantı gelmezse ayarlardan tekrar gönderebilirsin'],
  },
  {
    id: 3,
    icon: LayoutDashboard,
    color: 'text-accent-purple',
    bg: 'bg-accent-purple/10',
    title: 'Ana Sayfayı Keşfet',
    desc: 'Giriş yaptıktan sonra ana sayfa seni karşılar. Katıldığın topluluklardan son paylaşımlar, bildirimler ve istatistikler burada.',
    tips: ['Sol menüden toplulukları ve kanalları görebilirsin', 'Bildirim zili seni güncel tutar'],
  },
  {
    id: 4,
    icon: Hash,
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    title: 'Topluluklara Katıl',
    desc: '"Topluluklar" sayfasından bölümüne ait veya ilgi alanına göre topluluklara göz at ve katıl. Her topluluğun farklı amaçlı kanalları var.',
    tips: [
      '📣 Duyuru kanalı — resmi duyurular, kaybolmaz',
      '📚 Akademik Destek — sorular ve cevaplar',
      '🗂 Kaynak Arşivi — ders notları, past paper',
      '💬 Genel — sohbet ve sosyal paylaşımlar',
    ],
  },
  {
    id: 5,
    icon: FileText,
    color: 'text-accent-green',
    bg: 'bg-accent-green/10',
    title: 'Paylaşım Yap',
    desc: 'Kanal sayfasında "+" butonuna basarak paylaşım oluştur. Başlık, içerik, etiket ve dosya ekleyebilirsin.',
    tips: ['Paylaşımın uygun kanala yönlendirildiğinden emin ol', 'Etiket eklemek paylaşımının bulunmasını kolaylaştırır', 'PDF, resim ve belgeler eklenebilir'],
  },
  {
    id: 6,
    icon: MessageSquare,
    color: 'text-brand',
    bg: 'bg-brand/10',
    title: 'Yorum Yap',
    desc: 'Herhangi bir paylaşıma tıklayarak detay sayfasına git ve yorum bırak. Ctrl+Enter ile hızlıca gönderebilirsin.',
    tips: ['Saygılı ve yapıcı yorumlar yap', 'Moderatörler kurallara aykırı içerikleri kaldırabilir'],
  },
  {
    id: 7,
    icon: Bookmark,
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    title: 'Kaydet ve Takip Et',
    desc: 'Önemli bulduğun paylaşımları kaydet — "Kaydedilenler" sayfasından istediğin zaman ulaşabilirsin.',
    tips: ['Kaydedilen paylaşımlar sadece sana görünür'],
  },
  {
    id: 8,
    icon: Search,
    color: 'text-accent-purple',
    bg: 'bg-accent-purple/10',
    title: 'Ara',
    desc: 'Sol menüdeki arama butonuna (veya ⌘K kısayoluna) basarak kanal veya topluluk ara.',
    tips: ['Arama, kanal adı ve topluluk adına göre çalışır'],
  },
  {
    id: 9,
    icon: Settings,
    color: 'text-text-muted',
    bg: 'bg-surface',
    title: 'Profil & Ayarlar',
    desc: 'Sol menü altındaki "Profil & Ayarlar"dan adını, bölümünü güncelleyebilir, şifreni değiştirebilir veya verilerini indirebilirsin.',
    tips: ['Oturum 3 saat sonra otomatik kapanır', 'E-posta doğrulamasını buradan kontrol edebilirsin'],
  },
]

const rules = [
  'Başkalarına saygılı ve yapıcı ol',
  'Paylaşımlarını doğru kanala yönlendir',
  'Reklam, spam ve kişisel satış paylaşımı yapma',
  'Başkalarının telif haklarına saygı göster',
  'Kişisel bilgilerini paylaşırken dikkatli ol',
  'Moderatörlerin uyarılarına uy',
]

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-14">

      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="font-display font-bold text-3xl lg:text-4xl text-text-primary">
          Platform Kullanım Kılavuzu
        </h1>
        <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
          OpenUni'ye hoş geldin. Bu kılavuz seni adım adım platforma alıştıracak.
        </p>
      </section>

      {/* Adımlar */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-xl text-text-primary">Nasıl Kullanılır?</h2>
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={step.id} className="card hover:bg-surface-hover transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xs font-bold text-text-muted">{idx + 1}.</span>
                      <h3 className="font-semibold text-text-primary">{step.title}</h3>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed mb-2">{step.desc}</p>
                    <ul className="space-y-0.5">
                      {step.tips.map(tip => (
                        <li key={tip} className="flex items-start gap-1.5 text-xs text-text-muted">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-brand" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Kanal türleri */}
      <section>
        <h2 className="font-display font-bold text-xl text-text-primary mb-4">Kanal Türleri</h2>
        <div className="card divide-y divide-surface-border">
          {[
            { emoji: '📣', name: 'Duyuru', color: 'text-accent-amber', desc: 'Sadece moderatörler paylaşabilir. Resmi üniversite ve bölüm duyuruları.' },
            { emoji: '📚', name: 'Akademik Destek', color: 'text-accent-green', desc: 'Soru sor, cevap ver. Ders sorularından proje yardımına kadar.' },
            { emoji: '🗂', name: 'Kaynak Arşivi', color: 'text-accent-purple', desc: 'Ders notları, past paper, syllabus, okuma listeleri.' },
            { emoji: '🏷', name: 'İlan Panosu', color: 'text-accent-red', desc: 'Burs, iş ilanı, staj fırsatları.' },
            { emoji: '💬', name: 'Genel / Sosyal', color: 'text-brand', desc: 'Serbest sohbet, etkinlik duyuruları, tanışma.' },
            { emoji: '💡', name: 'Öneri & Görüş', color: 'text-text-muted', desc: 'Platform iyileştirme önerileri, bölüm geri bildirimleri.' },
          ].map(ch => (
            <div key={ch.name} className="flex items-center gap-3 py-3">
              <span className="text-lg shrink-0">{ch.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${ch.color}`}>{ch.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{ch.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Kurallar */}
      <section>
        <h2 className="font-display font-bold text-xl text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-accent-amber" />
          Topluluk Kuralları
        </h2>
        <div className="card space-y-2.5">
          {rules.map((rule, i) => (
            <div key={rule} className="flex items-start gap-3 text-sm text-text-secondary">
              <span className="w-5 h-5 rounded-full bg-surface border border-surface-border text-2xs flex items-center justify-center shrink-0 font-bold text-text-muted">
                {i + 1}
              </span>
              {rule}
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">
          Kurallara aykırı davranışlar moderatörler tarafından değerlendirilir.
          Şikayet için{' '}
          <Link href="/contact" className="text-brand hover:text-brand-hover">iletişim formunu</Link>{' '}
          kullanabilirsin.
        </p>
      </section>

      {/* SSS */}
      <section>
        <h2 className="font-display font-bold text-xl text-text-primary mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent-amber" />
          Sık Sorulan Sorular
        </h2>
        <div className="space-y-3">
          {[
            { q: 'Başka üniversiteden biri kaydolabilir mi?', a: 'Hayır. Sadece @ogr.gelisim.edu.tr e-posta adresi olan öğrenciler kayıt olabilir.' },
            { q: 'Paylaşımlarım kimler tarafından görülebilir?', a: 'Sadece kayıtlı ve e-postasını doğrulamış OpenUni üyeleri görebilir. Platform kamuya açık değildir.' },
            { q: 'Moderatör olmak istiyorum, ne yapmalıyım?', a: 'İletişim sayfasından başvuru yapabilirsin. Moderatörler öğrencilerden gönüllülük esasıyla seçilir.' },
            { q: 'Bir paylaşım kuralları ihlal ediyorsa ne yapmalıyım?', a: 'İletişim formundan bize bildirin. Moderatörler en kısa sürede değerlendirir.' },
            { q: 'Verilerimi silebilir miyim?', a: 'Evet. İletişim formu üzerinden hesap silme talebinde bulunabilirsin.' },
          ].map(item => (
            <div key={item.q} className="card">
              <p className="text-sm font-medium text-text-primary mb-1">{item.q}</p>
              <p className="text-sm text-text-secondary">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center card space-y-4">
        <p className="text-text-primary font-semibold">Başlamaya hazır mısın?</p>
        <div className="flex justify-center gap-3">
          <Link href="/auth/register" className="btn-primary px-6 py-2.5">Kayıt Ol</Link>
          <Link href="/about" className="btn-secondary px-6 py-2.5">Hakkımızda</Link>
        </div>
      </section>

    </div>
  )
}
