'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resetPassword, getAuthErrorMessage } from '@/lib/auth'

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState('')
  const [sent,      setSent]      = useState(false)

  const isValidEmail = email.trim().toLowerCase().endsWith('@ogr.gelisim.edu.tr')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail) {
      setError('Lütfen öğrenci e-posta adresinizi girin (@ogr.gelisim.edu.tr)')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err: any) {
      const msg = getAuthErrorMessage(err?.code)
      // Güvenlik: hesap yoksa bile "gönderildi" mesajı ver (enum attack engeli)
      if (err?.code === 'auth/user-not-found') {
        setSent(true)
      } else {
        setError(msg ?? err?.message ?? 'Bir hata oluştu.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Arka plan efekti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="font-display font-bold text-xl text-text-primary">OpenUni</span>
          </div>
          <h1 className="text-xl font-display font-semibold text-text-primary">
            Parolanı Sıfırla
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            E-posta adresine sıfırlama bağlantısı göndereceğiz
          </p>
        </div>

        <div className="card p-6 shadow-2xl">
          {sent ? (
            /* Gönderildi ekranı */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-accent-green" />
              </div>
              <h2 className="font-semibold text-text-primary mb-2">E-posta Gönderildi</h2>
              <p className="text-sm text-text-muted leading-relaxed mb-1">
                <span className="text-text-secondary font-medium">{email}</span> adresine
                parola sıfırlama bağlantısı gönderildi.
              </p>
              <p className="text-xs text-text-muted mb-6">
                Gelen kutunda göremiyorsan spam klasörünü kontrol et.
              </p>
              <Link href="/auth/login"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-all">
                Giriş Sayfasına Dön
              </Link>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Öğrenci E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="ad.soyad@ogr.gelisim.edu.tr"
                    className={cn(
                      'input pl-10 w-full transition-colors',
                      error && 'border-accent-red/50 focus:border-accent-red'
                    )}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {/* Email doğrulama göstergesi */}
                {email && (
                  <p className={cn(
                    'text-2xs mt-1.5 flex items-center gap-1',
                    isValidEmail ? 'text-accent-green' : 'text-text-muted'
                  )}>
                    {isValidEmail
                      ? <><CheckCircle className="w-3 h-3" /> Geçerli öğrenci e-postası</>
                      : '@ogr.gelisim.edu.tr ile bitmeli'
                    }
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isValidEmail}
                className={cn(
                  'w-full py-2.5 rounded-lg bg-brand text-white text-sm font-semibold transition-all flex items-center justify-center gap-2',
                  (isLoading || !isValidEmail) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-brand/90'
                )}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Gönderiliyor...</>
                  : 'Sıfırlama Bağlantısı Gönder'
                }
              </button>

              <div className="pt-1 text-center">
                <Link href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Giriş sayfasına dön
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
