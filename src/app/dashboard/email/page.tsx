'use client'

// /dashboard/email — Owner'a özel toplu/seçili e-posta paneli (O3)
//
// YALNIZCA owner erişir. Kullanıcı listesi (ad + username + e-posta) checkbox ile
// seçilir; başlık + içerik girilir; "hemen gönder" ya da ileri tarihe planlanır.
// Planlı gönderimler `scheduledEmails` koleksiyonunda bekler; ZAMANI GELENLER BU
// PANEL AÇILDIĞINDA otomatik işlenir (serverless'ta sürekli cron yoktur — istenirse
// Vercel Cron ile /api/send-bulk-email periyodik tetiklenebilir, bkz. OZELLIK_TODO).

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection, deleteDoc, doc, getDocs, query, serverTimestamp,
  setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getAllUsers } from '@/lib/firestore'
import { isOwner } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { User } from '@/types'
import {
  Mail, Menu, Search, Send, CalendarClock, Trash2, X,
  CheckCircle, AlertCircle, Loader2, Users as UsersIcon, Clock,
} from 'lucide-react'

interface ScheduledEmail {
  id: string
  subject: string
  content: string
  recipients: { email: string; name?: string }[]
  sendAt: Date
  status: 'pending' | 'sent' | 'failed'
  createdAt: Date
}

