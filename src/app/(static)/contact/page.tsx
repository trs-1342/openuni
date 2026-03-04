'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Send, CheckCircle, AlertCircle, Loader2,
  MessageSquare, Bug, Lightbulb, AlertTriangle, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'

const MESSAGE_TYPES = [
  { id: 'feedback',   label: 'Geri Bildirim',  icon: MessageSquare, color: 'text-brand',        bg: 'bg-brand/10'        },
  { id: 'complaint',  label: 'Şikayet',        icon: AlertTriangle, color: 'text-accent-red',    bg: 'bg-accent-red/10'   },
  { id: 'suggestion', label: 'Öneri',          icon: Lightbulb,     color: 'text-accent-amber',  bg: 'bg-accent-amber/10' },
  { id: 'bug',        label: 'Hata Bildirimi', icon: Bug,           color: 'text-accent-purple', bg: 'bg-accent-purple/10'},
  { id: 'other',      label: 'Diğer',          icon: FileText,      color: 'text-text-muted',    bg: 'bg-surface'         },
]

export default function ContactPage() {
  const { user: firebaseUser } = useAuthStore()
  const { profile }             = useUserProfile()

  const [form, setForm] = useState({
    name: '', email: '', type: '', subject: '', message: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  // Oturum açık kullanıcının adı ve emailini varsayılan olarak doldur
  useEffect(() => {
    const name  = profile?.displayName ?? firebaseUser?.displayName ?? ''
    const email = firebaseUser?.email ?? ''
    setForm((prev: any) => ({
      ...prev,
      name:  prev.name  || name,
      email: prev.email || email,
    }))
  }, [profile, firebaseUser])

  function update(key: string, value: string) {
    setForm((prev: any) => ({ ...prev, [key]: value }))
    setError('')
  }

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.type &&
    form.message.trim().length >= 10 &&
    !isLoading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gönderilemedi.')
      setSuccess(true)
      setForm((prev: any) => ({ ...prev, type: '', subject: '', message: '' }))
    } catch (err: any) {
      setError(err.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const isLoggedIn = !!firebaseUser

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-accent-green" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Mesajınız İletildi!</h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          Geri bildiriminiz için teşekkürler. En kısa sürede değerlendirip size geri döneceğiz.
          {form.email && ' Otomatik onay e-postası gönderildi.'}
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <button onClick={() => setSuccess(false)} className="btn-secondary px-5 py-2.5 text-sm">
            Yeni Mesaj Gönder
          </button>
          <Link href={isLoggedIn ? '/dashboard' : '/'} className="btn-primary px-5 py-2.5 text-sm">
            {isLoggedIn ? 'Dashboard’a Dön' : 'Ana Sayfaya Dön'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10 text-center space-y-3">
        <h1 className="font-display font-bold text-3xl text-text-primary">Bize Ulaşın</h1>
        <p className="text-text-secondary text-sm leading-relaxed max-w-md mx-auto">
          Şikayet, öneri veya geri bildiriminizi iletmek için formu doldurun.
          Mesajınız doğrudan ekibimize ulaşır.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Mesaj türü */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">Mesaj Türü *</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MESSAGE_TYPES.map((t: any) => {
              const Icon       = t.icon
              const isSelected = form.type === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => update('type', t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-all',
                    isSelected
                      ? `${t.bg} border-current ${t.color}`
                      : 'border-surface-border text-text-muted hover:border-surface-active hover:text-text-secondary'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isSelected ? t.color : 'text-text-muted')} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ad + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Ad Soyad *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Adınız Soyadınız"
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              E-posta *
              {isLoggedIn && (
                <span className="ml-1.5 text-text-muted font-normal text-2xs">(hesabından alındı)</span>
              )}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="ornek@ogr.gelisim.edu.tr"
              className={cn('input', isLoggedIn && 'opacity-75')}
              required
            />
          </div>
        </div>

        {/* Konu */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Konu <span className="text-text-muted font-normal">(isteğe bağlı)</span>
          </label>
          <input
            type="text"
            value={form.subject}
            onChange={e => update('subject', e.target.value)}
            placeholder="Kısaca konuyu belirtin"
            className="input"
          />
        </div>

        {/* Mesaj */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Mesaj *
            <span className={cn('ml-2 text-text-muted font-normal', form.message.length >= 10 && 'text-accent-green')}>
              ({form.message.length} / min 10)
            </span>
          </label>
          <textarea
            value={form.message}
            onChange={e => update('message', e.target.value)}
            placeholder="Mesajınızı buraya yazın. Ne kadar ayrıntılı olursa o kadar iyi..."
            rows={6}
            className="input resize-none"
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn('btn-primary w-full justify-center py-3 text-sm font-medium', !canSubmit && 'opacity-50 cursor-not-allowed')}
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
            : <><Send className="w-4 h-4" /> Mesajı Gönder</>
          }
        </button>

        <p className="text-center text-xs text-text-muted">
          Mesajınız doğrudan ekibimize iletilir.{' '}
          <Link href="/privacy" className="text-brand hover:text-brand-hover">Gizlilik politikamızı</Link>{' '}
          okuyabilirsiniz.
        </p>
      </form>
    </div>
  )
}
