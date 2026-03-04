'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, CHANNEL_META } from '@/lib/utils'
import { DropZone } from '@/components/ui/DropZone'
import { TagInput } from '@/components/ui/TagInput'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { createPost } from '@/lib/firestore'
import type { Channel, ChannelType, Attachment } from '@/types'
import {
  AlertCircle, ArrowLeft, CheckCircle, ChevronDown,
  Eye, Loader2, Lock, Send, Info,
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
  const { profile } = useUserProfile()

  const [values, setValues]       = useState<FormValues>({ title: '', content: '', tags: [] })
  const [errors, setErrors]       = useState<FieldError>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview]   = useState(false)
  const [submitted, setSubmitted]       = useState(false)

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
        uid: firebaseUser.uid,
        displayName: profile?.displayName ?? firebaseUser.displayName ?? 'Kullanıcı',
        ...(profile?.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        role: profile?.role ?? 'student',
      } as const

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
      })

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
          <textarea
            value={values.content}
            onChange={e => set('content', e.target.value)}
            placeholder={config.contentPlaceholder}
            rows={6}
            className={cn(
              'input resize-none leading-relaxed',
              errors.content && 'border-accent-red/60 focus:border-accent-red focus:ring-accent-red/20',
            )}
          />
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
