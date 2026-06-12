// src/lib/permissions.ts — Yetki (capability) modeli
//
// Karar: kademeli rol DEĞİL, kişiye atanan yetki bayrakları (capability).
// Owner (sistem sahibi) tüm yetkilere otomatik sahiptir ve owner'a özel haklara (log,
// e-posta paneli, "kim katıldı") yalnızca o erişebilir.

import type { User } from '@/types'

// Owner'ın uygulama hesabı e-postası (NEXT_PUBLIC_ADMIN_EMAIL ile aynı).
// Firestore kurallarında da bu e-posta sabit owner çapası olarak kullanılır.
export const OWNER_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'khalil.khattab@ogr.gelisim.edu.tr'

// Atanabilir yetkiler
export const CAPABILITIES = {
  createCommunity: 'createCommunity', // topluluk açabilir
  invite:          'invite',          // davet edebilir
  moderateGlobal:  'moderateGlobal',  // global moderasyon (içerik silme, ban/mute)
  manageUsers:     'manageUsers',     // kullanıcı yetkisi/onayı yönetir (admin benzeri)
} as const

export type Capability = keyof typeof CAPABILITIES

export const CAPABILITY_LABELS: Record<Capability, string> = {
  createCommunity: 'Topluluk Açma',
  invite:          'Davet Etme',
  moderateGlobal:  'Global Moderasyon',
  manageUsers:     'Kullanıcı Yönetimi',
}

type ProfileLike =
  | (Partial<User> & { email?: string | null; role?: string; capabilities?: string[] })
  | null
  | undefined

export function isOwner(profile: ProfileLike, authEmail?: string | null): boolean {
  if (!profile && !authEmail) return false
  if (authEmail && authEmail === OWNER_EMAIL) return true
  if (profile?.email && profile.email === OWNER_EMAIL) return true
  return (profile as any)?.isSystemOwner === true
}

export function hasCapability(profile: ProfileLike, cap: Capability, authEmail?: string | null): boolean {
  if (isOwner(profile, authEmail)) return true
  const caps = (profile as any)?.capabilities
  if (Array.isArray(caps) && caps.includes(cap)) return true
  // Geriye dönük uyum: eski admin/moderator rolleri ilgili yetkilere haritalanır
  const role = (profile as any)?.role
  if (cap === 'moderateGlobal') return role === 'admin' || role === 'moderator'
  if (cap === 'manageUsers')    return role === 'admin'
  return false
}

// Owner'a özel haklar (yalnızca owner): loglar, e-posta paneli, "kim katıldı"
export function canViewLogs(profile: ProfileLike, authEmail?: string | null): boolean {
  return isOwner(profile, authEmail)
}
export function canSendBulkEmail(profile: ProfileLike, authEmail?: string | null): boolean {
  return isOwner(profile, authEmail)
}

// Görsel etiket (owner > yönetici > moderatör > onaylı hoca > üye)
export function roleLabel(profile: ProfileLike, authEmail?: string | null): string | null {
  if (isOwner(profile, authEmail)) return 'Sistem Sahibi'
  if (hasCapability(profile, 'manageUsers', authEmail)) return 'Yönetici'
  if (hasCapability(profile, 'moderateGlobal', authEmail)) return 'Moderatör'
  if ((profile as any)?.userType === 'ogretmen') return 'Öğretim Görevlisi'
  return null
}
