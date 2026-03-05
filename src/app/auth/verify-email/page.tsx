'use client'

import { Mail, RefreshCw, CheckCircle, ArrowRight, Loader2, XCircle } from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { resendVerificationEmail } from '@/lib/auth'
import { auth } from '@/lib/firebase'
import { applyActionCode, reload } from 'firebase/auth'
import { cn } from '@/lib/utils'

const COOLDOWN_SECONDS = 60

function VerifyEmailContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [status,    setStatus]    = useState<'waiting' | 'processing' | 'success' | 'error'>('waiting')
  const [error,     setError]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resent,    setResent]    = useState(false)
  const [cooldown,  setCooldown]  = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // URL'de oobCode varsa otomatik işle
  useEffect(() => {
    const mode    = searchParams.get('mode')
    const oobCode = searchParams.get('oobCode')
    if ((mode === 'verifyEmail' || mode === 'action') && oobCode) {
      setStatus('processing')
      applyActionCode(auth, oobCode)
        .then(async () => {
          if (auth.currentUser) await reload(auth.currentUser).catch(() => {})
          setStatus('success')
          setTimeout(() => router.replace('/dashboard'), 2000)
        })
        .catch((err: any) => {
          const msg = err?.code === 'auth/invalid-action-code'
            ? 'Bu doğrulama linki geçersiz veya süresi dolmuş. Yeni link isteyin.'
            : err?.code === 'auth/expired-action-code'
            ? 'Doğrulama linkinin süresi dolmuş. Yeni link isteyin.'
            : 'Doğrulama sırasında hata oluştu. Yeni link deneyin.'
          setError(msg)
          setStatus('error')
        })
    }
  }, [searchParams, router])

  async function handleResend() {
    setIsLoading(true); setError('')
    try {
      await resendVerificationEmail()
      setResent(true); setCooldown(COOLDOWN_SECONDS)
      setTimeout(() => setResent(false), 5000)
    } catch (err: any) {
      setError(err?.message ?? 'Bir hata oluştu.')
    } finally { setIsLoading(false) }
  }

  async function handleCheck() {
    const user = auth.currentUser
    if (!user) { router.replace('/auth/login'); return }
    setIsLoading(true)
    try {
      await reload(user)
      if (user.emailVerified) {
        setStatus('success')
        setTimeout(() => router.replace('/dashboard'), 1500)
      } else {
        setError('E-posta henüz doğrulanmamış. Gelen kutundaki linke tıkla.')
      }
    } catch { setError('Kontrol sırasında hata oluştu.') }
    finally { setIsLoading(false) }
  }

  if (status === 'processing') return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-2">Doğrulanıyor...</h1>
        <p className="text-text-muted text-sm">Lütfen bekle.</p>
      </div>
    </div>
  )

  if (status === 'success') return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-accent-green" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-2">E-posta Doğrulandı! 🎉</h1>
        <p className="text-text-muted text-sm mb-4">Platforma yönlendiriliyorsun...</p>
        <Link href="/dashboard" className="text-brand text-sm hover:underline">Hemen git →</Link>
      </div>
    </div>
  )

  if (status === 'error') return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-accent-red" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-2">Link Geçersiz</h1>
        <p className="text-text-secondary text-sm mb-6">{error}</p>
        {resent
          ? <div className="flex items-center justify-center gap-2 text-accent-green text-sm mb-4"><CheckCircle className="w-4 h-4" />Yeni link gönderildi!</div>
          : <button onClick={handleResend} disabled={isLoading || cooldown > 0}
              className="btn-primary w-full justify-center py-2.5 mb-3">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {cooldown > 0 ? `Yeni Link Gönder (${cooldown}s)` : 'Yeni Link Gönder'}
            </button>
        }
        <Link href="/auth/login" className="text-xs text-text-muted hover:text-text-secondary transition-colors">← Giriş sayfasına dön</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-brand" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-2">E-postanı Doğrula</h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          <span className="text-text-primary font-medium">@ogr.gelisim.edu.tr</span> adresine link gönderdik. Linke tıklayınca otomatik olarak giriş yapılacak.
        </p>
        <div className="card text-left space-y-3 mb-6">
          {['Öğrenci e-posta kutunu aç', 'OpenUni\'den gelen e-postayı bul', 'E-postadaki linke tıkla — otomatik giriş yapılır'].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-2xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
              <span className="text-xs text-text-secondary">{s}</span>
            </div>
          ))}
        </div>
        {error && <div className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5 mb-4">{error}</div>}
        {resent && <div className="flex items-center justify-center gap-2 text-accent-green text-xs mb-4"><CheckCircle className="w-4 h-4" />E-posta tekrar gönderildi!</div>}
        <button onClick={handleCheck} disabled={isLoading}
          className="btn-primary w-full justify-center py-2.5 mb-3">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Kontrol ediliyor...</> : <><ArrowRight className="w-4 h-4" />Linke tıkladım, devam et</>}
        </button>
        <button onClick={handleResend} disabled={isLoading || cooldown > 0}
          className={cn('btn-secondary w-full justify-center py-2.5 mb-4', (isLoading || cooldown > 0) && 'opacity-60 cursor-not-allowed')}>
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          {cooldown > 0 ? `Tekrar Gönder (${cooldown}s)` : 'Tekrar Gönder'}
        </button>
        <Link href="/auth/login" className="text-xs text-text-muted hover:text-text-secondary transition-colors">← Giriş sayfasına dön</Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
