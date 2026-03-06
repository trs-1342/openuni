// src/app/auth/register/page.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, ArrowRight, Lock, Mail, User,
  GraduationCap, AlertCircle, CheckCircle, Hash,
  ChevronLeft, Globe, Building2,
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { cn, isValidStudentEmail } from '@/lib/utils'
import { registerUser, getAuthErrorMessage } from '@/lib/auth'
import { validateUsername } from '@/lib/utils'
import { USER_TYPE_LABELS, getFakulteList, getBolumList, getGradeOptions } from '@/lib/departments'
import type { UserType } from '@/lib/departments'

// ─── Kayıt modu ──────────────────────────────────────────────────────────────
type RegisterMode = 'igu' | 'visitor' | null

interface FormState {
  email: string; displayName: string; studentId: string; username: string
  userType: UserType | ''; fakulte: string; department: string; grade: string
  password: string; passwordConfirm: string
  // Ziyaretçi
  hasUniversity: boolean | null; visitorUniversity: string; visitorFakulte: string; visitorDepartment: string
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'En az 8 karakter', ok: password.length >= 8 },
    { label: 'Büyük harf',       ok: /[A-Z]/.test(password) },
    { label: 'Rakam',            ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
      {checks.map(c => (
        <span key={c.label} className={cn('flex items-center gap-1 text-2xs', c.ok ? 'text-accent-green' : 'text-text-muted')}>
          <CheckCircle className="w-2.5 h-2.5" />{c.label}
        </span>
      ))}
    </div>
  )
}

