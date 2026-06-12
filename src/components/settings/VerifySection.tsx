'use client'

// Ayarlar — Öğrenci kartı ile hesap doğrulama (O5)
//
// Admin onayı bekleyen kullanıcı, öğrenci kartı fotoğrafı yükleyerek doğrulama
// (isAdminVerified) talep edebilir. KVKK: görsel studentCards/{uid}/ altına gider;
// yalnızca sahibi ve yetkili (owner/yönetici) görebilir, profilde gösterilmez,
// inceleme bitince silinir.

import { useEffect, useState } from 'react'
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  getMyVerificationRequest, submitVerificationRequest,
  type VerificationRequest,
} from '@/lib/firestore'
import { cn } from '@/lib/utils'
import {
  IdCard, Upload, Loader2, Clock, XCircle, AlertCircle, ShieldCheck,
} from 'lucide-react'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 10

export function VerifySection() {
  const { user: firebaseUser } = useAuthStore()
  const { profile } = useUserProfile()

  const [request,   setRequest]   = useState<VerificationRequest | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [file,      setFile]      = useState<File | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!firebaseUser?.uid) return
    getMyVerificationRequest(firebaseUser.uid)
      .then(setRequest)
      .finally(() => setLoading(false))
  }, [firebaseUser?.uid])

  function pickFile(f: File) {
    setError('')
    if (!ALLOWED.includes(f.type)) { setError('Yalnızca JPG, PNG veya WebP yükleyebilirsin.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`Görsel en fazla ${MAX_MB} MB olabilir.`); return }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit() {
    if (!firebaseUser || !file) return
    setUploading(true); setProgress(0); setError('')
    try {
      // D-6 (denetim): sabit dosya adı — yeniden gönderim eskisinin ÜZERİNE yazar,
      // klasörde yetim kart görseli birikmez (KVKK veri minimizasyonu + depolama).
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const cardPath = `studentCards/${firebaseUser.uid}/card.${ext}`
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef(storage, cardPath), file)
        task.on('state_changed',
          snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          () => resolve()
        )
      })
      await submitVerificationRequest({
        uid:         firebaseUser.uid,
        displayName: profile?.displayName ?? firebaseUser.displayName ?? undefined,
        username:    (profile as any)?.username ?? undefined,
        studentId:   (profile as any)?.studentId ?? undefined,
        cardPath,
      })
      setRequest(await getMyVerificationRequest(firebaseUser.uid))
      setFile(null)
      if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
    } catch {
      setError('Yükleme başarısız. Tekrar dene.')
    } finally { setUploading(false) }
  }

  // Zaten onaylı hesapta bölüm gösterilmez (parent da kontrol eder)
  if ((profile as any)?.isAdminVerified === true) return null

  if (loading) {
    return <div className="card"><div className="h-16 bg-surface animate-pulse rounded" /></div>
  }

  // Bekleyen talep
  if (request?.status === 'pending') {
    return (
      <div className="card space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-accent-amber" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Doğrulama talebin inceleniyor</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Öğrenci kartın yetkili tarafından inceleniyor. Onaylanınca hesabın doğrulanır
              ve paylaşım yapabilirsin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const rejected = request?.status === 'rejected'

  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
          <IdCard className="w-4 h-4 text-brand" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Öğrenci kartıyla hesabını doğrula</p>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            Hesabın henüz onaylanmadı. Öğrenci kartının fotoğrafını yükleyerek doğrulama talep edebilirsin.
            Kart görselini <strong>yalnızca yetkili</strong> görür, profilde gösterilmez ve inceleme sonrası silinir.
          </p>
        </div>
      </div>

      {rejected && (
        <div className="flex items-start gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Önceki başvurun reddedildi.</p>
            {request?.reason && <p className="mt-0.5 text-accent-red/80">Gerekçe: {request.reason}</p>}
            <p className="mt-0.5 text-text-muted">Yeni bir kart fotoğrafı yükleyerek tekrar deneyebilirsin.</p>
          </div>
        </div>
      )}

      {/* Dosya seçimi */}
      <label className={cn(
        'block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
        preview ? 'border-brand/40 bg-brand/5' : 'border-surface-border hover:border-brand/40'
      )}>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="Kart önizleme" className="max-h-44 mx-auto rounded-lg object-contain" />
            <p className="text-2xs text-text-muted">Değiştirmek için tıkla</p>
          </div>
        ) : (
          <div className="py-3">
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-xs text-text-secondary font-medium">Öğrenci kartı fotoğrafı yükle</p>
            <p className="text-2xs text-text-muted mt-1">JPG, PNG veya WebP · Maks. {MAX_MB} MB</p>
          </div>
        )}
      </label>

      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-2xs text-text-muted">
            <span>Yükleniyor...</span><span>{progress}%</span>
          </div>
          <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={!file || uploading}
        className={cn('btn-primary text-sm px-5 py-2 flex items-center gap-2',
          (!file || uploading) && 'opacity-50 cursor-not-allowed')}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
        Doğrulama Talep Et
      </button>
    </div>
  )
}
