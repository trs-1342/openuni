'use client'

import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { resendVerificationEmail } from '@/lib/auth'

export default function VerifyEmailPage() {
  const [resent, setResent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleResend() {
    setIsLoading(true)
    setError('')
    try {
      await resendVerificationEmail()
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    } catch (err: any) {
      setError(err?.message ?? 'Bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-brand" />
        </div>

        <h1 className="font-display font-bold text-2xl text-text-primary mb-2">
          E-postanı Doğrula
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          <span className="text-text-primary font-medium">@ogr.gelisim.edu.tr</span> adresine doğrulama bağlantısı gönderdik. Gelen kutunu kontrol et.
        </p>

        {/* Steps */}
        <div className="card text-left space-y-3 mb-6">
          {[
            'Öğrenci e-posta kutunu aç',
            'OpenUni\'den gelen e-postayı bul',
            '"E-postamı Doğrula" butonuna tıkla',
            'Platforma yönlendirileceksin',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-2xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-xs text-text-secondary">{step}</span>
            </div>
          ))}
        </div>

        {resent && (
          <div className="flex items-center justify-center gap-2 text-accent-green text-xs mb-4">
            <CheckCircle className="w-4 h-4" />
            E-posta tekrar gönderildi!
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={isLoading || resent}
          className="btn-secondary w-full justify-center py-2.5 mb-3"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {resent ? 'Gönderildi' : 'Tekrar Gönder'}
        </button>

        <Link href="/auth/login" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
          ← Giriş sayfasına dön
        </Link>
      </div>
    </div>
  )
}
