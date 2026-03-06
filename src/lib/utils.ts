import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { ChannelType, ChannelColor } from '@/types'

// ─── Class Name Helper ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date Formatting ─────────────────────────────────────────────────────────
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: tr })
}

export function formatDate(date: Date | string, pattern = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, pattern, { locale: tr })
}

// ─── File Size ────────────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Channel Metadata ─────────────────────────────────────────────────────────
export const CHANNEL_META: Record<
  ChannelType,
  {
    label: string
    description: string
    icon: string
    colorClass: string
    bgClass: string
    textClass: string
    borderClass: string
    rules: string[]
  }
> = {
  announcement: {
    label: 'Duyurular',
    description: 'Ders iptali, sınav yeri, takvim güncellemeleri',
    icon: '📣',
    colorClass: 'channel-amber',
    bgClass: 'bg-accent-amber/10',
    textClass: 'text-accent-amber',
    borderClass: 'border-accent-amber/30',
    rules: [
      'Sadece moderatörler ve öğretim görevlileri paylaşım yapabilir',
      'Sadece resmi duyurular paylaşılabilir',
      'Yorum yapılamaz',
    ],
  },
  academic: {
    label: 'Akademik Destek',
    description: 'Soru-cevap, konu anlatımı, çalışma grupları',
    icon: '📚',
    colorClass: 'channel-green',
    bgClass: 'bg-accent-green/10',
    textClass: 'text-accent-green',
    borderClass: 'border-accent-green/30',
    rules: [
      'Konuyla alakalı sorular ve tartışmalar',
      'Yanıltıcı veya yanlış bilgi paylaşılmamalı',
      'Saygılı ve yapıcı bir dil kullanılmalı',
    ],
  },
  archive: {
    label: 'Kaynak Arşivi',
    description: 'PDF, ders notu, kitap paylaşımı',
    icon: '🗂️',
    colorClass: 'channel-purple',
    bgClass: 'bg-accent-purple/10',
    textClass: 'text-accent-purple',
    borderClass: 'border-accent-purple/30',
    rules: [
      'Yalnızca dosya ve kaynak paylaşımı yapılabilir',
      'Sohbet ve tartışma yasaktır',
      'Telif hakkı ihlali içeren dosyalar kaldırılır',
    ],
  },
  listing: {
    label: 'İlan Panosu',
    description: 'Özel ders ilanları ve talepler',
    icon: '📌',
    colorClass: 'channel-red',
    bgClass: 'bg-accent-red/10',
    textClass: 'text-accent-red',
    borderClass: 'border-accent-red/30',
    rules: [
      'Yalnızca özel ders ve eğitim odaklı ilanlar',
      'Ücretli/ücretsiz açıkça belirtilmeli',
      'Spam ve tekrarlayan ilanlar silinir',
    ],
  },
  suggestion: {
    label: 'Öneri Kutusu',
    description: 'Platform ve topluluk geliştirme önerileri',
    icon: '💡',
    colorClass: 'channel-teal',
    bgClass: 'bg-channel-suggestion/10',
    textClass: 'text-channel-suggestion',
    borderClass: 'border-channel-suggestion/30',
    rules: [
      'Yapıcı öneriler ve geri bildirimler',
      'Kişisel şikayet yerine çözüm odaklı yazın',
    ],
  },
  social: {
    label: 'Sosyal Alan',
    description: 'Tanışma, etkinlik, buluşma organizasyonu',
    icon: '🎉',
    colorClass: 'channel-blue',
    bgClass: 'bg-brand/10',
    textClass: 'text-brand',
    borderClass: 'border-brand/30',
    rules: [
      'Saygılı ve hoşgörülü bir ortam',
      'Ticari reklam yasaktır',
      'Kapsayıcı bir dil kullanılmalı',
    ],
  },
}

// ─── Avatar Initials ──────────────────────────────────────────────────────────
export function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Validate Student Email ───────────────────────────────────────────────────
export function isValidStudentEmail(email: string): boolean {
  // @ogr.gelisim.edu.tr (öğrenci) veya @gelisim.edu.tr (öğretmen/personel)
  const normalized = email.trim().toLowerCase()
  return /^[a-z0-9._%+\-]+@(ogr\.)?gelisim\.edu\.tr$/.test(normalized)
}


// ─── Username Validasyon ──────────────────────────────────────────────────────
export function validateUsername(username: string): string | null {
  if (!username) return 'Kullanıcı adı boş olamaz.'
  if (username.length < 3) return 'En az 3 karakter olmalı.'
  if (username.length > 30) return 'En fazla 30 karakter olabilir.'
  if (/[^a-zA-Z0-9._-]/.test(username)) return 'Sadece harf, rakam, nokta (.), alt çizgi (_) ve tire (-) kullanılabilir.'
  if (/^[._-]/.test(username)) return '. _ - ile başlayamaz.'
  if (/[._-]$/.test(username)) return '. _ - ile bitemez.'
  if (/[._-]{2,}/.test(username)) return 'Ardarda özel karakter kullanılamaz.'
  return null
}

export function generateUsername(displayName: string, uid: string): string {
  // displayName'den türkçe karakterleri temizle
  const base = displayName
    .toLowerCase()
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15)
  const suffix = uid.slice(0, 5)
  return base ? `${base}_${suffix}` : `user_${suffix}`
}

// ─── Truncate Text ────────────────────────────────────────────────────────────
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}
