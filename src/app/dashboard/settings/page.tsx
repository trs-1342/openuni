// src/app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthStore } from '@/store/authStore'
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection'
import { updateUserProfile, setUsername as saveUsernameToFirestore, isUsernameTaken } from '@/lib/firestore'
import { useThemeStore, THEMES } from '@/store/themeStore'
import type { Theme } from '@/store/themeStore'
import { changePassword, logoutUser, downloadMyData, resendVerificationEmail } from '@/lib/auth'
import { updateProfile, sendEmailVerification, reload } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, GraduationCap, Mail, Shield, LogOut, Hash,
  Save, CheckCircle, AlertCircle, Menu, Clock,
  Lock, Eye, EyeOff, Download, RefreshCw, ShieldCheck,
  ChevronRight, Info, BookOpen, FileText, ExternalLink,
  Palette, Loader2, Camera, Trash2, Bell,
} from 'lucide-react'
import { cn, validateUsername } from '@/lib/utils'
import {
  getFakulteList, getBolumList, getGradeOptions,
  USER_TYPE_LABELS, type UserType,
} from '@/lib/departments'

// ─── Şifre Değiştirme Panel ────────────────────────────────────────────────
function ChangePasswordSection() {
  const [current, setCurrent]     = useState('')
  const [next, setNext]           = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  const passwordsMatch = next === confirm && next.length >= 6
  const canSubmit = current && passwordsMatch && !isLoading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (next !== confirm) { setError('Yeni şifreler eşleşmiyor.'); return }
    if (next.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return }

    setIsLoading(true)
    setError('')
    try {
      await changePassword(current, next)
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      const msg = err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
        ? 'Mevcut şifre hatalı.'
        : err?.code === 'auth/requires-recent-login'
        ? 'Güvenlik nedeniyle yeniden giriş yapmanız gerekiyor.'
        : 'Şifre değiştirilemedi. Tekrar deneyin.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Mevcut şifre */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Mevcut Şifre</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => { setCurrent(e.target.value); setError('') }}
              placeholder="••••••••"
              className="input pl-10 pr-10"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Yeni şifre */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Yeni Şifre</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => { setNext(e.target.value); setError('') }}
              placeholder="En az 6 karakter"
              className={cn(
                'input pl-10 pr-10',
                next && next.length < 6 && 'border-accent-red/50',
                next && next.length >= 6 && 'border-accent-green/50',
              )}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowNext(!showNext)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
              {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {next && next.length < 6 && (
            <p className="text-2xs text-accent-red mt-1">En az 6 karakter gerekli</p>
          )}
        </div>

        {/* Yeni şifre tekrar */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Yeni Şifre Tekrar</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError('') }}
              placeholder="••••••••"
              className={cn(
                'input pl-10',
                confirm && next !== confirm && 'border-accent-red/50',
                confirm && next === confirm && next.length >= 6 && 'border-accent-green/50',
              )}
              autoComplete="new-password"
            />
          </div>
          {confirm && next !== confirm && (
            <p className="text-2xs text-accent-red mt-1">Şifreler eşleşmiyor</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-3 py-2.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Şifre başarıyla değiştirildi!
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'btn-primary text-sm px-5 py-2 flex items-center gap-2',
            !canSubmit && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading
            ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Lock className="w-3.5 h-3.5" />
          }
          Şifreyi Güncelle
        </button>
      </form>
    </div>
  )
}