export default function OwnerEmailPage() {
  const router = useRouter()
  const { user: firebaseUser } = useAuthStore()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const ownerHere = isOwner(profile, firebaseUser?.email)

  const [users,      setUsers]      = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())  // uid set
  const [search,     setSearch]     = useState('')
  const [subject,    setSubject]    = useState('')
  const [content,    setContent]    = useState('')
  const [scheduleAt, setScheduleAt] = useState('')   // datetime-local; boş = hemen
  const [sending,    setSending]    = useState(false)
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null)
  const [scheduled,  setScheduled]  = useState<ScheduledEmail[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Owner değilse panele giremez
  useEffect(() => {
    if (!profileLoading && profile && !ownerHere) router.replace('/dashboard')
  }, [profileLoading, profile, ownerHere, router])

  useEffect(() => {
    if (!ownerHere) return
    getAllUsers()
      .then(u => setUsers(u.filter(x => !!x.email)))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false))
    loadScheduled().then(processDue)
  }, [ownerHere]) // eslint-disable-line

  function show(text: string, ok = true) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  // ─── Planlı gönderimler ────────────────────────────────────────────────────
  async function loadScheduled(): Promise<ScheduledEmail[]> {
    try {
      const snap = await getDocs(query(collection(db, 'scheduledEmails'), where('status', '==', 'pending')))
      const rows = snap.docs.map(d => {
        const x = d.data()
        return {
          id: d.id, subject: x.subject, content: x.content,
          recipients: x.recipients ?? [],
          sendAt:    x.sendAt?.toDate?.()    ?? new Date(),
          createdAt: x.createdAt?.toDate?.() ?? new Date(),
          status: x.status,
        } as ScheduledEmail
      }).sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime())
      setScheduled(rows)
      return rows
    } catch { return [] }
  }

  // Zamanı gelen planlı e-postaları gönder (panel açıldığında çalışır)
  async function processDue(rows: ScheduledEmail[]) {
    const due = rows.filter(r => r.sendAt.getTime() <= Date.now())
    if (due.length === 0) return
    for (const r of due) {
      const ok = await sendViaApi(r.recipients, r.subject, r.content)
      try {
        await updateDoc(doc(db, 'scheduledEmails', r.id), {
          status: ok ? 'sent' : 'failed', sentAt: serverTimestamp(),
        })
      } catch {}
    }
    show(`${due.length} planlı gönderim işlendi.`)
    loadScheduled()
  }

  async function sendViaApi(
    recipients: { email: string; name?: string }[], subj: string, body: string
  ): Promise<boolean> {
    try {
      const idToken = await firebaseUser?.getIdToken()
      if (!idToken) return false
      const res = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ recipients, subject: subj, content: body }),
      })
      return res.ok
    } catch { return false }
  }

  // ─── Gönder / planla ───────────────────────────────────────────────────────
  async function handleSend() {
    if (selected.size === 0) { show('En az bir alıcı seç.', false); return }
    if (!subject.trim())     { show('Başlık boş olamaz.', false); return }
    if (!content.trim())     { show('İçerik boş olamaz.', false); return }

    const recipients = users
      .filter(u => selected.has(u.uid))
      .map(u => ({ email: u.email!, name: u.displayName }))

    setSending(true)
    try {
      if (scheduleAt) {
        const sendAt = new Date(scheduleAt)
        if (sendAt.getTime() <= Date.now()) { show('Planlanan zaman gelecekte olmalı.', false); return }
        await setDoc(doc(collection(db, 'scheduledEmails')), {
          subject: subject.trim(), content, recipients,
          sendAt: Timestamp.fromDate(sendAt),
          status: 'pending', createdAt: serverTimestamp(),
          createdBy: firebaseUser?.uid ?? null,
        })
        show(`Gönderim planlandı: ${sendAt.toLocaleString('tr-TR')} (${recipients.length} alıcı). Not: planlı e-postalar bu panel açıldığında işlenir.`)
        setSubject(''); setContent(''); setScheduleAt(''); setSelected(new Set())
        loadScheduled()
      } else {
        const ok = await sendViaApi(recipients, subject.trim(), content)
        if (ok) {
          show(`E-posta gönderildi (${recipients.length} alıcı) ✓`)
          setSubject(''); setContent(''); setSelected(new Set())
        } else show('Gönderim başarısız.', false)
      }
    } finally { setSending(false) }
  }

  async function cancelScheduled(id: string) {
    if (!confirm('Planlı gönderim iptal edilsin mi?')) return
    try { await deleteDoc(doc(db, 'scheduledEmails', id)); loadScheduled() }
    catch { show('İptal edilemedi.', false) }
  }

  // ─── Alıcı listesi ────────────────────────────────────────────────────────
  const q = search.trim().replace(/^@/, '').toLocaleLowerCase('tr')
  const filteredUsers = useMemo(() => users.filter(u =>
    !q
    || u.displayName?.toLocaleLowerCase('tr').includes(q)
    || (u as any).username?.toLowerCase().includes(q)
    || u.email?.toLowerCase().includes(q)
  ), [users, q])

  function toggle(uid: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })
  }
  function toggleAllFiltered() {
    const allSelected = filteredUsers.every(u => selected.has(u.uid))
    setSelected(prev => {
      const next = new Set(prev)
      filteredUsers.forEach(u => allSelected ? next.delete(u.uid) : next.add(u.uid))
      return next
    })
  }

  if (!ownerHere && !profileLoading) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[240px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <Mail className="w-4 h-4 text-brand" />
          <span className="font-display font-semibold text-text-primary flex-1">E-posta Paneli</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-4 items-center gap-2">
          <Mail className="w-5 h-5 text-brand" />
          <h1 className="font-display font-semibold text-text-primary">E-posta Paneli</h1>
          <span className="text-2xs text-text-muted bg-surface border border-surface-border px-2 py-0.5 rounded-full ml-1">yalnızca sistem sahibi</span>
        </div>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

          {msg && (
            <div className={cn('flex items-center gap-2 text-xs rounded-lg px-3 py-2.5 border',
              msg.ok ? 'text-accent-green bg-accent-green/10 border-accent-green/20' : 'text-accent-red bg-accent-red/10 border-accent-red/20')}>
              {msg.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {msg.text}
            </div>
          )}

          {/* Planlı gönderimler */}
          {scheduled.length > 0 && (
            <div className="card space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />Planlı gönderimler ({scheduled.length})
              </p>
              {scheduled.map(s => (
                <div key={s.id} className="flex items-center gap-3 border border-surface-border rounded-lg p-2.5">
                  <CalendarClock className="w-4 h-4 text-accent-amber shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{s.subject}</p>
                    <p className="text-2xs text-text-muted">
                      {s.sendAt.toLocaleString('tr-TR')} · {s.recipients.length} alıcı
                    </p>
                  </div>
                  <button onClick={() => cancelScheduled(s.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <p className="text-2xs text-text-muted">
                Planlı e-postalar zamanı geldiğinde bu panel açıldığında gönderilir.
              </p>
            </div>
          )}

          {/* Alıcı seçimi */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5" />Alıcılar
                <span className="text-brand normal-case">({selected.size} seçili)</span>
              </p>
              <button onClick={toggleAllFiltered} className="text-2xs text-brand hover:text-brand-hover">
                {filteredUsers.length > 0 && filteredUsers.every(u => selected.has(u.uid))
                  ? 'Listedekilerin seçimini kaldır' : 'Listedekilerin tümünü seç'}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Ad, kullanıcı adı veya e-posta ara..." className="input pl-9 text-xs py-2" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">Sonuç yok.</p>
                ) : filteredUsers.map(u => (
                  <label key={u.uid}
                    className={cn('flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all',
                      selected.has(u.uid) ? 'border-brand/40 bg-brand/5' : 'border-transparent hover:bg-surface')}>
                    <input type="checkbox" checked={selected.has(u.uid)} onChange={() => toggle(u.uid)}
                      className="accent-[#4F7EF7] w-3.5 h-3.5 shrink-0" />
                    <Avatar name={u.displayName} src={u.avatarUrl} size="sm" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {u.displayName}
                        {(u as any).username && <span className="text-text-muted font-normal"> · @{(u as any).username}</span>}
                      </p>
                      <p className="text-2xs text-text-muted truncate">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* İçerik */}
          <div className="card space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />İçerik
            </p>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Başlık</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
                placeholder="E-posta konusu" className="input text-sm" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">Mesaj</label>
                <span className="text-2xs text-text-muted tabular-nums">{content.length}/10000</span>
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} maxLength={10000}
                placeholder={'Mesajını yaz... ({{ad}} yazarsan alıcının adıyla değiştirilir)'}
                className="input resize-y text-sm leading-relaxed" />
              <p className="text-2xs text-text-muted mt-1">
                Düz metin gönderilir; {'{{ad}}'} yer tutucusu her alıcının adına çözülür.
              </p>
            </div>

            {/* Zamanlama */}
            <div className="border border-surface-border rounded-lg p-3 space-y-2">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />Gönderim zamanı
                <span className="font-normal text-text-muted">(boş = hemen gönder)</span>
              </label>
              <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                className="input text-sm py-1.5" />
              {scheduleAt && (
                <button onClick={() => setScheduleAt('')}
                  className="text-2xs text-text-muted hover:text-accent-red flex items-center gap-1">
                  <X className="w-3 h-3" />Planı kaldır (hemen gönder)
                </button>
              )}
            </div>

            <button onClick={handleSend} disabled={sending}
              className={cn('btn-primary text-sm px-5 py-2.5 flex items-center gap-2 w-full justify-center',
                sending && 'opacity-60 cursor-not-allowed')}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {scheduleAt ? 'Gönderimi Planla' : `Şimdi Gönder${selected.size > 0 ? ` (${selected.size} alıcı)` : ''}`}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
