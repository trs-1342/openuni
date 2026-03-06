'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, CHANNEL_META } from '@/lib/utils'
import { DropZone } from '@/components/ui/DropZone'
import { TagInput } from '@/components/ui/TagInput'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { createPost } from '@/lib/firestore'
import type { Channel, ChannelType, Attachment, Poll } from '@/types'
import { getListedUsers } from '@/lib/firestore'
import type { User } from '@/types'
import {
  AlertCircle, ArrowLeft, CheckCircle, ChevronDown,
  Eye, Loader2, Lock, Send, Info,
  BarChart2, Plus, Trash2, X as XIcon,
} from 'lucide-react'

// ─── Channel tiplerine göre form alanları ─────────────────────────────────────
interface ChannelFormConfig {
  titleLabel: string
  titlePlaceholder: string
  contentLabel: string
  contentPlaceholder: string
  showFiles: boolean
  showTags: boolean
  requiresFiles: boolean
  contentRequired: boolean
  titleRequired: boolean
  hint?: string
}

const FORM_CONFIG: Record<ChannelType, ChannelFormConfig> = {
  announcement: {
    titleLabel: 'Duyuru Başlığı',
    titlePlaceholder: 'Örn: Veri Yapıları Final Sınavı — Yer Değişikliği',
    contentLabel: 'Duyuru İçeriği',
    contentPlaceholder: 'Duyuruyu detaylıca açıkla. Tarih, saat, yer gibi bilgileri mutlaka belirt.',
    showFiles: false,
    showTags: false,
    requiresFiles: false,
    contentRequired: true,
    titleRequired: true,
    hint: 'Bu kanal yalnızca moderatörlere açıktır. Duyurular öğrencilere bildirim olarak iletilir.',
  },
  academic: {
    titleLabel: 'Soru veya Başlık',
    titlePlaceholder: 'Örn: Dinamik Programlama — Memoization nasıl çalışır?',
    contentLabel: 'Detaylandır',
    contentPlaceholder: 'Sorununu veya tartışma konusunu açıkla. Ne denediğini, nerede takıldığını belirt. Ne kadar detaylı olursan o kadar iyi yanıt alırsın.',
    showFiles: true,
    showTags: true,
    requiresFiles: false,
    contentRequired: true,
    titleRequired: true,
  },
  archive: {
    titleLabel: 'Kaynak Adı',
    titlePlaceholder: 'Örn: Veri Tabanı Sistemleri — 2021-2024 Geçmiş Yıl Soruları',
    contentLabel: 'Açıklama (isteğe bağlı)',
    contentPlaceholder: 'Dosya hakkında kısa bir açıklama yaz. Hangi derse ait, hangi konuları kapsıyor?',
    showFiles: true,
    showTags: true,
    requiresFiles: true,
    contentRequired: false,
    titleRequired: true,
    hint: 'Arşiv kanalına yalnızca dosya ve kaynak paylaşılabilir. Sohbet yasaktır.',
  },
  listing: {
    titleLabel: 'İlan Başlığı',
    titlePlaceholder: 'Örn: Matematik Özel Ders Veriyorum — Haftada 2 Saat',
    contentLabel: 'İlan Detayları',
    contentPlaceholder: 'Ücretli/ücretsiz, müsaitlik saatlerin, iletişim yöntemi ve diğer detayları belirt.',
    showFiles: false,
    showTags: true,
    requiresFiles: false,
    contentRequired: true,
    titleRequired: true,
  },
  suggestion: {
    titleLabel: 'Öneri Başlığı',
    titlePlaceholder: 'Örn: Sınav takvimi için Google Calendar entegrasyonu eklenebilir',
    contentLabel: 'Öneriyi Detaylandır',
    contentPlaceholder: 'Önerinizi açıklayın. Neden gerekli? Nasıl uygulanabilir? Ne gibi faydaları olur?',
    showFiles: false,
    showTags: false,
    requiresFiles: false,
    contentRequired: true,
    titleRequired: true,
  },
  social: {
    titleLabel: 'Başlık',
    titlePlaceholder: 'Örn: Çarşamba akşamı kütüphanede çalışma grubu kuruyor musunuz?',
    contentLabel: 'Detaylar',
    contentPlaceholder: 'Etkinlik, buluşma veya duyuru detaylarını yaz. Herkes görebilir.',
    showFiles: true,
    showTags: true,
    requiresFiles: false,
    contentRequired: false,
    titleRequired: true,
  },
}

