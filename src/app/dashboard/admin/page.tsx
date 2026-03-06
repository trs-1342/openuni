// src/app/dashboard/admin/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  getAllUsers, getAllPosts, hardDeletePost, deletePost,
  banUser, unbanUser, muteUser, unmuteUser, setUserRole,
  getPendingTeachers, approveTeacher, rejectTeacher,
} from '@/lib/firestore'
import { timeAgo, cn } from '@/lib/utils'
import type { User, Post } from '@/types'
import {
  ShieldAlert, Users, FileText, Image, Menu, Search,
  Ban, VolumeX, Volume2, ShieldCheck, ShieldOff, Trash2,
  AlertTriangle, CheckCircle, X, Loader2, RefreshCw,
  ChevronDown, Clock, Filter, GraduationCap, Check, XCircle,
} from 'lucide-react'

const ADMIN_EMAIL = 'khalil.khattab@ogr.gelisim.edu.tr'

// ─── Ban/Mute Dialog ──────────────────────────────────────────────────────────
function ModerationDialog({
  user: target, action, onConfirm, onClose,
}: {
  user: User
  action: 'ban' | 'mute' | 'unban' | 'unmute'
  onConfirm: (reason: string, until: Date | null) => void
  onClose: () => void
}) {
  const [reason,   setReason]   = useState('')
  const [duration, setDuration] = useState<'1h' | '24h' | '7d' | '30d' | 'forever'>('24h')
  const isRemoving = action === 'unban' || action === 'unmute'

  function getUntil(): Date | null {
    if (isRemoving || duration === 'forever') return null
    const now = new Date()
    if (duration === '1h')  { now.setHours(now.getHours() + 1) }
    if (duration === '24h') { now.setDate(now.getDate() + 1) }
    if (duration === '7d')  { now.setDate(now.getDate() + 7) }
    if (duration === '30d') { now.setDate(now.getDate() + 30) }
    return now
  }

  const actionLabel = {
    ban: 'Engelle', mute: 'Sustur', unban: 'Engeli Kaldır', unmute: 'Susturmayı Kaldır',
  }[action]

  const colorClass = isRemoving ? 'text-accent-green' : 'text-accent-red'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#131929] border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={cn('font-semibold text-base', colorClass)}>{actionLabel}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-surface-border">
          <Avatar name={target.displayName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{target.displayName}</p>
            <p className="text-2xs text-text-muted truncate">{target.email}</p>
          </div>
        </div>

        {!isRemoving && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Gerekçe</label>
              <textarea value={reason} onChange={(e: any) => setReason(e.target.value)}
                placeholder="Neden bu işlemi yapıyorsunuz?" rows={2}
                className="input resize-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Süre</label>
              <div className="grid grid-cols-5 gap-1">
                {(['1h','24h','7d','30d','forever'] as const).map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={cn('py-1.5 rounded text-xs font-medium border transition-all',
                      duration === d ? 'bg-accent-red/10 border-accent-red text-accent-red' : 'border-surface-border text-text-muted hover:border-surface-active')}>
                    {d === 'forever' ? '∞' : d}
                  </button>
                ))}
              </div>
              {duration === 'forever' && <p className="text-2xs text-accent-red mt-1.5">⚠️ Süresiz işlem</p>}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">İptal</button>
          <button
            onClick={() => onConfirm(reason, getUntil())}
            className={cn('flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
              isRemoving ? 'bg-accent-green text-white hover:bg-accent-green/90' : 'bg-accent-red text-white hover:bg-accent-red/90')}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kullanıcı Satırı ─────────────────────────────────────────────────────────
function UserRow({ user: u, onAction, currentUserEmail, onResetUsername }: any) {
  const [open, setOpen] = useState(false)
  const isBanned = u.isBanned && (!u.banUntil || new Date(u.banUntil) > new Date())
  const isMuted  = u.isMuted  && (!u.muteUntil || new Date(u.muteUntil) > new Date())
  const isSelf   = u.email === currentUserEmail || u.email === 'khalil.khattab@ogr.gelisim.edu.tr'

  return (
    <div className="border border-surface-border rounded-xl overflow-hidden">
      {/* Ana satır */}
      <div className="flex items-center gap-3 p-3" onClick={() => setOpen((o: any) => !o)}>
        <Avatar name={u.displayName} src={u.avatarUrl} size="sm" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-medium text-text-primary truncate">{u.displayName}</p>
            {u.role === 'admin' && <span className="text-2xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-sm font-medium">Admin</span>}
            {u.role === 'moderator' && <span className="text-2xs bg-accent-purple/10 text-accent-purple px-1.5 py-0.5 rounded-sm font-medium">Mod</span>}
            {isBanned && <span className="text-2xs bg-accent-red/10 text-accent-red px-1.5 py-0.5 rounded-sm font-medium">Engelli</span>}
            {isMuted  && <span className="text-2xs bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded-sm font-medium">Susturuldu</span>}
          </div>
          <p className="text-2xs text-text-muted truncate">{u.email}</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-text-muted transition-transform shrink-0', open && 'rotate-180')} />
      </div>

      {/* Genişletilmiş aksiyon paneli */}
      {open && (
        <div className="border-t border-surface-border bg-surface p-3 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 text-2xs text-text-muted">
            <div>Katılım: {u.joinedAt ? timeAgo(u.joinedAt) : '—'}</div>
            <div>Bölüm: {u.department ?? '—'}</div>
            <div>Öğrenci no: {(u as any).studentId ?? '—'}</div>
            <div>Tip: {(u as any).userType ?? '—'}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Moderatör ata/kaldır */}
            {u.role !== 'admin' && (
              u.role === 'moderator'
                ? <button onClick={() => onAction(u, 'unmod')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 transition-all">
                    <ShieldOff className="w-3 h-3" />Mod Kaldır
                  </button>
                : <button onClick={() => onAction(u, 'mod')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 transition-all">
                    <ShieldCheck className="w-3 h-3" />Mod Yap
                  </button>
            )}
            {/* Sustur/Kaldır - kendi hesabında gösterme */}
            {!isSelf && (isMuted
              ? <button onClick={() => onAction(u, 'unmute')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-accent-green/30 text-accent-green hover:bg-accent-green/10 transition-all">
                  <Volume2 className="w-3 h-3" />Susturmayı Kaldır
                </button>
              : <button onClick={() => onAction(u, 'mute')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/10 transition-all">
                  <VolumeX className="w-3 h-3" />Sustur
                </button>
            )}
            {/* Engelle/Kaldır - kendi hesabında gösterme */}
            {!isSelf && (isBanned
              ? <button onClick={() => onAction(u, 'unban')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-accent-green/30 text-accent-green hover:bg-accent-green/10 transition-all">
                  <CheckCircle className="w-3 h-3" />Engeli Kaldır
                </button>
              : <button onClick={() => onAction(u, 'ban')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-all">
                  <Ban className="w-3 h-3" />Engelle
                </button>
            )}
          </div>
            {onResetUsername && (
              <button onClick={() => onResetUsername(u.uid)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-surface-border text-text-muted hover:bg-surface transition-all">
                🔄 Username Sıfırla
              </button>
            )}
          {isBanned && u.banReason && (
            <p className="text-2xs text-text-muted bg-accent-red/5 border border-accent-red/10 rounded px-2 py-1.5">
              Engel gerekçesi: {u.banReason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Post Satırı ─────────────────────────────────────────────────────────────
function PostRow({ post: p, onDelete }: { post: any; onDelete: (id: string) => any; [k:string]:any }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Bu gönderiyi kalıcı olarak silmek istiyorsunuz?')) return
    setDeleting(true)
    try { await hardDeletePost(p.id); onDelete(p.id) }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex items-start gap-3 p-3 border border-surface-border rounded-xl hover:border-surface-active transition-all">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary line-clamp-1">{p.title}</p>
        <p className="text-2xs text-text-muted mt-0.5 line-clamp-1">{p.author.displayName} · {timeAgo(p.createdAt)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-2xs px-1.5 py-0.5 rounded-sm border font-medium',
            p.status === 'archived' ? 'border-text-muted/20 text-text-muted' :
            p.status === 'rejected' ? 'border-accent-red/30 text-accent-red' :
            'border-accent-green/30 text-accent-green')}>
            {p.status}
          </span>
          <span className="text-2xs text-text-muted">{p.commentCount} yorum · {p.viewCount} görüntüleme</span>
        </div>
      </div>
      <button onClick={handleDelete} disabled={deleting}
        className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all shrink-0">
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ─── Ana Admin Sayfası ────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { user: firebaseUser } = useAuthStore()
  const { profile } = useUserProfile()

  const [tab,        setTab]        = useState<'users' | 'posts' | 'teachers'>('users')
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([])
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [users,      setUsers]      = useState<User[]>([])
  const [posts,      setPosts]      = useState<Post[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [search,     setSearch]     = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [dialog, setDialog] = useState<{
    user: User; action: 'ban' | 'mute' | 'unban' | 'unmute'
  } | null>(null)
  const [roleFilter,  setRoleFilter]  = useState<'all' | 'student' | 'moderator' | 'banned' | 'muted'>('all')
  const [typeFilter,  setTypeFilter]  = useState<'all' | 'lisans' | 'onlisans' | 'ogretmen' | 'pending_teacher' | 'diger'>('all')

  const isAdmin = firebaseUser?.email === ADMIN_EMAIL || profile?.role === 'admin'

  useEffect(() => {
    if (!isAdmin && profile) { router.replace('/dashboard'); return }
    if (!isAdmin) return
    load()
    loadTeachers()
  }, [isAdmin, profile])

  async function load() {
    setIsLoading(true)
    try {
      const [u, p] = await Promise.all([getAllUsers(), getAllPosts()])
      setUsers(u); setPosts(p)
    } finally { setIsLoading(false) }
  }

    async function handleResetUsername(uid: string) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      await updateDoc(doc(db, 'users', uid), { usernameChangesLeft: 2 })
      loadUsers()
    } catch (e: any) { alert(e?.message) }
  }

  async function loadTeachers() {
    setTeachersLoading(true)
    try {
      const t = await getPendingTeachers()
      setPendingTeachers(t)
    } catch (e: any) {
      // Firestore rules henüz eklenmemiş olabilir
      console.warn('[loadTeachers]', e?.code, e?.message)
      setPendingTeachers([])
    } finally { setTeachersLoading(false) }
  }

  async function handleTeacherAction(teacher: any, action: 'approve' | 'reject') {
    try {
      if (action === 'approve') {
        await approveTeacher(teacher.uid)
      } else {
        await rejectTeacher(teacher.uid)
      }
      // Email gönder
      await fetch('/api/teacher-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: teacher.email, displayName: teacher.displayName }),
      })
      showToast(action === 'approve' ? 'Öğretmen onaylandı ✓' : 'Başvuru reddedildi', action === 'approve' ? 'ok' : 'err')
      loadTeachers()
    } catch (e: any) {
      showToast(e?.message ?? 'Hata oluştu', 'err')
    }
  }

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDialogConfirm(reason: string, until: Date | null) {
    if (!dialog) return
    const { user: target, action } = dialog
    setDialog(null)
    try {
      if (action === 'ban')    await banUser(target.uid, reason, until)
      if (action === 'unban')  await unbanUser(target.uid)
      if (action === 'mute')   await muteUser(target.uid, reason, until)
      if (action === 'unmute') await unmuteUser(target.uid)
      showToast('İşlem başarılı ✓')
      await load()
    } catch { showToast('Hata oluştu', 'err') }
  }

  async function handleRoleAction(u: User, action: 'mod' | 'unmod') {
    try {
      await setUserRole(u.uid, action === 'mod' ? 'moderator' : 'student')
      showToast(`${u.displayName} ${action === 'mod' ? 'moderatör yapıldı' : 'moderatörlükten çıkarıldı'} ✓`)
      await load()
    } catch { showToast('Hata oluştu', 'err') }
  }

  function handleUserAction(u: User, action: 'ban' | 'mute' | 'unban' | 'unmute' | 'mod' | 'unmod') {
    if (action === 'mod' || action === 'unmod') { handleRoleAction(u, action); return }
    setDialog({ user: u, action })
  }

  // Filtre + arama
  const filteredUsers = users.filter((u: any) => {
    const matchSearch = !search || u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const now = new Date()
    const matchFilter =
      roleFilter === 'all'       ? true :
      roleFilter === 'moderator' ? u.role === 'moderator' :
      roleFilter === 'student'   ? u.role === 'student' :
      roleFilter === 'banned'    ? (u.isBanned && (!u.banUntil || new Date(u.banUntil) > now)) :
      roleFilter === 'muted'     ? (u.isMuted  && (!u.muteUntil || new Date(u.muteUntil) > now)) : true
    const matchType = typeFilter === 'all' ? true : u.userType === typeFilter
    return matchSearch && matchFilter && matchType
  })

  const filteredPosts = posts.filter((p: any) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.author.displayName.toLowerCase().includes(search.toLowerCase())
  )

  if (!isAdmin && !isLoading) return null

  const stats = {
    total:    users.length,
    mods:     users.filter((u: any) => u.role === 'moderator').length,
    banned:   users.filter((u: any) => u.isBanned).length,
    muted:    users.filter((u: any) => u.isMuted).length,
    posts:    posts.length,
    archived: posts.filter((p: any) => p.status === 'archived').length,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[240px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium transition-all',
          toast.type === 'ok' ? 'bg-accent-green text-white' : 'bg-accent-red text-white'
        )}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Moderation dialog */}
      {dialog && (
        <ModerationDialog
          user={dialog.user} action={dialog.action}
          onConfirm={handleDialogConfirm} onClose={() => setDialog(null)}
        />
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <ShieldAlert className="w-4 h-4 text-brand" />
          <span className="font-display font-semibold text-text-primary flex-1">Admin Paneli</span>
          <button onClick={load} disabled={isLoading} className="p-1.5 rounded hover:bg-surface text-text-muted">
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand" />
            <h1 className="font-display font-semibold text-text-primary">Admin Paneli</h1>
            <span className="text-2xs text-text-muted bg-surface border border-surface-border px-2 py-0.5 rounded-full ml-1">{firebaseUser?.email}</span>
          </div>
          <button onClick={load} disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />Yenile
          </button>
        </div>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

          {/* İstatistikler */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'Kullanıcı', value: stats.total,    color: 'text-brand' },
              { label: 'Moderatör',  value: stats.mods,     color: 'text-accent-purple' },
              { label: 'Engelli',    value: stats.banned,   color: 'text-accent-red' },
              { label: 'Susturuldu', value: stats.muted,    color: 'text-accent-amber' },
              { label: 'Gönderi',    value: stats.posts,    color: 'text-accent-green' },
              { label: 'Arşiv',      value: stats.archived, color: 'text-text-muted' },
            ].map(s => (
              <div key={s.label} className="card text-center py-3 px-2">
                <p className={cn('text-xl font-bold font-display', s.color)}>{s.value}</p>
                <p className="text-2xs text-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tab seçici */}
          <div className="flex gap-1 bg-surface border border-surface-border rounded-lg p-1">
            {[
              { id: 'users',    icon: Users,          label: 'Kullanıcılar' },
              { id: 'posts',    icon: FileText,        label: 'Gönderiler' },
              { id: 'teachers', icon: GraduationCap,  label: `Öğretmen Onayı${pendingTeachers.length > 0 ? ` (${pendingTeachers.length})` : ''}` },
            ].map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-medium transition-all',
                    tab === t.id ? 'bg-brand text-white' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover')}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              )
            })}
          </div>

          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" value={search} onChange={(e: any) => setSearch(e.target.value)}
              placeholder={tab === 'users' ? 'İsim veya e-posta ara...' : 'Başlık veya yazar ara...'}
              className="input pl-10" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"><X className="w-4 h-4" /></button>}
          </div>

          {/* Kullanıcı filtre çipleri */}
          {tab === 'users' && (
            <div className="space-y-2">
              {/* Rol filtresi */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
                {([
                  { id: 'all',       label: 'Tümü' },
                  { id: 'student',   label: 'Öğrenci' },
                  { id: 'moderator', label: 'Moderatör' },
                  { id: 'banned',    label: '🚫 Engelli' },
                  { id: 'muted',     label: '🔇 Susturuldu' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setRoleFilter(f.id)}
                    className={cn('px-2.5 py-1 rounded-full text-xs border transition-all',
                      roleFilter === f.id ? 'bg-brand/10 border-brand text-brand' : 'border-surface-border text-text-muted hover:border-surface-active')}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Kullanıcı tipi filtresi */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xs text-text-muted shrink-0 w-[18px]" />
                {([
                  { id: 'all',             label: 'Tüm Tipler' },
                  { id: 'lisans',          label: '🎓 Lisans' },
                  { id: 'onlisans',        label: '📚 Ön Lisans' },
                  { id: 'ogretmen',        label: '👨‍🏫 Öğretmen' },
                  { id: 'pending_teacher', label: '⏳ Onay Bekleyen' },
                  { id: 'diger',           label: '👤 Diğer' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setTypeFilter(f.id)}
                    className={cn('px-2.5 py-1 rounded-full text-xs border transition-all',
                      typeFilter === f.id ? 'bg-accent-purple/10 border-accent-purple text-accent-purple' : 'border-surface-border text-text-muted hover:border-surface-active')}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* İçerik */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
          ) : tab === 'users' ? (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">{filteredUsers.length} kullanıcı</p>
              {filteredUsers.length === 0
                ? <div className="text-center py-8 text-text-muted text-sm">Sonuç bulunamadı.</div>
                : filteredUsers.map((u: any) => (
                    <UserRow key={u.uid} user={u} onAction={handleUserAction} currentUserEmail={firebaseUser?.email} />
                  ))
              }
            </div>
          ) : tab === 'posts' ? (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">{filteredPosts.length} gönderi</p>
              {filteredPosts.length === 0
                ? <div className="text-center py-8 text-text-muted text-sm">Sonuç bulunamadı.</div>
                : filteredPosts.map((p: any) => (
                    <PostRow key={p.id} post={p}
                      onDelete={id => setPosts((prev: any) => prev.filter((x: any) => x.id !== id))} />
                  ))
              }
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">{pendingTeachers.length} bekleyen başvuru</p>
                <button onClick={loadTeachers} disabled={teachersLoading}
                  className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
                  <RefreshCw className={cn('w-3 h-3', teachersLoading && 'animate-spin')} />Yenile
                </button>
              </div>
              {teachersLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
              ) : pendingTeachers.length === 0 ? (
                <div className="text-center py-12 card">
                  <GraduationCap className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-sm text-text-secondary font-medium">Bekleyen başvuru yok</p>
                  <p className="text-xs text-text-muted mt-1">Yeni öğretmen başvuruları burada görünecek</p>
                </div>
              ) : (
                pendingTeachers.map((t: any) => (
                  <div key={t.uid} className="card space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-accent-purple" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{t.displayName}</p>
                        <p className="text-xs text-text-muted mt-0.5">{t.email}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {t.fakulte && <span className="text-2xs bg-surface border border-surface-border rounded px-2 py-0.5 text-text-muted">{t.fakulte}</span>}
                          {t.department && <span className="text-2xs bg-surface border border-surface-border rounded px-2 py-0.5 text-text-muted">{t.department}</span>}
                          <span className="text-2xs bg-accent-amber/10 border border-accent-amber/20 rounded px-2 py-0.5 text-accent-amber">Bekliyor</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-surface-border">
                      <button onClick={() => handleTeacherAction(t, 'reject')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition-all">
                        <XCircle className="w-3.5 h-3.5" />Reddet
                      </button>
                      <button onClick={() => handleTeacherAction(t, 'approve')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20 transition-all">
                        <Check className="w-3.5 h-3.5" />Onayla
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
