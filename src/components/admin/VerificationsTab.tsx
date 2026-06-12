'use client'

// Admin panel — Öğrenci Kartı Doğrulama sekmesi (O5)
// Bekleyen talepler listelenir; kart görseli Storage kurallarına tabi olarak
// (getDownloadURL yetki ister) yalnızca yetkili tarafından görüntülenir.
// Onay → isAdminVerified; ret → gerekçe. Her iki durumda kart görseli silinir.

import { useEffect, useState } from 'react'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import {
  getPendingVerificationRequests, resolveVerificationRequest,
  type VerificationRequest,
} from '@/lib/firestore'
import { cn, timeAgo } from '@/lib/utils'
import {
  RefreshCw, Loader2, IdCard, Check, XCircle, X,
  ShieldCheck, AlertCircle, ImageOff,
} from 'lucide-react'

function CardImage({ cardPath }: { cardPath: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    getDownloadURL(storageRef(storage, cardPath))
      .then(setUrl)
      .catch(() => setErr(true))
  }, [cardPath])

  if (err) return (
    <div className="flex items-center gap-2 text-xs text-text-muted bg-surface border border-surface-border rounded-lg p-3">
      <ImageOff className="w-4 h-4" />Kart görseli yüklenemedi (silinmiş olabilir).
    </div>
  )
  if (!url) return <div className="h-40 bg-surface rounded-lg animate-pulse" />

  return (
    <>
      <button onClick={() => setZoom(true)} className="block w-full">
        <img src={url} alt="Öğrenci kartı"
          className="w-full max-h-56 object-contain rounded-lg border border-surface-border bg-background" />
        <p className="text-2xs text-text-muted mt-1">Büyütmek için tıkla</p>
      </button>
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setZoom(false)}>
          <img src={url} alt="Öğrenci kartı" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white"><X className="w-5 h-5" /></button>
        </div>
      )}
    </>
  )
}

function RejectDialog({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#131929] border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-accent-red">Başvuruyu Reddet</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Ret gerekçesi (kullanıcıya gösterilir)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={300}
            placeholder="Örn: Kart fotoğrafı okunaklı değil, lütfen tekrar yükleyin."
            className="input resize-none text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">İptal</button>
          <button onClick={() => onConfirm(reason.trim())} disabled={!reason.trim()}
            className={cn('flex-1 py-2.5 text-sm font-semibold rounded-lg bg-accent-red text-white hover:bg-accent-red/90 transition-all',
              !reason.trim() && 'opacity-60 cursor-not-allowed')}>
            Reddet
          </button>
        </div>
      </div>
    </div>
  )
}

export function VerificationsTab({ onResolved }: { onResolved?: () => void }) {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busyUid,  setBusyUid]  = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<VerificationRequest | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function load() {
    setLoading(true)
    try { setRequests(await getPendingVerificationRequests()) }
    catch { setRequests([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function show(text: string, ok = true) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  async function resolve(req: VerificationRequest, approve: boolean, reason?: string) {
    setBusyUid(req.uid)
    try {
      await resolveVerificationRequest(req.uid, approve, reason)
      show(approve ? `${req.displayName ?? req.uid} doğrulandı ✓` : 'Başvuru reddedildi', approve)
      await load()
      onResolved?.()
    } catch { show('İşlem başarısız (yetki sorunu olabilir).', false) }
    finally { setBusyUid(null) }
  }

  return (
    <div className="space-y-3">
      {rejecting && (
        <RejectDialog
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => { const r = rejecting; setRejecting(null); resolve(r, false, reason) }}
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">{requests.length} bekleyen kart doğrulama talebi</p>
        <button onClick={load} disabled={loading}
          className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />Yenile
        </button>
      </div>

      {msg && (
        <div className={cn('flex items-center gap-2 text-xs rounded px-3 py-2.5 border',
          msg.ok ? 'text-accent-green bg-accent-green/10 border-accent-green/20' : 'text-accent-red bg-accent-red/10 border-accent-red/20')}>
          {msg.ok ? <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 card">
          <IdCard className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary font-medium">Bekleyen talep yok</p>
          <p className="text-xs text-text-muted mt-1">Öğrenci kartı doğrulama talepleri burada görünecek</p>
        </div>
      ) : (
        requests.map(req => (
          <div key={req.uid} className="card space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <IdCard className="w-5 h-5 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{req.displayName ?? '—'}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {req.username && <span className="text-2xs text-text-muted">@{req.username}</span>}
                  {req.studentId && <span className="text-2xs bg-surface border border-surface-border rounded px-2 py-0.5 text-text-muted">No: {req.studentId}</span>}
                  <span className="text-2xs text-text-muted">{timeAgo(req.createdAt)}</span>
                </div>
              </div>
            </div>

            <CardImage cardPath={req.cardPath} />

            <div className="flex gap-2 pt-1 border-t border-surface-border">
              <button onClick={() => setRejecting(req)} disabled={busyUid === req.uid}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-all">
                <XCircle className="w-3.5 h-3.5" />Reddet
              </button>
              <button onClick={() => resolve(req, true)} disabled={busyUid === req.uid}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20 transition-all">
                {busyUid === req.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Onayla ve Doğrula
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
