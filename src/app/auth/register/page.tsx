'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Lock, Mail, User, GraduationCap, AlertCircle, CheckCircle } from 'lucide-react'
import { cn, isValidStudentEmail } from '@/lib/utils'
import { registerUser, getAuthErrorMessage } from '@/lib/auth'

const DEPARTMENTS = [
  // Mühendislik
  'Bilgisayar Mühendisliği',
  'Yazılım Mühendisliği',
  'Elektrik-Elektronik Mühendisliği',
  'Makine Mühendisliği',
  'Endüstri Mühendisliği',
  'İnşaat Mühendisliği',
  'Mekatronik Mühendisliği',
  'Uçak Mühendisliği',
  'Havacılık ve Uzay Mühendisliği',

  // Mimarlık ve Tasarım
  'Mimarlık',
  'İç Mimarlık',
  'İç Mimarlık ve Çevre Tasarımı',
  'Grafik Tasarım',
  'Görsel İletişim Tasarımı',
  'Yeni Medya ve İletişim',
  'Radyo, Televizyon ve Sinema',

  // Sağlık
  'Hemşirelik',
  'Fizyoterapi ve Rehabilitasyon',
  'Beslenme ve Diyetetik',
  'Çocuk Gelişimi',
  'Odyoloji',
  'Dil ve Konuşma Terapisi',
  'Sağlık Yönetimi',

  // Sosyal ve İdari Bilimler
  'İşletme',
  'Uluslararası Ticaret ve Finansman',
  'Uluslararası Ticaret ve İşletmecilik',
  'Siyaset Bilimi ve Uluslararası İlişkiler',
  'Psikoloji',
  'Sosyoloji',
  'Halkla İlişkiler ve Reklamcılık',
  'Reklamcılık',

  // Hukuk
  'Hukuk',

  // Spor
  'Antrenörlük Eğitimi',
  'Spor Yöneticiliği',
  'Rekreasyon',

  // Havacılık
  'Uçak Bakım ve Onarım',
  'Havacılık Yönetimi',
  'Pilotaj',
  'Sivil Hava Ulaştırma İşletmeciliği',

  // Ön Lisans (Meslek Yüksekokulu)
  'Bilgisayar Programcılığı',
  'Bilgi Güvenliği Teknolojisi',
  'Web Tasarımı ve Kodlama',
  'Grafik Tasarımı',
  'Adalet',
  'Bankacılık ve Sigortacılık',
  'Dış Ticaret',
  'Lojistik',
  'Turizm ve Otel İşletmeciliği',
  'Aşçılık',
  'Sivil Hava Ulaştırma İşletmeciliği (MYO)',
  'Uçak Teknolojisi',
  'Uçuş Harekat Yöneticiliği',
  'Sağlık Kurumları İşletmeciliği',
  'Tıbbi Dokümantasyon ve Sekreterlik',
  'Tıbbi Görüntüleme Teknikleri',
  'İlk ve Acil Yardım',
  'Ameliyathane Hizmetleri',
  'Anestezi',

  'Diğer'
];

interface FormState {
  email: string
  displayName: string
  department: string
  grade: string
  password: string
  passwordConfirm: string
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'En az 8 karakter', ok: password.length >= 8 },
    { label: 'Büyük harf', ok: /[A-Z]/.test(password) },
    { label: 'Rakam', ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex items-center gap-3 mt-1.5">
      {checks.map((c) => (
        <span key={c.label} className={cn('flex items-center gap-1 text-2xs', c.ok ? 'text-accent-green' : 'text-text-muted')}>
          <CheckCircle className="w-2.5 h-2.5" />
          {c.label}
        </span>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    email: '', displayName: '', department: '', grade: '', password: '', passwordConfirm: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  function update(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const emailValid = isValidStudentEmail(form.email)
  const passwordsMatch = form.password === form.passwordConfirm && form.passwordConfirm !== ''
  const canSubmit = emailValid && form.displayName && form.department && form.password.length >= 8 && passwordsMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    setError('')
    try {
      await registerUser({
        email:       form.email,
        password:    form.password,
        displayName: form.displayName,
        department:  form.department,
        grade:       form.grade || undefined,
      })
      router.replace('/auth/verify-email')
    } catch (err: any) {
      // Sadece gerçek auth hatalarını göster (Firestore/profile hataları değil)
      const code = err?.code ?? ''
      const msg  = getAuthErrorMessage(code)
      setError(msg ?? 'Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
            <span className="text-white font-display font-bold">O</span>
          </div>
          <span className="font-display font-bold text-text-primary text-lg">OpenUni</span>
        </div>

        <div className="mb-6">
          <h2 className="font-display font-bold text-2xl text-text-primary">Hesap Oluştur</h2>
          <p className="text-text-muted text-sm mt-1">
            Yalnızca IGÜ öğrenci e-postası kabul edilir
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Öğrenci E-postası *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="ad.soyad@ogr.gelisim.edu.tr"
                className={cn(
                  'input pl-10',
                  form.email && !emailValid && 'border-accent-red/50',
                  form.email && emailValid && 'border-accent-green/50',
                )}
                required
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Ad Soyad *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                placeholder="Ad Soyad"
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Department + Grade */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Bölüm *</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <select
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  className="input pl-10 appearance-none bg-surface"
                  required
                >
                  <option value="">Seçin</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Sınıf</label>
              <select
                value={form.grade}
                onChange={(e) => update('grade', e.target.value)}
                className="input appearance-none bg-surface"
              >
                <option value="">—</option>
                <option value="prep">Hazırlık</option>

                {[1,2,3,4].map(g => (
                  <option key={g} value={g}>
                    {g}. sınıf
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Şifre *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Min. 8 karakter"
                className="input pl-10 pr-10"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Şifre Tekrar *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => update('passwordConfirm', e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'input pl-10',
                  form.passwordConfirm && !passwordsMatch && 'border-accent-red/50',
                  passwordsMatch && 'border-accent-green/50',
                )}
              />
            </div>
            {form.passwordConfirm && !passwordsMatch && (
              <p className="text-2xs text-accent-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Şifreler eşleşmiyor
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className={cn('btn-primary w-full justify-center py-2.5 text-sm mt-2', (!canSubmit || isLoading) && 'opacity-60 cursor-not-allowed')}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Hesap Oluştur <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center text-2xs text-text-muted">
            Kayıt olarak{' '}
            <Link href="/legal/terms" className="text-brand hover:text-brand-hover">Kullanım Koşullarını</Link>
            {' '}kabul etmiş olursun.
          </p>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          Zaten hesabın var mı?{' '}
          <Link href="/auth/login" className="text-brand hover:text-brand-hover font-medium transition-colors">
            Giriş Yap
          </Link>
        </p>

        {/* Footer linkleri */}
        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-surface-border">
          <Link href="/about"   className="text-2xs text-text-muted hover:text-text-secondary transition-colors">Hakkımızda</Link>
          <Link href="/guide"   className="text-2xs text-text-muted hover:text-text-secondary transition-colors">Kılavuz</Link>
          <Link href="/privacy" className="text-2xs text-text-muted hover:text-text-secondary transition-colors">Gizlilik</Link>
          <Link href="/contact" className="text-2xs text-text-muted hover:text-text-secondary transition-colors">İletişim</Link>
        </div>
      </div>
    </div>
  )
}