// ─── Email Oturum Doğrulaması ──────────────────────────────────────────────
function EmailVerificationSection() {
  const { user } = useAuthStore()
  const [isSending, setIsSending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [sent, setSent]           = useState(false)
  const [cooldown, setCooldown]   = useState(0)
  const [verified, setVerified]   = useState(user?.emailVerified ?? false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleSendCode() {
    setIsSending(true)
    setError('')
    try {
      await resendVerificationEmail()
      setSent(true)
      setCooldown(60)
      setTimeout(() => setSent(false), 5000)
    } catch (err: any) {
      setError('E-posta gönderilemedi. Tekrar deneyin.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleCheck() {
    setIsChecking(true)
    setError('')
    try {
      const u = auth.currentUser
      if (!u) { setError('Oturum bulunamadı.'); return }
      await reload(u)
      if (u.emailVerified) {
        setVerified(true)
      } else {
        setError('E-posta henüz doğrulanmamış. Gelen kutunu kontrol et.')
      }
    } catch {
      setError('Kontrol sırasında hata oluştu.')
    } finally {
      setIsChecking(false)
    }
  }

  if (verified) {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-accent-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">E-posta Doğrulandı</p>
            <p className="text-xs text-text-muted mt-0.5">Hesabın e-posta ile doğrulanmış durumda.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
        <AlertCircle className="w-4 h-4 text-accent-amber mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-text-primary">E-posta Doğrulanmamış</p>
          <p className="text-xs text-text-muted mt-0.5">
            Hesabın tam olarak aktif olmak için e-postanı doğrula. Doğrulama bağlantısı gönderebiliriz.
          </p>
        </div>
      </div>

      {sent && (
        <div className="flex items-center gap-2 text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-3 py-2.5">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          Doğrulama e-postası gönderildi! Gelen kutunu kontrol et.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSendCode}
          disabled={isSending || cooldown > 0}
          className={cn(
            'btn-secondary text-xs flex items-center gap-1.5 px-4 py-2',
            (isSending || cooldown > 0) && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isSending
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Mail className="w-3.5 h-3.5" />
          }
          {cooldown > 0 ? `Tekrar Gönder (${cooldown}s)` : 'Doğrulama E-postası Gönder'}
        </button>

        <button
          onClick={handleCheck}
          disabled={isChecking}
          className={cn('btn-ghost text-xs flex items-center gap-1.5 px-3 py-2', isChecking && 'opacity-60')}
        >
          {isChecking
            ? <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
          Doğrulandı mı kontrol et
        </button>
      </div>
    </div>
  )
}

// ─── Ana Sayfa ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router  = useRouter()
  const { user: firebaseUser } = useAuthStore()
  const { profile, isLoading }  = useUserProfile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab]   = useState<'profile' | 'security' | 'data' | 'appearance' | 'notifications'>('profile')

  const [displayName,  setDisplayName]  = useState('')
  const [userType,     setUserType]     = useState<UserType>('lisans')
  const [fakulte,      setFakulte]      = useState('')
  const [department,   setDepartment]   = useState('')
  const [grade,        setGrade]        = useState('')
  const [isDirty,        setIsDirty]        = useState(false)
  const [isSaving,       setIsSaving]       = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress,  setAvatarProgress]  = useState(0)
  const [saved,        setSaved]        = useState(false)
  const [profileError, setProfileError] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentIdSaved, setStudentIdSaved] = useState(false)
  const [emailPostNotify, setEmailPostNotify] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const { theme, setTheme } = useThemeStore()
  // Username
  const [username,        setUsernameInput]   = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [usernameError,   setUsernameError]   = useState('')
  const [usernameChecking,setUsernameChecking]= useState(false)
  const [usernameSaved,   setUsernameSaved]   = useState(false)
  const [isListed,        setIsListed]        = useState(true)

  // Sayfa açılışında token refresh — emailVerified güncel gelsin
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.reload().catch(() => {})
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '')
      setUserType((profile as any).userType ?? 'lisans')
      setFakulte((profile as any).fakulte ?? '')
      setDepartment(profile.department ?? '')
      setGrade(profile.grade?.toString() ?? '')
      const uname = (profile as any).username ?? ''
      setUsernameInput(uname)
      setOriginalUsername(uname)
      setIsListed((profile as any).isListedInDirectory !== false)
      setStudentId((profile as any).studentId ?? '')
      setEmailPostNotify((profile as any).emailPostNotify ?? false)
      setIsDirty(false)
    }
  }, [profile])

  async function handleSaveUsername() {
    if (!firebaseUser || !profile) return
    const err = validateUsername(username)
    if (err) { setUsernameError(err); return }
    const changesLeft = (profile as any).usernameChangesLeft ?? 2
    const isFirst = !(profile as any).username
    if (!isFirst && changesLeft <= 0) { setUsernameError('Kullanıcı adı değiştirme hakkınız kalmadı.'); return }
    setUsernameChecking(true); setUsernameError('')
    try {
      await saveUsernameToFirestore(firebaseUser.uid, username)
      const saved = username.toLowerCase()
      setUsernameInput(saved)
      setOriginalUsername(saved)
      setUsernameSaved(true)
      setTimeout(() => setUsernameSaved(false), 3000)
    } catch (e: any) {
      setUsernameError(e?.message ?? 'Hata oluştu.')
    } finally { setUsernameChecking(false) }
  }

  // emailVerified true olduysa Firestore'daki isVerified'ı da güncelle
  useEffect(() => {
    if (firebaseUser?.emailVerified && profile && !(profile as any).isVerified) {
      updateUserProfile(firebaseUser.uid, { isVerified: true } as any).catch(() => {})
    }
  }, [firebaseUser, profile])

  async function handleToggleListed() {
    if (!firebaseUser) return
    const newVal = !isListed
    setIsListed(newVal)
    await updateUserProfile(firebaseUser.uid, { isListedInDirectory: newVal } as any)
  }

  async function handleAvatarUpload(file: File) {
    if (!firebaseUser) return
    if (!file.type.startsWith('image/')) { alert('Sadece resim dosyası yüklenebilir.'); return }
    if (file.size > 3 * 1024 * 1024) { alert('Resim en fazla 3MB olabilir.'); return }
    setAvatarUploading(true)
    setAvatarProgress(0)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storageRef = ref(storage, `avatars/${firebaseUser.uid}.${ext}`)
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file)
        task.on('state_changed',
          snap => setAvatarProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            await updateUserProfile(firebaseUser.uid, { avatarUrl: url } as any)
            await updateProfile(firebaseUser, { photoURL: url })
            resolve()
          }
        )
      })
    } catch { alert('Fotoğraf yüklenemedi. Tekrar deneyin.') }
    finally { setAvatarUploading(false); setAvatarProgress(0) }
  }

  async function handleAvatarDelete() {
    if (!firebaseUser || !profile?.avatarUrl) return
    if (!confirm('Profil fotoğrafını silmek istediğine emin misin?')) return
    setAvatarUploading(true)
    try {
      // Storage'dan sil (path tahmin et, hata olursa devam et)
      try {
        const uid = firebaseUser.uid
        const url = profile.avatarUrl
        const pathMatch = url.match(/avatars%2F([^?]+)/)
        if (pathMatch) {
          const storageRef = ref(storage, `avatars/${decodeURIComponent(pathMatch[1])}`)
          await deleteObject(storageRef)
        }
      } catch { /* storage dosyası yoksa devam et */ }
      await updateUserProfile(firebaseUser.uid, { avatarUrl: null } as any)
      await updateProfile(firebaseUser, { photoURL: null })
    } catch { alert('Fotoğraf silinemedi.') }
    finally { setAvatarUploading(false) }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) return
    if (!displayName.trim()) { setProfileError('Ad soyad boş olamaz.'); return }
    setIsSaving(true)
    setProfileError('')
    try {
      const profileData: any = {
        displayName: displayName.trim(),
        userType,
        grade: grade === 'hazirlik' ? 'hazirlik' : grade ? parseInt(grade) : null,
      }
      // Boş string ile mevcut veriyi ezme — sadece değer varsa yaz
      if (fakulte)    profileData.fakulte    = fakulte
      if (department) profileData.department = department
      // studentId: sadece Firestore'da boşsa ekle (dolu olana dokunma)
      if (studentId.trim() && !(profile as any)?.studentId) {
        profileData.studentId = studentId.trim()
      }
      await updateUserProfile(firebaseUser.uid, profileData)
      await updateProfile(firebaseUser, { displayName: displayName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setProfileError(err?.message ?? 'Kayıt sırasında hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDownload() {
    if (!firebaseUser) return
    setIsDownloading(true)
    try {
      await downloadMyData(firebaseUser.uid)
    } catch {
      alert('Veri indirilemedi. Tekrar deneyin.')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleLogout() {
    await logoutUser()
    router.replace('/auth/login')
  }

  const currentName = profile?.displayName ?? firebaseUser?.displayName ?? 'Kullanıcı'

  const tabs = [
    { id: 'profile',       label: 'Profil',      icon: User },
    { id: 'security',      label: 'Güvenlik',    icon: Shield },
    { id: 'appearance',    label: 'Tema',         icon: Palette },
    { id: 'notifications', label: 'Bildirimler',  icon: Bell },
    { id: 'data',          label: 'Verilerim',    icon: Download },
  ] as const

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[240px]">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1">Profil & Ayarlar</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <h1 className="font-display font-semibold text-text-primary">Profil & Ayarlar</h1>
          <p className="text-xs text-text-muted mt-0.5">Hesap bilgilerini ve güvenlik ayarlarını yönet</p>
        </div>

        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">

          {/* Profil özeti */}
          <div className="card flex items-center gap-4">
            {isLoading
              ? <div className="w-12 h-12 rounded-full bg-surface animate-pulse shrink-0" />
              : (
                <div className="relative shrink-0 group">
                  <Avatar name={currentName} src={profile?.avatarUrl} size="lg" />
                  {/* Upload overlay */}
                  <label className="absolute inset-0 rounded-full flex items-center justify-center
                    bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {avatarUploading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Camera className="w-4 h-4 text-white" />
                    }
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
                  </label>
                  {/* Progress ring */}
                  {avatarUploading && avatarProgress > 0 && (
                    <div className="absolute -inset-1 rounded-full border-2 border-brand/50" />
                  )}
                </div>
              )
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary">{currentName}</p>
              <p className="text-xs text-text-muted mt-0.5">{firebaseUser?.email}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {(firebaseUser?.emailVerified || (profile as any)?.isVerified)
                  ? <span className="flex items-center gap-1 text-2xs text-accent-green"><ShieldCheck className="w-3 h-3" />Doğrulandı</span>
                  : <span className="flex items-center gap-1 text-2xs text-accent-amber"><AlertCircle className="w-3 h-3" />E-posta doğrulanmadı</span>
                }
              </div>
            </div>
          </div>

          {/* Tab navigasyonu */}
          <div className="flex gap-1 bg-surface border border-surface-border rounded-lg p-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-brand text-white'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Profil Tab */}
          {activeTab === 'profile' && (
            <section className="space-y-4">
              <div className="card">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Profil Fotoğrafı */}
                  <div className="border border-surface-border rounded-xl p-4 space-y-3">
                    <label className="block text-xs font-medium text-text-secondary">Profil Fotoğrafı</label>
                    <div className="flex items-center gap-4">
                      <div className="relative group shrink-0">
                        <Avatar name={currentName} src={profile?.avatarUrl} size="xl" />
                        <label className="absolute inset-0 rounded-full flex items-center justify-center
                          bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {avatarUploading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Camera className="w-5 h-5 text-white" />
                          }
                          <input type="file" accept="image/*" className="sr-only"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
                        </label>
                      </div>
                      <div className="flex-1 space-y-2">
                        {avatarUploading && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-2xs text-text-muted">
                              <span>Yükleniyor...</span><span>{avatarProgress}%</span>
                            </div>
                            <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                              <div className="h-full bg-brand rounded-full transition-all" style={{width:`${avatarProgress}%`}} />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className={cn(
                            'btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer',
                            avatarUploading && 'opacity-50 pointer-events-none'
                          )}>
                            <Camera className="w-3.5 h-3.5" />
                            {profile?.avatarUrl ? 'Değiştir' : 'Fotoğraf Ekle'}
                            <input type="file" accept="image/*" className="sr-only"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
                          </label>
                          {profile?.avatarUrl && (
                            <button type="button" onClick={handleAvatarDelete}
                              disabled={avatarUploading}
                              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-accent-red hover:text-accent-red hover:bg-accent-red/10 disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" /> Sil
                            </button>
                          )}
                        </div>
                        <p className="text-2xs text-text-muted">JPG, PNG veya WebP · Maks. 3 MB</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Ad Soyad</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="text" value={displayName} onChange={e => { setDisplayName(e.target.value); setProfileError(''); setIsDirty(true) }}
                        placeholder="Ad Soyad" className="input pl-10" />
                    </div>
                  </div>
                  {/* Kullanıcı Adı */}
                  <div className="border border-surface-border rounded-xl p-4 space-y-3 bg-surface/30">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-text-secondary">Kullanıcı Adı</label>
                      <span className="text-2xs text-text-muted bg-surface px-2 py-0.5 rounded-full border border-surface-border">
                        {(profile as any)?.usernameChangesLeft ?? 2} değiştirme hakkı kaldı
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={e => { setUsernameInput(e.target.value.toLowerCase()); setUsernameError('') }}
                          placeholder="kullanici_adi"
                          className={cn('input pl-7', usernameError && 'border-accent-red/50')}
                          maxLength={30}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveUsername}
                        disabled={usernameChecking || !username || username === originalUsername}
                        className="px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {usernameChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : usernameSaved ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                        {usernameSaved ? 'Kaydedildi' : 'Kaydet'}
                      </button>
                    </div>
                    {usernameError && (
                      <p className="text-xs text-accent-red flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />{usernameError}
                      </p>
                    )}
                    <p className="text-2xs text-text-muted">Harf, rakam, nokta (.), alt çizgi (_) ve tire (-) kullanılabilir. . _ - ile başlayıp bitemez.</p>
                    {/* Dizinde listeleme */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, paddingTop:12, borderTop:'1px solid var(--color-surface-border, #2a3347)'}}>
                      <div style={{flex:1, minWidth:0}}>
                        <p className="text-xs font-medium text-text-secondary">Kullanıcılar listesinde görün</p>
                        <p className="text-2xs text-text-muted" style={{marginTop:2}}>Diğer kullanıcılar seni üyeler sayfasında görebilir</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleListed}
                        role="switch"
                        aria-checked={isListed}
                        style={{
                          position:'relative',
                          display:'inline-block',
                          width:44,
                          height:24,
                          minWidth:44,
                          flexShrink:0,
                          borderRadius:12,
                          border:'none',
                          padding:0,
                          cursor:'pointer',
                          backgroundColor: isListed ? '#4F7EF7' : '#4B5563',
                          transition:'background-color 0.2s',
                          overflow:'hidden',
                        }}
                      >
                        <span style={{
                          position:'absolute',
                          top:3,
                          left: isListed ? 23 : 3,
                          width:18,
                          height:18,
                          borderRadius:'50%',
                          backgroundColor:'white',
                          boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
                          transition:'left 0.2s',
                        }} />
                      </button>
                    </div>
                  </div>


                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      E-posta <span className="text-text-muted font-normal">(değiştirilemez)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="email" value={firebaseUser?.email ?? ''} disabled
                        className="input pl-10 opacity-50 cursor-not-allowed bg-surface/50" />
                    </div>
                  </div>

                  {/* Öğrenci No */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Öğrenci No{' '}
                      {(profile as any)?.studentId
                        ? <span className="text-text-muted font-normal">(değiştirilemez)</span>
                        : <span className="text-accent-amber font-normal">(henüz eklenmedi)</span>
                      }
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      {(profile as any)?.studentId ? (
                        <input type="text"
                          value={(profile as any).studentId}
                          disabled
                          className="input pl-10 opacity-50 cursor-not-allowed bg-surface/50" />
                      ) : (
                        <input type="text"
                          value={studentId}
                          onChange={e => { setStudentId(e.target.value.replace(/\D/g, '')); setIsDirty(true) }}
                          placeholder="Öğrenci numaranızı girin"
                          maxLength={12}
                          className="input pl-10" />
                      )}
                    </div>
                    {!(profile as any)?.studentId && studentId.length > 0 && studentId.length < 6 && (
                      <p className="text-2xs text-accent-amber mt-1">En az 6 rakam olmalıdır.</p>
                    )}
                  </div>
                  {/* Statü seçimi */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Statü</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['lisans','onlisans','ogretmen','diger'] as UserType[]).map(t => (
                        <button key={t} type="button"
                          onClick={() => { setUserType(t); setFakulte(''); setDepartment(''); setGrade(''); setIsDirty(true) }}
                          className={cn('py-2 px-3 rounded-lg text-xs border transition-all text-left',
                            userType === t ? 'bg-brand/10 border-brand text-brand' : 'border-surface-border text-text-muted hover:border-surface-active')}>
                          {USER_TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fakülte / MYO */}
                  {(userType === 'lisans' || userType === 'onlisans') && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        {userType === 'lisans' ? 'Fakülte' : 'Meslek Yüksekokulu'}
                      </label>
                      <select value={fakulte}
                        onChange={e => { setFakulte(e.target.value); setDepartment(''); setIsDirty(true) }}
                        className="input appearance-none bg-surface">
                        <option value="">Seçin</option>
                        {getFakulteList(userType).map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Bölüm */}
                  {fakulte && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Bölüm / Program</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <select value={department} onChange={e => { setDepartment(e.target.value); setIsDirty(true) }}
                          className="input pl-10 appearance-none bg-surface">
                          <option value="">Bölüm seçin</option>
                          {getBolumList(userType, fakulte).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Sınıf */}
                  {getGradeOptions(userType, true).length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Sınıf</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {getGradeOptions(userType, true).map(g => (
                          <button key={g.value} type="button"
                            onClick={() => { setGrade(g.value); setIsDirty(true) }}
                            className={cn('py-2 rounded-lg text-xs border transition-all',
                              grade === g.value ? 'bg-brand/10 border-brand text-brand' : 'border-surface-border text-text-muted hover:border-surface-active')}>
                            {g.label.replace('. Sınıf','').replace(' Sınıfı','')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {profileError && (
                    <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{profileError}
                    </div>
                  )}
                  {saved && (
                    <div className="flex items-center gap-2 text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-3 py-2.5">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />Profil başarıyla güncellendi!
                    </div>
                  )}
                  <button type="submit" disabled={isSaving || !isDirty}
                    className={cn('btn-primary text-sm px-5 py-2 flex items-center gap-2', isSaving && 'opacity-70 cursor-not-allowed')}>
                    {isSaving
                      ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Save className="w-3.5 h-3.5" />
                    }
                    Kaydet
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* Güvenlik Tab */}
          {activeTab === 'security' && (
            <section className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />Şifre Değiştir
                </h3>
                <ChangePasswordSection />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />E-posta Oturum Doğrulaması
                </h3>
                <EmailVerificationSection />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />Oturum
                </h3>
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary font-medium">Otomatik oturum kapanması</p>
                      <p className="text-xs text-text-muted mt-0.5">Giriş yaptıktan 3 saat sonra oturumun kapanır</p>
                    </div>
                    <span className="text-xs text-text-muted bg-surface border border-surface-border rounded px-2.5 py-1 tabular-nums">3 saat</span>
                  </div>
                  <div className="border-t border-surface-border pt-3">
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 text-sm text-accent-red hover:text-accent-red/80 font-medium transition-colors">
                      <LogOut className="w-4 h-4" />Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Verilerim Tab */}
          {/* ── Tema Sekmesi ── */}
          {activeTab === 'appearance' && (
            <section className="space-y-4">
              <div className="card space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Tema</h3>
                  <p className="text-xs text-text-muted">Arayüz renk temasını seç. Tercih tarayıcında saklanır.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as Theme)}
                      className={cn(
                        'relative flex flex-col gap-3 p-4 rounded-xl border-2 transition-all text-left',
                        theme === t.id
                          ? 'border-brand bg-brand/5'
                          : 'border-surface-border hover:border-surface-active'
                      )}
                    >
                      {/* Renk önizleme */}
                      <div className="flex gap-1.5">
                        {t.preview.map((color, i) => (
                          <div
                            key={i}
                            className="rounded-md flex-1 h-8 border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{t.emoji}</span>
                        <span className={cn(
                          'text-sm font-medium',
                          theme === t.id ? 'text-brand' : 'text-text-primary'
                        )}>
                          {t.label}
                        </span>
                        {theme === t.id && (
                          <span className="ml-auto text-2xs bg-brand text-white px-1.5 py-0.5 rounded-full font-medium">Aktif</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" /> E-posta Bildirimleri
                </h3>
              </div>

              {/* Paylaşım bildirimi toggle */}
              <div className="border border-surface-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary mb-0.5">Paylaşım Bildirimi</p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Bir paylaşım yaptığında e-posta ile bildirim al. Paylaşımın yayınlandığını onaylar.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2 mt-0.5">
                  {notifSaved && <CheckCircle className="w-3.5 h-3.5 text-accent-green" />}
                  {notifSaving && <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />}
                  <button
                    type="button"
                    disabled={notifSaving}
                    onClick={async () => {
                      const next = !emailPostNotify
                      setEmailPostNotify(next)
                      setNotifSaving(true)
                      try {
                        await updateUserProfile(firebaseUser!.uid, { emailPostNotify: next } as any)
                        setNotifSaved(true)
                        setTimeout(() => setNotifSaved(false), 2000)
                      } catch {
                        setEmailPostNotify(!next) // rollback
                      } finally {
                        setNotifSaving(false)
                      }
                    }}
                    className={[
                      'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      emailPostNotify ? 'bg-brand' : 'bg-surface-border',
                      notifSaving ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    <span className={[
                      'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                      emailPostNotify ? 'left-6' : 'left-1',
                    ].join(' ')} />
                  </button>
                </div>
              </div>

              {/* Bildirim emaili */}
              <div className="border border-surface-border rounded-xl p-4 bg-surface/30">
                <p className="text-xs font-medium text-text-secondary mb-1">Bildirimler şu adrese gönderilir</p>
                <p className="text-sm text-text-primary font-mono">{firebaseUser?.email}</p>
              </div>
            </section>
          )}

          {activeTab === 'data' && (
            <section className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" />Verilerimi İndir
                </h3>
                <div className="card space-y-4">
                  <div className="text-sm text-text-secondary leading-relaxed">
                    Platformdaki tüm kişisel verilerinizi (profil bilgileri, kaydedilenler) JSON formatında indirebilirsiniz.
                    Bu dosya KVKK kapsamındaki veri erişim hakkınız gereğince sunulmaktadır.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-muted">
                    {['Profil bilgileri', 'Bölüm ve sınıf', 'Kayıtlı gönderiler', 'Hesap oluşturma tarihi'].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-accent-green shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={cn('btn-secondary text-sm flex items-center gap-2 px-5 py-2', isDownloading && 'opacity-70 cursor-not-allowed')}
                  >
                    {isDownloading
                      ? <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                      : <Download className="w-4 h-4" />
                    }
                    {isDownloading ? 'Hazırlanıyor...' : 'Verilerimi İndir (JSON)'}
                  </button>
                </div>
              </div>

              {/* Hesap bilgisi */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />Hesap Bilgileri
                </h3>
                <div className="card divide-y divide-surface-border">
                  {[
                    { label: 'Rol', value: profile?.role === 'moderator' ? '🛡 Moderatör' : profile?.role === 'admin' ? '👑 Admin' : '🎓 Öğrenci' },
                    { label: 'Statü', value: USER_TYPE_LABELS[(profile as any)?.userType as UserType] ?? '—' },
                    { label: 'Katılım tarihi', value: profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                    { label: 'Fakülte / MYO', value: (profile as any)?.fakulte || '—' },
                    { label: 'Bölüm', value: profile?.department || '—' },
                    { label: 'Sınıf', value: profile?.grade ? (profile.grade === 'hazirlik' ? 'Hazırlık' : `${profile.grade}. Sınıf`) : '—' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-text-secondary">{row.label}</span>
                      <span className="text-xs text-text-primary">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hesap Silme */}
              <div>
                <h3 className="text-xs font-semibold text-accent-red/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />Tehlikeli Alan
                </h3>
                <DeleteAccountSection />
              </div>
            </section>
          )}

          {/* ─── Platform Bağlantıları ─────────────────────────────────── */}
          <div className="border-t border-surface-border pt-5">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />Platform Bilgileri
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { href: 'https://obis.gelisim.edu.tr',   icon: GraduationCap, label: 'OBİS',                 desc: 'Öğrenci bilgi sistemi',      external: true },
                { href: 'https://lms.gelisim.edu.tr',    icon: BookOpen,      label: 'LMS',                  desc: 'Ders yönetim sistemi',       external: true },
                { href: '/about',   icon: Info,           label: 'Hakkımızda',           desc: 'Platform hakkında bilgi',    external: false },
                { href: '/guide',   icon: BookOpen,       label: 'Kullanım Kılavuzu',    desc: 'Nasıl kullanılır?',          external: false },
                { href: '/privacy', icon: Shield,         label: 'Gizlilik Politikası',  desc: 'KVKK ve veri güvenliği',     external: false },
                { href: '/contact', icon: Mail,           label: 'Bize Ulaşın',          desc: 'Şikayet ve geri bildirim',   external: false },
              ].map(link => {
                const Icon = link.icon
                return (
                  <Link key={link.href} href={link.href}
                    target={(link as any).external ? '_blank' : undefined}
                    rel={(link as any).external ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border hover:border-brand/40 hover:bg-surface transition-all group">
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0 group-hover:bg-brand/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">{link.label}</p>
                      <p className="text-2xs text-text-muted">{link.desc}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
