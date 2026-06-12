'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { cn } from '@/lib/utils'
import { loginUser, getAuthErrorMessage } from '@/lib/auth'
import { getUserProfile } from '@/lib/firestore'

export default function LoginPage() {
  useAuthGuard()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')   // e-posta VEYA kullanıcı adı
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')

  const looksLikeEmail = identifier.includes('@')
  const canSubmit = identifier.trim().length >= 3 && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) {
      setError('E-posta/kullanıcı adı ve şifre girin')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      // Username ile giriş: sunucuda e-postaya çöz (şifre doğruysa)
      let email = identifier.trim()
      if (!looksLikeEmail) {
        const res = await fetch('/api/resolve-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier.trim().toLowerCase(), password }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setError(j.error ?? 'Kullanıcı adı veya şifre hatalı.')
          setIsLoading(false)
          return
        }
        email = (await res.json()).email
      }
      const user = await loginUser(email, password)

      if (!user.emailVerified) {
        // Firebase email doğrulaması yapılmamış — ama admin onaylı mı kontrol et
        // Admin-onaylı kullanıcılar (misafirler dahil) email doğrulaması olmadan girebilir
        try {
          const profile = await getUserProfile(user.uid)
          // if (profile?.isAdminVerified) { TODO: rapor et
          if (profile?.isVerified) {
            router.replace('/dashboard')
            return
          }
        } catch {
          // Firestore hatası — güvenli tarafta kal, verify'a yönlendir
        }
        router.replace('/auth/verify-email')
      } else {
        router.replace('/dashboard')
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code ?? ''))
      // O1: giriş hatası logu — oturum yok, sunucu log ucuna gider (fire & forget)
      fetch('/api/log-event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'auth.login_error',
          message: `Giriş başarısız: ${identifier.trim()}`,
          details: { code: err?.code ?? 'unknown' },
        }),
      }).catch(() => {})
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex flex-col w-[480px] bg-background-secondary border-r border-surface-border p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <span className="text-white font-display font-bold text-lg">O</span>
          </div>
          <div>
            <div className="font-display font-bold text-text-primary">OpenUni</div>
            <div className="text-2xs text-text-muted">IGÜ Platformu</div>
          </div>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <h1 className="font-display font-bold text-4xl text-text-primary leading-tight mb-4">
            Bilgi akar,<br />
            <span className="text-gradient">düzen kalır.</span>
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
            WhatsApp gruplarındaki kaostan kurtul. Duyurular, kaynak arşivi ve akademik destek — tek platformda, düzenli.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              { icon: '📣', label: 'Kaybolmayan duyurular' },
              { icon: '🗂️', label: 'Kalıcı kaynak arşivi' },
              { icon: '📚', label: 'Akademik destek kanalı' },
              { icon: '🔒', label: 'Sadece IGÜ öğrencilerine özel' },
            ].map((item: any) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-base shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-2xs text-text-muted relative z-10">
          © 2024 OpenUni — Ücretsiz, reklamsız, açık topluluk.
        </p>
      </div>

      {/* Right — Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">O</span>
            </div>
            <span className="font-display font-bold text-text-primary">OpenUni</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-text-primary">Giriş Yap</h2>
            <p className="text-text-muted text-sm mt-1.5">
              Öğrenci e-postanla giriş yap
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-posta veya kullanıcı adı */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                E-posta veya Kullanıcı Adı
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError('') }}
                  placeholder="e-posta veya kullanıcı adın"
                  className="input pl-10"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">Şifre</label>
                <Link href="/auth/forgot-password" className="text-xs text-brand hover:text-brand-hover transition-colors">
                  Şifremi unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className={cn(
                'btn-primary w-full justify-center py-2.5 text-sm mt-2',
                (isLoading || !canSubmit) && 'opacity-60 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            Henüz hesabın yok mu?{' '}
            <Link href="/auth/register" className="text-brand hover:text-brand-hover font-medium transition-colors">
              Kayıt Ol
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
    </div>
  )
}
