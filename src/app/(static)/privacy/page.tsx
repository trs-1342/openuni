// src/app/(static)/privacy/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'OpenUni gizlilik politikası ve KVKK aydınlatma metni.',
}

const sections = [
  {
    id: '1',
    title: '1. Veri Sorumlusu',
    content: `OpenUni platformu, İstanbul Gelişim Üniversitesi öğrencileri tarafından yürütülen bir öğrenci girişimidir.
    Platform, Türkiye'de faaliyet göstermekte olup 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamındaki yükümlülüklerini yerine getirmeyi taahhüt eder.`,
  },
  {
    id: '2',
    title: '2. Toplanan Veriler',
    content: '',
    list: [
      'Ad soyad (kayıt sırasında girilen)',
      'Öğrenci e-posta adresi (@ogr.gelisim.edu.tr)',
      'Bölüm ve sınıf bilgisi (isteğe bağlı)',
      'Platforma yüklenen içerikler (paylaşımlar, yorumlar)',
      'Kaydedilen gönderiler listesi',
      'Hesap oluşturma ve son aktif olma tarihi',
    ],
  },
  {
    id: '3',
    title: '3. Verilerin İşlenme Amacı',
    content: '',
    list: [
      'Kimlik doğrulama ve hesap güvenliği',
      'Platform hizmetlerinin sağlanması',
      'Topluluğun moderasyonu',
      'Teknik sorunların giderilmesi',
      'KVKK\'dan doğan yükümlülüklerin yerine getirilmesi',
    ],
  },
  {
    id: '4',
    title: '4. Verilerin Paylaşımı',
    content: `Kişisel verileriniz üçüncü kişilerle satılmaz ve reklam amaçlı kullanılmaz.
    Veriler yalnızca aşağıdaki durumlarda paylaşılabilir:`,
    list: [
      'Yasal zorunluluk bulunması halinde yetkili makamlarla',
      'Firebase (Google LLC) altyapısıyla — gizlilik politikası: firebase.google.com/support/privacy',
    ],
  },
  {
    id: '5',
    title: '5. Veri Saklama Süresi',
    content: `Verileriniz hesabınız aktif olduğu sürece saklanır.
    Hesap silme talebinde bulunmanız halinde verileriniz 30 gün içinde sistemden kalıcı olarak silinir.
    Yasal yükümlülükler kapsamındaki veriler mevzuatta öngörülen süreler boyunca saklanabilir.`,
  },
  {
    id: '6',
    title: '6. Haklarınız (KVKK Madde 11)',
    content: 'KVKK kapsamında aşağıdaki haklara sahipsiniz:',
    list: [
      'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
      'Kişisel verilerinize ilişkin bilgi talep etme',
      'Kişisel verilerinizin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
      'Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri öğrenme',
      'Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme',
      'KVKK\'nın 7. maddesi çerçevesinde silinmesini isteme',
      'Otomatik sistemler aracılığıyla aleyhinize sonuç doğuracak işlemlere itiraz etme',
    ],
  },
  {
    id: '7',
    title: '7. Çerezler',
    content: `Platform, kullanıcı oturumunu sürdürmek amacıyla Firebase tarafından sağlanan kimlik doğrulama tokenları kullanır.
    Bu tokenlar tarayıcınızın yerel depolama alanında (localStorage) saklanır.
    Reklam veya izleme amaçlı çerez kullanılmaz.`,
  },
  {
    id: '8',
    title: '8. Güvenlik',
    content: `Verileriniz Firebase altyapısında şifreli olarak saklanır.
    Tüm bağlantılar HTTPS üzerinden sağlanır.
    Şifreler asla düz metin olarak saklanmaz; Firebase Authentication tarafından güvenli şekilde yönetilir.`,
  },
  {
    id: '9',
    title: '9. İletişim',
    content: 'Gizlilik politikamıza ilişkin sorularınız veya hak talepleriniz için iletişim formunu kullanabilirsiniz.',
  },
  {
    id: '10',
    title: '10. Güncelleme',
    content: `Bu politika gerektiğinde güncellenebilir. Önemli değişiklikler platform üzerinden duyurulur.
    Son güncelleme: Mart 2025`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display font-bold text-3xl text-text-primary mb-3">Gizlilik Politikası</h1>
        <p className="text-text-muted text-sm">
          Son güncelleme: Mart 2025 &nbsp;·&nbsp;
          <Link href="/contact" className="text-brand hover:text-brand-hover">Sorularınız için bize ulaşın</Link>
        </p>
      </div>

      {/* İçerik tablosu */}
      <div className="card mb-8 space-y-1.5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">İçindekiler</p>
        {sections.map(s => (
          <a key={s.id} href={`#section-${s.id}`}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-brand transition-colors py-0.5">
            <span className="text-2xs text-text-muted tabular-nums w-4">{s.id}.</span>
            {s.title.replace(/^\d+\.\s/, '')}
          </a>
        ))}
      </div>

      {/* Bölümler */}
      <div className="space-y-8">
        {sections.map(s => (
          <section key={s.id} id={`section-${s.id}`} className="scroll-mt-20">
            <h2 className="font-display font-semibold text-base text-text-primary mb-3 border-b border-surface-border pb-2">
              {s.title}
            </h2>
            {s.content && (
              <p className="text-sm text-text-secondary leading-relaxed mb-3 whitespace-pre-line">{s.content}</p>
            )}
            {s.list && (
              <ul className="space-y-2">
                {s.list.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-surface-border text-center">
        <p className="text-sm text-text-muted">
          Hak talepleriniz için{' '}
          <Link href="/contact" className="text-brand hover:text-brand-hover font-medium">iletişim formunu</Link>
          {' '}kullanabilirsiniz.
        </p>
      </div>
    </div>
  )
}