// ─── Form State ───────────────────────────────────────────────────────────────
interface FormValues {
  title: string
  content: string
  tags: string[]
}

interface FieldError {
  title?: string
  content?: string
  files?: string
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function PostPreview({ values, channel }: { values: FormValues; channel: Channel }) {
  const meta = CHANNEL_META[channel.type]
  return (
    <div className="card space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className={cn('channel-tag text-xs', meta.bgClass, meta.textClass)}>
          {meta.icon} {meta.label}
        </span>
        <span className="text-2xs text-text-muted">önizleme</span>
      </div>
      <h3 className="font-semibold text-text-primary leading-snug">
        {values.title || <span className="text-text-muted italic">Başlık yok</span>}
      </h3>
      {values.content && (
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {values.content}
        </p>
      )}
      {values.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.tags.map(tag => (
            <span key={tag} className="text-2xs px-2 py-0.5 rounded-sm bg-surface text-text-muted border border-surface-border">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
interface PostFormProps {
  channel: Channel
  spaceSlug: string
  spaceId: string
  onCancel?: () => void
}

export function PostForm({ channel, spaceSlug, spaceId, onCancel }: PostFormProps) {
  const router  = useRouter()
  const config  = FORM_CONFIG[channel.type]
  const meta    = CHANNEL_META[channel.type]
  const upload  = useFileUpload(`posts/${spaceId || 'misc'}/${channel.id || 'misc'}`)
  const { user: firebaseUser } = useAuthStore()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const isBanned = (profile as any)?.isBanned && (!(profile as any)?.banUntil || new Date((profile as any).banUntil) > new Date())
  const isMuted  = (profile as any)?.isMuted  && (!(profile as any)?.muteUntil  || new Date((profile as any).muteUntil)  > new Date())

  const [values, setValues]       = useState<FormValues>({ title: '', content: '', tags: [] })
  const [errors, setErrors]       = useState<FieldError>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview]   = useState(false)
  const [submitted, setSubmitted]       = useState(false)

  // Poll state
  const [hasPoll, setHasPoll]           = useState(false)
  const [pollOptions, setPollOptions]   = useState(['', ''])
  const [pollMultiple, setPollMultiple] = useState(false)
  const [pollEndsAt, setPollEndsAt]     = useState('')
  const [pollShowAfter, setPollShowAfter] = useState(false)

  // Mention sistemi
  const [allUsers, setAllUsers]           = useState<User[]>([])
  const [mentionQuery, setMentionQuery]   = useState('')
  const [mentionOpen, setMentionOpen]     = useState(false)
  const [mentionPos, setMentionPos]       = useState(0) // @ karakterinin textarea'daki pozisyonu
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getListedUsers(200).then(users => setAllUsers(users)).catch(() => {})
  }, [])

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: FieldError = {}
    if (config.titleRequired && !values.title.trim())
      e.title = 'Başlık zorunludur'
    if (values.title.trim().length > 150)
      e.title = 'Başlık 150 karakteri geçemez'
    if (config.contentRequired && !values.content.trim())
      e.content = 'İçerik zorunludur'
    if (config.requiresFiles && upload.validFiles.length === 0)
      e.files = 'Bu kanal için en az bir dosya yüklemelisiniz'
    if (upload.isUploading)
      e.files = 'Dosyalar yüklenmeyi bekliyor...'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (!firebaseUser) return
    if (isBanned) { setErrors({ title: 'Hesabınız askıya alındı. Paylaşım yapamazsınız.' }); return }
    if (isMuted)  { setErrors({ title: 'Hesabınız geçici olarak susturuldu.' }); return }

    if (profileLoading) return  // profile henüz yüklenmedi
    setIsSubmitting(true)
    try {
      // Yüklenen dosyaları Attachment formatına çevir
      const attachments: Attachment[] = upload.validFiles.map(f => ({
        id: f.id,
        postId: '',       // createPost sonrası güncellenemez, şimdilik boş
        name: f.name,
        url: f.url!,
        type: f.type as Attachment['type'],
        size: f.size,
        uploadedBy: firebaseUser.uid,
        uploadedAt: new Date(),
      }))

      const author = {
        uid:         firebaseUser.uid,
        displayName: profile?.displayName ?? firebaseUser.displayName ?? 'Kullanıcı',
        username:    (profile as any)?.username ?? null,
        avatarUrl:   (profile as any)?.avatarUrl ?? null,
        role:        (profile as any)?.role ?? 'student',
      }

      // Poll oluştur
      let poll: Poll | undefined
      if (hasPoll) {
        const validOptions = pollOptions.filter((o: string) => o.trim())
        if (validOptions.length < 2) throw new Error('En az 2 anket seçeneği gerekli.')
        poll = {
          question: values.title,
          options: validOptions.map((text: string, i: number) => ({ id: `opt-${i}-${Date.now()}`, text: text.trim(), votes: [] })),
          allowMultiple: pollMultiple,
          endsAt: pollEndsAt ? new Date(pollEndsAt) : null,
          showResultsAfterEnd: pollShowAfter,
          isEnded: false,
        }
      }

      const resolvedSpaceId = spaceId || channel.spaceId || ''
      if (!resolvedSpaceId) {
        throw new Error('Space ID bulunamadı. Sayfayı yenileyip tekrar deneyin.')
      }

      await createPost({
        channelId: channel.id,
        spaceId: resolvedSpaceId,
        author,
        title: values.title.trim(),
        content: values.content.trim(),
        tags: values.tags,
        attachments,
        isAnnouncement: channel.type === 'announcement',
        ...(poll ? { poll } : {}),
      }, profile ?? undefined)

      setSubmitted(true)
      setTimeout(() => {
        router.push(`/dashboard/spaces/${spaceSlug}/${channel.slug}`)
      }, 1500)
    } catch (err: any) {
      setErrors(prev => ({ ...prev, title: 'Gönderi kaydedilemedi: ' + (err?.message ?? 'Bilinmeyen hata') }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const titleLen   = values.title.length
  const titleLimit = 150

  // ─── Success State ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-accent-green" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-text-primary">Paylaşım yapıldı!</p>
          <p className="text-sm text-text-muted mt-1">Kanala yönlendiriliyorsun...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">

        {/* Channel hint */}
        {config.hint && (
          <div className={cn(
            'flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs',
            meta.bgClass, meta.borderClass, meta.textClass,
          )}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{config.hint}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-secondary">
              {config.titleLabel}
              {config.titleRequired && <span className="text-accent-red ml-0.5">*</span>}
            </label>
            <span className={cn('text-2xs tabular-nums', titleLen > titleLimit * 0.85 ? 'text-accent-amber' : 'text-text-muted')}>
              {titleLen}/{titleLimit}
            </span>
          </div>
          <input
            type="text"
            value={values.title}
            onChange={e => set('title', e.target.value)}
            placeholder={config.titlePlaceholder}
            maxLength={titleLimit}
            className={cn('input', errors.title && 'border-accent-red/60 focus:border-accent-red focus:ring-accent-red/20')}
          />
          {errors.title && (
            <p className="mt-1 text-2xs text-accent-red flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.title}
            </p>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {config.contentLabel}
            {config.contentRequired && <span className="text-accent-red ml-0.5">*</span>}
          </label>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={values.content}
              onChange={e => {
                const val = e.target.value
                set('content', val)
                // Mention algılama: son @ karakterinden itibaren
                const cursor = e.target.selectionStart
                const textBefore = val.slice(0, cursor)
                const match = textBefore.match(/@(\w*)$/)
                if (match) {
                  const q = match[1].toLowerCase()
                  setMentionQuery(q)
                  setMentionPos(cursor - match[0].length)
                  const filtered = allUsers
                    .filter(u => (u as any).username?.toLowerCase().startsWith(q) || u.displayName?.toLowerCase().includes(q))
                    .slice(0, 6)
                  setMentionSuggestions(filtered)
                  setMentionOpen(filtered.length > 0)
                } else {
                  setMentionOpen(false)
                }
              }}
              onKeyDown={e => {
                if (mentionOpen && (e.key === 'Escape')) setMentionOpen(false)
              }}
              placeholder={config.contentPlaceholder}
              rows={6}
              className={cn(
                'input resize-none leading-relaxed',
                errors.content && 'border-accent-red/60 focus:border-accent-red focus:ring-accent-red/20',
              )}
            />
            {/* Mention önerileri */}
            {mentionOpen && mentionSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-surface-border rounded-xl shadow-xl overflow-hidden">
                {mentionSuggestions.map(u => (
                  <button
                    key={u.uid}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      const username = (u as any).username ?? u.uid
                      const before = values.content.slice(0, mentionPos)
                      const after = values.content.slice(textareaRef.current?.selectionStart ?? mentionPos + mentionQuery.length + 1)
                      const newContent = before + '@' + username + ' ' + after
                      set('content', newContent)
                      setMentionOpen(false)
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                      {u.displayName?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary">{u.displayName}</p>
                      <p className="text-2xs text-text-muted">@{(u as any).username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.content && (
            <p className="mt-1 text-2xs text-accent-red flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.content}
            </p>
          )}
        </div>

        {/* File Upload */}
        {config.showFiles && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Dosya Ekle
              {config.requiresFiles && <span className="text-accent-red ml-0.5">*</span>}
              <span className="ml-1.5 text-text-muted font-normal">(PDF, Word, resim)</span>
            </label>
            <DropZone
              files={upload.files}
              onAdd={upload.addFiles}
              onRemove={upload.removeFile}
              canAddMore={upload.canAddMore}
              maxFiles={upload.maxFiles}
              maxSizeMB={upload.maxSizeMB}
            />
            {errors.files && (
              <p className="mt-1 text-2xs text-accent-red flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.files}
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {config.showTags && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Etiketler
              <span className="ml-1.5 text-text-muted font-normal">(Enter veya virgül ile ekle)</span>
            </label>
            <TagInput
              value={values.tags}
              onChange={tags => set('tags', tags)}
              placeholder="Örn: algoritma, final, 3.sınıf"
            />
          </div>
        )}

        {/* Anket */}
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setHasPoll((p: boolean) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <BarChart2 className="w-4 h-4 text-brand" />
              Anket Ekle
            </span>
            <span className={`text-2xs px-2 py-0.5 rounded-full transition-colors ${hasPoll ? 'bg-brand/20 text-brand' : 'bg-surface text-text-muted'}`}>
              {hasPoll ? 'Açık' : 'Kapalı'}
            </span>
          </button>

          {hasPoll && (
            <div className="px-4 pb-4 space-y-3 border-t border-surface-border bg-surface/30">
              {/* Seçenekler */}
              <div className="space-y-2 pt-3">
                <label className="text-xs font-medium text-text-secondary">Seçenekler</label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-2xs flex items-center justify-center shrink-0 font-semibold">{i + 1}</span>
                    <input
                      value={opt}
                      onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n) }}
                      className="input text-sm py-1.5 flex-1"
                      placeholder={`Seçenek ${i + 1}`}
                      maxLength={120}
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => setPollOptions(p => p.filter((_, j) => j !== i))}
                        className="p-1.5 text-text-muted hover:text-accent-red transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 10 && (
                  <button type="button" onClick={() => setPollOptions(p => [...p, ''])}
                    className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover transition-colors mt-1">
                    <Plus className="w-3.5 h-3.5" /> Seçenek ekle
                  </button>
                )}
              </div>

              {/* Ayarlar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Çoklu seçim */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div onClick={() => setPollMultiple(p => !p)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${pollMultiple ? 'bg-brand' : 'bg-surface-border'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${pollMultiple ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs text-text-secondary">Çoklu seçim</span>
                </label>

                {/* Sonuçları sadece bitiş sonrası göster */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div onClick={() => setPollShowAfter(p => !p)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${pollShowAfter ? 'bg-brand' : 'bg-surface-border'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${pollShowAfter ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs text-text-secondary">Sonuçları bitiş sonrası göster</span>
                </label>
              </div>

              {/* Bitiş tarihi */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                  Bitiş Tarihi <span className="font-normal text-text-muted">(boş bırakılırsa süresiz)</span>
                </label>
                <input
                  type="datetime-local"
                  value={pollEndsAt}
                  onChange={e => setPollEndsAt(e.target.value)}
                  className="input text-sm py-1.5"
                  min={new Date().toISOString().slice(0, 16)}
                />
                {pollEndsAt && (
                  <button type="button" onClick={() => setPollEndsAt('')}
                    className="mt-1 text-2xs text-text-muted hover:text-accent-red flex items-center gap-1 transition-colors">
                    <XIcon className="w-3 h-3" /> Tarihi kaldır
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Önizleme
            </p>
            <PostPreview values={values} channel={channel} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> İptal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={cn('btn-ghost text-xs', showPreview && 'text-brand bg-brand/10')}
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? 'Gizle' : 'Önizle'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || upload.isUploading}
              className={cn(
                'btn-primary text-xs px-4 py-2',
                (isSubmitting || upload.isUploading) && 'opacity-70 cursor-not-allowed',
              )}
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gönderiliyor...</>
              ) : upload.isUploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Dosyalar yükleniyor...</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Paylaş</>
              )}
            </button>
          </div>
        </div>

      </div>
    </form>
  )
}