// ─── Mod seçim ekranı ─────────────────────────────────────────────────────────
function ModePicker({ onSelect }: { onSelect: (m: RegisterMode) => void }) {
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => onSelect('igu')}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-border hover:border-brand/50 hover:bg-brand/5 transition-all group text-left">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
          <GraduationCap className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">IGÜ Öğrencisi / Öğretim Görevlisi</p>
          <p className="text-2xs text-text-muted mt-0.5">@ogr.gelisim.edu.tr veya @gelisim.edu.tr e-postası gerekli</p>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors shrink-0" />
      </button>

      <button type="button" onClick={() => onSelect('visitor')}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-border hover:border-accent-purple/50 hover:bg-accent-purple/5 transition-all group text-left">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center shrink-0 group-hover:bg-accent-purple/20 transition-colors">
          <Globe className="w-5 h-5 text-accent-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Ziyaretçi</p>
          <p className="text-2xs text-text-muted mt-0.5">IGÜ dışından katılmak isteyenler için</p>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-purple transition-colors shrink-0" />
      </button>
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function RegisterPage() {
  useAuthGuard()
  const router = useRouter()

  const [mode, setMode] = useState<RegisterMode>(null)
  const [form, setForm] = useState<FormState>({
    email: '', displayName: '', studentId: '', username: '', userType: '',
    fakulte: '', department: '', grade: '', password: '', passwordConfirm: '',
    hasUniversity: null, visitorUniversity: '', visitorFakulte: '', visitorDepartment: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState('')
  const [step, setStep]                 = useState<1 | 2>(1)

  function update(key: keyof FormState, value: any) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'userType') { next.fakulte = ''; next.department = ''; next.grade = '' }
      if (key === 'fakulte')  { next.department = ''; next.grade = '' }
      if (key === 'hasUniversity' && !value) {
        next.visitorUniversity = ''; next.visitorFakulte = ''; next.visitorDepartment = ''
      }
      return next
    })
    setError('')
  }

  // ── Doğrulama ───────────────────────────────────────────────────────────────
  const emailValid     = mode === 'visitor' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) : isValidStudentEmail(form.email)
  const passwordsMatch = form.password === form.passwordConfirm && form.passwordConfirm !== ''
  const usernameErr    = form.username ? validateUsername(form.username) : null

  const isTeacher = form.userType === 'ogretmen' || form.userType === 'diger'

  // IGÜ adım 1
  const iguStep1Ok = emailValid && form.displayName.trim() !== '' && form.userType !== '' &&
    (isTeacher || (form.fakulte !== '' && form.department !== '')) &&
    (isTeacher || form.studentId.trim().length >= 6)

  // Ziyaretçi adım 1
  const visitorStep1Ok = emailValid && form.displayName.trim() !== '' &&
    form.username.trim().length >= 3 && !usernameErr &&
    form.hasUniversity !== null &&
    (form.hasUniversity === false || (form.visitorUniversity.trim() !== '' && form.visitorFakulte.trim() !== '' && form.visitorDepartment.trim() !== ''))

  const step1Ok   = mode === 'visitor' ? visitorStep1Ok : iguStep1Ok
  const canSubmit = step1Ok && form.username.trim().length >= 3 && !usernameErr &&
    form.password.length >= 8 && passwordsMatch

  const fakulteList  = form.userType ? getFakulteList(form.userType as UserType) : []
  const bolumList    = form.fakulte  ? getBolumList(form.userType as UserType, form.fakulte) : []
  const gradeOptions = form.userType ? getGradeOptions(form.userType as UserType, true) : []

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true); setError('')
    try {
      if (mode === 'visitor') {
        await registerUser({
          email:       form.email,
          password:    form.password,
          displayName: form.displayName,
          department:  form.hasUniversity ? form.visitorDepartment : '',
          username:    form.username.toLowerCase().trim(),
          extra: {
            userType:           'visitor',
            fakulte:            form.hasUniversity ? form.visitorFakulte : '',
            visitorUniversity:  form.hasUniversity ? form.visitorUniversity : '',
          },
        })
      } else {
        await registerUser({
          email:       form.email,
          password:    form.password,
          displayName: form.displayName,
          department:  form.department,
          grade:       form.grade || undefined,
          username:    form.username.toLowerCase().trim(),
          extra: { studentId: form.studentId, userType: form.userType, fakulte: form.fakulte },
        })
      }
      router.replace('/auth/verify-email')
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code ?? '') ?? err?.message ?? 'Bir hata oluştu.')
      setStep(1)
    } finally { setIsLoading(false) }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
            <span className="text-white font-display font-bold">O</span>
          </div>
          <span className="font-display font-bold text-text-primary text-lg">OpenUni</span>
        </div>

        {/* Başlık */}
        <div className="mb-5">
          <h2 className="font-display font-bold text-2xl text-text-primary">Hesap Oluştur</h2>
          <p className="text-text-muted text-sm mt-1">
            {mode === null    && 'Hesap türünü seç'}
            {mode === 'igu'   && 'IGÜ öğrenci / öğretim görevlisi hesabı'}
            {mode === 'visitor' && 'Ziyaretçi hesabı'}
          </p>
        </div>

        {/* Mod seçimi */}
        {mode === null && (
          <>
            <ModePicker onSelect={m => { setMode(m); setStep(1) }} />
            <p className="text-center text-xs text-text-muted mt-6">
              Zaten hesabın var mı?{' '}
              <Link href="/auth/login" className="text-brand hover:text-brand-hover font-medium">Giriş Yap</Link>
            </p>
          </>
        )}

        {/* IGÜ formu */}
        {mode === 'igu' && (
          <>
            {/* Adım göstergesi */}
            <div className="flex items-center gap-2 mb-6">
              <button type="button" onClick={() => { setMode(null); setStep(1) }}
                className="text-2xs text-text-muted hover:text-brand transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Geri
              </button>
              <div className="flex items-center gap-2 flex-1">
                {[1,2].map(s => (
                  <div key={s} className={cn('flex items-center gap-2', s < 2 && 'flex-1')}>
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      step >= s ? 'bg-brand text-white' : 'bg-surface border border-surface-border text-text-muted')}>{s}</div>
                    {s < 2 && <div className={cn('flex-1 h-0.5 transition-all', step > s ? 'bg-brand' : 'bg-surface-border')} />}
                  </div>
                ))}
              </div>
              <span className="text-xs text-text-muted">{step === 1 ? 'Bilgiler' : 'Şifre'}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Öğrenci E-postası *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="ad.soyad@ogr.gelisim.edu.tr"
                        className={cn('input pl-10',
                          form.email && !emailValid && 'border-accent-red/50',
                          form.email && emailValid  && 'border-accent-green/50')} required />
                    </div>
                    {form.email && !emailValid && <p className="text-2xs text-accent-red mt-1">@ogr.gelisim.edu.tr uzantılı e-posta gerekli</p>}
                  </div>
                  {/* Ad Soyad */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Ad Soyad *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="text" value={form.displayName} onChange={e => update('displayName', e.target.value)}
                        placeholder="Ad Soyad" className="input pl-10" required />
                    </div>
                  </div>
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Kullanıcı Adı * <span className="text-text-muted font-normal">(sonradan değiştirilebilir)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                      <input type="text" value={form.username}
                        onChange={e => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder="kullanici_adi"
                        className={cn('input pl-8',
                          form.username && usernameErr                              && 'border-accent-red/50',
                          form.username && !usernameErr && form.username.length >= 3 && 'border-accent-green/50')} required />
                    </div>
                    {form.username && usernameErr                               && <p className="text-2xs text-accent-red mt-1">{usernameErr}</p>}
                    {form.username && !usernameErr && form.username.length >= 3 && <p className="text-2xs text-accent-green mt-1">✓ Geçerli kullanıcı adı</p>}
                  </div>
                  {/* Öğrenci No */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Öğrenci No <span className="text-accent-red ml-0.5">*</span></label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="text" value={form.studentId}
                        onChange={e => update('studentId', e.target.value.replace(/\D/g, ''))}
                        placeholder="Ör: 2021123456" maxLength={12}
                        className={cn('input pl-10', form.studentId && form.studentId.length < 6 && 'border-accent-red/50')} />
                    </div>
                    {!isTeacher && form.studentId && form.studentId.length < 6 && (
                      <p className="mt-1 text-2xs text-accent-red">En az 6 haneli öğrenci numarası girin</p>
                    )}
                  </div>
                  {/* Statü */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2">Statü *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['lisans','onlisans','ogretmen','diger'] as UserType[]).map(type => (
                        <button key={type} type="button" onClick={() => update('userType', type)}
                          className={cn('px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left',
                            form.userType === type
                              ? 'bg-brand/10 border-brand text-brand'
                              : 'border-surface-border text-text-muted hover:border-surface-active hover:text-text-secondary')}>
                          {USER_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Fakülte / Bölüm / Sınıf */}
                  {form.userType && !isTeacher && fakulteList.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">{form.userType === 'lisans' ? 'Fakülte' : 'MYO / Program'} *</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <select value={form.fakulte} onChange={e => update('fakulte', e.target.value)}
                          className="input pl-10 appearance-none bg-surface" required>
                          <option value="">Seçin</option>
                          {fakulteList.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  {form.fakulte && bolumList.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Bölüm / Program *</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <select value={form.department} onChange={e => update('department', e.target.value)}
                          className="input pl-10 appearance-none bg-surface" required>
                          <option value="">Seçin</option>
                          {bolumList.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  {form.department && gradeOptions.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Sınıf</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {gradeOptions.map(opt => (
                          <button key={opt.value} type="button" onClick={() => update('grade', opt.value)}
                            className={cn('py-2 rounded-lg border text-xs font-medium transition-all',
                              form.grade === opt.value
                                ? 'bg-brand/10 border-brand text-brand'
                                : 'border-surface-border text-text-muted hover:border-surface-active')}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="button" disabled={!step1Ok} onClick={() => setStep(2)}
                    className={cn('btn-primary w-full justify-center py-2.5 text-sm', !step1Ok && 'opacity-60 cursor-not-allowed')}>
                    Devam Et <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 2 && <PasswordStep form={form} showPassword={showPassword}
                setShowPassword={setShowPassword} update={update} passwordsMatch={passwordsMatch}
                error={error} canSubmit={canSubmit} isLoading={isLoading} onBack={() => setStep(1)}
                mode="igu" />}
            </form>
          </>
        )}

        {/* Ziyaretçi formu */}
        {mode === 'visitor' && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <button type="button" onClick={() => { setMode(null); setStep(1) }}
                className="text-2xs text-text-muted hover:text-accent-purple transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Geri
              </button>
              <div className="flex items-center gap-2 flex-1">
                {[1,2].map(s => (
                  <div key={s} className={cn('flex items-center gap-2', s < 2 && 'flex-1')}>
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      step >= s ? 'bg-accent-purple text-white' : 'bg-surface border border-surface-border text-text-muted')}>{s}</div>
                    {s < 2 && <div className={cn('flex-1 h-0.5 transition-all', step > s ? 'bg-accent-purple' : 'bg-surface-border')} />}
                  </div>
                ))}
              </div>
              <span className="text-xs text-text-muted">{step === 1 ? 'Bilgiler' : 'Şifre'}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">E-posta *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="ornek@email.com"
                        className={cn('input pl-10',
                          form.email && !emailValid && 'border-accent-red/50',
                          form.email && emailValid  && 'border-accent-green/50')} required />
                    </div>
                  </div>
                  {/* Ad Soyad */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Ad Soyad *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="text" value={form.displayName} onChange={e => update('displayName', e.target.value)}
                        placeholder="Ad Soyad" className="input pl-10" required />
                    </div>
                  </div>
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Kullanıcı Adı * <span className="text-text-muted font-normal">(sonradan değiştirilebilir)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                      <input type="text" value={form.username}
                        onChange={e => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder="kullanici_adi"
                        className={cn('input pl-8',
                          form.username && usernameErr                              && 'border-accent-red/50',
                          form.username && !usernameErr && form.username.length >= 3 && 'border-accent-green/50')} required />
                    </div>
                    {form.username && usernameErr                               && <p className="text-2xs text-accent-red mt-1">{usernameErr}</p>}
                    {form.username && !usernameErr && form.username.length >= 3 && <p className="text-2xs text-accent-green mt-1">✓ Geçerli kullanıcı adı</p>}
                  </div>

                  {/* Başka üniversite var mı? */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2">
                      Başka bir üniversitede öğrenci misin? *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: true,  label: 'Evet' },
                        { val: false, label: 'Hayır' },
                      ].map(opt => (
                        <button key={String(opt.val)} type="button"
                          onClick={() => update('hasUniversity', opt.val)}
                          className={cn('py-2.5 rounded-lg border text-xs font-medium transition-all',
                            form.hasUniversity === opt.val
                              ? 'bg-accent-purple/10 border-accent-purple text-accent-purple'
                              : 'border-surface-border text-text-muted hover:border-surface-active')}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Üniversite bilgileri */}
                  {form.hasUniversity === true && (
                    <div className="space-y-3 border border-surface-border rounded-xl p-3 bg-surface/30">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Üniversite Adı *</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                          <input type="text" value={form.visitorUniversity}
                            onChange={e => update('visitorUniversity', e.target.value)}
                            placeholder="Ör: İstanbul Üniversitesi" className="input pl-10" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Fakülte *</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                          <input type="text" value={form.visitorFakulte}
                            onChange={e => update('visitorFakulte', e.target.value)}
                            placeholder="Ör: Mühendislik Fakültesi" className="input pl-10" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Bölüm *</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                          <input type="text" value={form.visitorDepartment}
                            onChange={e => update('visitorDepartment', e.target.value)}
                            placeholder="Ör: Bilgisayar Mühendisliği" className="input pl-10" />
                        </div>
                      </div>
                    </div>
                  )}

                  {form.hasUniversity === false && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-surface-border">
                      <Globe className="w-4 h-4 text-text-muted shrink-0" />
                      <p className="text-xs text-text-muted">Üniversite bilgisi olmadan ziyaretçi olarak katılacaksın.</p>
                    </div>
                  )}

                  <button type="button" disabled={!step1Ok} onClick={() => setStep(2)}
                    className={cn('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                      step1Ok
                        ? 'bg-accent-purple text-white hover:opacity-90'
                        : 'bg-surface border border-surface-border text-text-muted opacity-60 cursor-not-allowed')}>
                    Devam Et <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 2 && <PasswordStep form={form} showPassword={showPassword}
                setShowPassword={setShowPassword} update={update} passwordsMatch={passwordsMatch}
                error={error} canSubmit={canSubmit} isLoading={isLoading} onBack={() => setStep(1)}
                mode="visitor" />}
            </form>
          </>
        )}

        {mode !== null && (
          <p className="text-center text-xs text-text-muted mt-6">
            Zaten hesabın var mı?{' '}
            <Link href="/auth/login" className="text-brand hover:text-brand-hover font-medium">Giriş Yap</Link>
          </p>
        )}

        <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-surface-border">
          <Link href="/about"   className="text-2xs text-text-muted hover:text-text-secondary transition-colors">Hakkımızda</Link>
          <Link href="/guide"   className="text-2xs text-text-muted hover:text-text-secondary transition-colors">Kılavuz</Link>
          <Link href="/privacy" className="text-2xs text-text-muted hover:text-text-secondary transition-colors">Gizlilik</Link>
          <Link href="/contact" className="text-2xs text-text-muted hover:text-text-secondary transition-colors">İletişim</Link>
        </div>
      </div>
    </div>
  )
}

// ─── Şifre adımı (ortak) ─────────────────────────────────────────────────────
function PasswordStep({ form, showPassword, setShowPassword, update, passwordsMatch, error, canSubmit, isLoading, onBack, mode }: any) {
  const accentClass = mode === 'visitor' ? 'bg-accent-purple text-white hover:opacity-90' : 'btn-primary'
  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface border border-surface-border">
        {mode === 'visitor'
          ? <Globe className="w-4 h-4 text-accent-purple shrink-0" />
          : <GraduationCap className="w-4 h-4 text-brand shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{form.displayName}</p>
          <p className="text-2xs text-text-muted truncate">{form.email}</p>
        </div>
        <button type="button" onClick={onBack} className="text-2xs text-brand hover:text-brand-hover shrink-0">Düzenle</button>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Şifre *</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type={showPassword ? 'text' : 'password'} value={form.password}
            onChange={(e: any) => update('password', e.target.value)}
            placeholder="Min. 8 karakter" className="input pl-10 pr-10" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrength password={form.password} />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Şifre Tekrar *</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="password" value={form.passwordConfirm}
            onChange={(e: any) => update('passwordConfirm', e.target.value)}
            placeholder="••••••••"
            className={cn('input pl-10',
              form.passwordConfirm && !passwordsMatch && 'border-accent-red/50',
              passwordsMatch && 'border-accent-green/50')} />
        </div>
        {form.passwordConfirm && !passwordsMatch && (
          <p className="text-2xs text-accent-red mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />Şifreler eşleşmiyor
          </p>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="btn-secondary flex-1 justify-center py-2.5 text-sm">
          <ChevronLeft className="w-4 h-4" /> Geri
        </button>
        <button type="submit" disabled={isLoading || !canSubmit}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            accentClass, (!canSubmit || isLoading) && 'opacity-60 cursor-not-allowed')}>
          {isLoading
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <>Hesap Oluştur <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
      <p className="text-center text-2xs text-text-muted">
        Kayıt olarak <Link href="/privacy" className="text-brand hover:text-brand-hover">Gizlilik Politikasını</Link> kabul etmiş olursun.
      </p>
    </>
  )
}
