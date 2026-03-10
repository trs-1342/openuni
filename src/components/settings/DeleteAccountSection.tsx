'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2, Eye, EyeOff, Lock } from 'lucide-react'
import { deleteAccount } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * Hesap Silme Bölümü — Settings sayfasına eklenecek bileşen.
 *
 * Kullanım:
 *   import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection'
 *   ...
 *   <DeleteAccountSection />
 */
export function DeleteAccountSection() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState('')

  const canDelete = password.length >= 6 && confirmText === 'HESABIMI SIL'

  async function handleDelete() {
    if (!canDelete) return
    setIsLoading(true)
    setError('')
    try {
      await deleteAccount(password)
      // Hesap silindi — login sayfasına yönlendir
      router.replace('/auth/login')
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Şifre hatalı. Lütfen tekrar deneyin.')
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Çok fazla deneme. Birkaç dakika bekleyin.')
      } else {
        setError(err?.message ?? 'Hesap silinirken bir hata oluştu.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <div className="card border-accent-red/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-red/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-accent-red" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">Hesabı Sil</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Hesabını kalıcı olarak silersin. Gönderilerin anonim olarak kalır, yorumların ve kişisel verilerin tamamen silinir. Bu işlem geri alınamaz.
            </p>
            <button
              onClick={() => setShowConfirm(true)}
              className="mt-3 px-4 py-2 rounded-lg border border-accent-red/30 text-accent-red text-xs font-medium hover:bg-accent-red/10 transition-colors"
            >
              Hesabımı silmek istiyorum
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-accent-red/30 bg-accent-red/5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-accent-red" />
        <h3 className="text-sm font-semibold text-accent-red">Hesap Silme Onayı</h3>
      </div>

      <div className="space-y-4">
        {/* Uyarı */}
        <div className="text-xs text-text-secondary leading-relaxed space-y-1.5">
          <p>Bu işlem sonucunda:</p>
          <div className="pl-3 space-y-1">
            <p>• Firebase hesabın kalıcı olarak silinecek</p>
            <p>• Tüm kişisel verilerin (profil, ayarlar) silinecek</p>
            <p>• Tüm yorumların silinecek</p>
            <p>• Gönderilerin <span className="text-text-primary font-medium">"Silinen Hesap"</span> olarak anonimleştirilecek</p>
            <p>• Aynı e-posta ile tekrar kayıt olabilirsin ama eski veriler geri gelmez</p>
          </div>
        </div>

        {/* Şifre */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Şifreni onayla
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Mevcut şifren"
              className="input pl-10 pr-10 w-full"
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

        {/* Onay metni */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Onaylamak için <span className="text-accent-red font-bold">HESABIMI SIL</span> yaz
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="HESABIMI SIL"
            className="input w-full"
            autoComplete="off"
          />
        </div>

        {/* Hata */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Butonlar */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleDelete}
            disabled={!canDelete || isLoading}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all',
              canDelete && !isLoading
                ? 'bg-accent-red text-white hover:bg-accent-red/90'
                : 'bg-accent-red/20 text-accent-red/50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Siliniyor...</>
            ) : (
              <><Trash2 className="w-4 h-4" />Hesabımı Kalıcı Olarak Sil</>
            )}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setPassword(''); setConfirmText(''); setError('') }}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-lg border border-surface-border text-text-secondary text-sm hover:bg-surface transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}
