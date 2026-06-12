'use client'

// Admin panel — E-posta Şablonları sekmesi (O2)
// Şablonlar Firestore'da emailTemplates/{id}; yoksa koddaki varsayılan geçerli.
// Body düz metindir, {{degisken}} yer tutucuları desteklenir; render'da escape edilir.

import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { writeSystemLog } from '@/lib/firestore'
import { EMAIL_TEMPLATES, type EmailTemplateDef } from '@/lib/email-templates'
import { cn } from '@/lib/utils'
import { Mail, Save, RotateCcw, CheckCircle, AlertCircle, Loader2, Variable } from 'lucide-react'

export function EmailTemplatesTab() {
  const { user: firebaseUser } = useAuthStore()
  const [selected, setSelected] = useState<EmailTemplateDef>(EMAIL_TEMPLATES[0])
  const [subject,  setSubject]  = useState('')
  const [body,     setBody]     = useState('')
  const [isCustom, setIsCustom] = useState(false)   // Firestore'da kayıtlı özel sürüm var mı
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  async function loadTemplate(def: EmailTemplateDef) {
    setLoading(true); setMsg(null)
    try {
      const snap = await getDoc(doc(db, 'emailTemplates', def.id))
      if (snap.exists()) {
        const d = snap.data()
        setSubject(d.subject ?? def.defaultSubject)
        setBody(d.body ?? def.defaultBody)
        setIsCustom(true)
      } else {
        setSubject(def.defaultSubject)
        setBody(def.defaultBody)
        setIsCustom(false)
      }
    } catch {
      setSubject(def.defaultSubject)
      setBody(def.defaultBody)
      setIsCustom(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadTemplate(selected) }, [selected.id]) // eslint-disable-line

  function show(text: string, ok = true) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleSave() {
    if (!subject.trim() || !body.trim()) { show('Başlık ve içerik boş olamaz.', false); return }
    if (subject.length > 200)  { show('Başlık en fazla 200 karakter olabilir.', false); return }
    if (body.length > 10000)   { show('İçerik çok uzun.', false); return }
    setSaving(true)
    try {
      await setDoc(doc(db, 'emailTemplates', selected.id), {
        subject: subject.trim(),
        body,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser?.uid ?? null,
      })
      setIsCustom(true)
      show('Şablon kaydedildi ✓')
      writeSystemLog({ level: 'info', event: 'template.update', source: 'admin',
        message: `E-posta şablonu güncellendi: ${selected.name}`, details: { templateId: selected.id } })
    } catch { show('Kaydedilemedi (yetkin yetmiyor olabilir).', false) }
    finally { setSaving(false) }
  }

  async function handleReset() {
    if (!confirm('Şablon varsayılana döndürülsün mü? Özel sürüm silinecek.')) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'emailTemplates', selected.id))
      setSubject(selected.defaultSubject)
      setBody(selected.defaultBody)
      setIsCustom(false)
      show('Varsayılana döndürüldü ✓')
      writeSystemLog({ level: 'info', event: 'template.reset', source: 'admin',
        message: `E-posta şablonu varsayılana döndü: ${selected.name}`, details: { templateId: selected.id } })
    } catch { show('İşlem başarısız.', false) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Şablon seçici */}
      <div className="flex gap-1.5 flex-wrap">
        {EMAIL_TEMPLATES.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5',
              selected.id === t.id ? 'bg-brand/10 border-brand text-brand' : 'border-surface-border text-text-muted hover:border-surface-active')}>
            <Mail className="w-3 h-3" />{t.name}
          </button>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">{selected.name}</p>
            <p className="text-xs text-text-muted mt-0.5">{selected.description}</p>
          </div>
          <span className={cn('text-2xs px-2 py-0.5 rounded-full border shrink-0',
            isCustom ? 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple' : 'bg-surface border-surface-border text-text-muted')}>
            {isCustom ? 'Özel sürüm' : 'Varsayılan'}
          </span>
        </div>

        {/* Kullanılabilir değişkenler */}
        <div className="border border-surface-border rounded-lg p-3 bg-surface/30">
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Variable className="w-3 h-3" />Kullanılabilir değişkenler
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.variables.map(v => (
              <span key={v.key} title={v.label}
                className="text-2xs bg-surface border border-surface-border rounded px-2 py-1 text-text-secondary font-mono cursor-help">
                {'{{'}{v.key}{'}}'} <span className="text-text-muted font-sans">— {v.label}</span>
              </span>
            ))}
          </div>
          <p className="text-2xs text-text-muted mt-2">
            Şablon düz metindir; HTML yazılamaz (güvenlik için gönderimde escape edilir).
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Konu</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} className="input text-sm" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">İçerik</label>
                <span className="text-2xs text-text-muted tabular-nums">{body.length}/10000</span>
              </div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} maxLength={10000}
                className="input resize-y text-sm leading-relaxed font-mono" />
            </div>

            {msg && (
              <div className={cn('flex items-center gap-2 text-xs rounded px-3 py-2.5 border',
                msg.ok ? 'text-accent-green bg-accent-green/10 border-accent-green/20' : 'text-accent-red bg-accent-red/10 border-accent-red/20')}>
                {msg.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                {msg.text}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className={cn('btn-primary text-sm px-5 py-2 flex items-center gap-2', saving && 'opacity-60 cursor-not-allowed')}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Kaydet
              </button>
              {isCustom && (
                <button onClick={handleReset} disabled={saving}
                  className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5" />Varsayılana Dön
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
