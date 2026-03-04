// src/lib/departments.ts
// IGÜ bölüm hiyerarşisi

export type UserType = 'lisans' | 'onlisans' | 'ogretmen' | 'diger'

export const USER_TYPE_LABELS: Record<UserType, string> = {
  lisans:    '🎓 Lisans Öğrencisi',
  onlisans:  '📚 Ön Lisans Öğrencisi',
  ogretmen:  '👨‍🏫 Öğretmen / Akademisyen',
  diger:     '👤 Diğer',
}

// Lisans fakülte → bölümler
export const LISANS_FAKULTELER: Record<string, string[]> = {
  'Mühendislik ve Mimarlık Fakültesi': [
    'Bilgisayar Mühendisliği',
    'Elektrik-Elektronik Mühendisliği',
    'Endüstri Mühendisliği',
    'İnşaat Mühendisliği',
    'Makine Mühendisliği',
    'Yazılım Mühendisliği',
    'Mimarlık',
    'İç Mimarlık ve Çevre Tasarımı',
  ],
  'İktisadi ve İdari Bilimler Fakültesi': [
    'İşletme',
    'Ekonomi ve Finans',
    'Uluslararası Ticaret ve Lojistik',
    'Yönetim Bilişim Sistemleri',
    'Muhasebe ve Finans Yönetimi',
  ],
  'Sağlık Bilimleri Fakültesi': [
    'Hemşirelik',
    'Fizyoterapi ve Rehabilitasyon',
    'Beslenme ve Diyetetik',
    'Sosyal Hizmet',
    'Odyoloji',
  ],
  'Hukuk Fakültesi': [
    'Hukuk',
  ],
  'İletişim Fakültesi': [
    'Radyo, Televizyon ve Sinema',
    'Halkla İlişkiler ve Reklamcılık',
    'Gazetecilik',
    'Yeni Medya ve İletişim',
  ],
  'Güzel Sanatlar ve Tasarım Fakültesi': [
    'Grafik Tasarım',
    'Moda ve Tekstil Tasarımı',
    'Fotoğrafçılık ve Video',
  ],
  'Eğitim Fakültesi': [
    'Bilgisayar ve Öğretim Teknolojileri Öğretmenliği',
    'İngilizce Öğretmenliği',
    'Okul Öncesi Öğretmenliği',
    'Rehberlik ve Psikolojik Danışmanlık',
  ],
  'Sosyal ve Beşeri Bilimler Fakültesi': [
    'Psikoloji',
    'Sosyoloji',
    'Tarih',
    'Türk Dili ve Edebiyatı',
    'Felsefe',
  ],
  'Spor Bilimleri Fakültesi': [
    'Spor Yöneticiliği',
    'Antrenörlük Eğitimi',
    'Rekreasyon',
  ],
}

// Ön lisans programları
export const ONLISANS_PROGRAMLAR: Record<string, string[]> = {
  'Sağlık Hizmetleri MYO': [
    'Tıbbi Görüntüleme Teknikleri',
    'Anestezi',
    'Eczane Hizmetleri',
    'Fizyoterapi',
    'İlk ve Acil Yardım',
    'Optisyenlik',
    'Tıbbi Laboratuvar Teknikleri',
    'Yaşlı Bakımı',
  ],
  'Teknik Bilimler MYO': [
    'Bilgisayar Programcılığı',
    'Elektrik',
    'Elektronik Teknolojisi',
    'İnşaat Teknolojisi',
    'Makine',
    'Mekatronik',
  ],
  'Sosyal Bilimler MYO': [
    'Muhasebe ve Vergi Uygulamaları',
    'Büro Yönetimi ve Yönetici Asistanlığı',
    'Hukuk Büro Yönetimi ve Sekreterliği',
    'Lojistik',
    'Pazarlama',
    'İşletme Yönetimi',
  ],
  'Adalet MYO': [
    'Adalet',
  ],
  'Sivil Havacılık MYO': [
    'Havacılık Yönetimi',
    'Uçak Gövde ve Motor Bakımı',
  ],
}

// Hazırlık sınıfı seçeneği
export const HAZIRLIK_OPTION = 'Hazırlık Sınıfı'

// Sınıf seçenekleri (userType'a göre)
export function getGradeOptions(userType: UserType, hasPrep: boolean): Array<{ value: string; label: string }> {
  if (userType === 'ogretmen' || userType === 'diger') return []
  const opts: Array<{ value: string; label: string }> = []
  if (hasPrep) opts.push({ value: 'hazirlik', label: 'Hazırlık' })
  if (userType === 'lisans') {
    opts.push(
      { value: '1', label: '1. Sınıf' },
      { value: '2', label: '2. Sınıf' },
      { value: '3', label: '3. Sınıf' },
      { value: '4', label: '4. Sınıf' },
    )
  } else {
    opts.push(
      { value: '1', label: '1. Sınıf' },
      { value: '2', label: '2. Sınıf' },
    )
  }
  return opts
}

// Verilen userType için fakülte/program listesi
export function getFakulteList(userType: UserType): string[] {
  if (userType === 'lisans') return Object.keys(LISANS_FAKULTELER)
  if (userType === 'onlisans') return Object.keys(ONLISANS_PROGRAMLAR)
  return []
}

export function getBolumList(userType: UserType, fakulte: string): string[] {
  if (userType === 'lisans') return LISANS_FAKULTELER[fakulte] ?? []
  if (userType === 'onlisans') return ONLISANS_PROGRAMLAR[fakulte] ?? []
  return []
}
