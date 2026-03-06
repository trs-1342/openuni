// src/app/dashboard/spaces/[spaceSlug]/page.tsx
'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { getSpaceBySlug, updateChannel, deleteChannel, getChannelPostCount, addChannel } from '@/lib/firestore'
import { CHANNEL_META, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Menu, Users, ChevronRight, ArrowLeft, Pencil, Trash2, X, Check, Loader2, Plus } from 'lucide-react'
import type { Space } from '@/types'

const CHANNEL_TYPE_OPTIONS = [
  { value: 'announcement', label: '📣 Duyurular' },
  { value: 'academic',     label: '📚 Akademik Destek' },
  { value: 'archive',      label: '🗂️ Kaynak Arşivi' },
  { value: 'social',       label: '🎉 Sosyal Alan' },
  { value: 'suggestion',   label: '💡 Öneri Kutusu' },
  { value: 'listing',      label: '📌 İlan Panosu' },
]

const COLOR_CLASSES: Record<string, { dot: string; bg: string; border: string }> = {
  amber:  { dot: 'bg-accent-amber',  bg: 'bg-accent-amber/10',  border: 'border-accent-amber/30' },
  green:  { dot: 'bg-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30' },
  purple: { dot: 'bg-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/30' },
  blue:   { dot: 'bg-brand',         bg: 'bg-brand/10',         border: 'border-brand/30' },
  teal:   { dot: 'bg-teal-400',      bg: 'bg-teal-400/10',      border: 'border-teal-400/30' },
  red:    { dot: 'bg-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/30' },
}

const ICON_OPTIONS = ['📣','📚','🗂️','🎉','💡','📌','💬','🔬','🎨','🏆','🛠️','📰','🎓','🌐','⚙️','🤝']

function Skeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-surface animate-pulse rounded-lg ${className ?? ''}`} />
}

function ChannelForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: any
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name,        setName]        = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [type,        setType]        = useState(initial?.type ?? 'social')
  const [icon,        setIcon]        = useState(initial?.icon ?? '💬')
  const [color,       setColor]       = useState(initial?.color ?? 'blue')
  const [warningText, setWarningText] = useState(initial?.warningText ?? '')

  return (
    <div className="space-y-3 p-4 rounded-xl border border-brand/30 bg-brand/5">
      {/* Ad */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Kanal Adı *</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="input text-sm py-1.5" placeholder="kanal-adi" autoFocus />
      </div>
      {/* Tip */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Kanal Tipi</label>
        <select value={type} onChange={e => setType(e.target.value)} className="input text-sm py-1.5 bg-surface">
          {CHANNEL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {/* Icon */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">İkon</label>
        <div className="flex flex-wrap gap-1.5">
          {ICON_OPTIONS.map(em => (
            <button key={em} type="button" onClick={() => setIcon(em)}
              className={cn("w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-all",
                icon === em ? "border-brand bg-brand/10" : "border-surface-border hover:border-brand/40 bg-surface")}>
              {em}
            </button>
          ))}
        </div>
      </div>
      {/* Renk */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Renk</label>
        <div className="flex gap-2">
          {Object.entries(COLOR_CLASSES).map(([key, cls]) => (
            <button key={key} type="button" onClick={() => setColor(key)}
              className={cn("w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center",
                color === key ? "border-text-primary scale-110" : "border-transparent hover:scale-105")}>
              <span className={cn("w-5 h-5 rounded-full", cls.dot)} />
            </button>
          ))}
        </div>
      </div>
      {/* Açıklama */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Açıklama</label>
        <input value={description} onChange={e => setDescription(e.target.value)}
          className="input text-sm py-1.5" placeholder="Kanalın amacı..." />
      </div>
      {/* Uyarı metni */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Uyarı / Kural Metni <span className="text-text-muted font-normal">(kanalda gösterilir)</span>
        </label>
        <textarea value={warningText} onChange={e => setWarningText(e.target.value)}
          className="input text-sm py-1.5 resize-none" rows={2}
          placeholder="Örn: Sadece akademik içerik paylaşılabilir..." />
      </div>
      {/* Butonlar */}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> İptal
        </button>
        <button type="button" onClick={() => onSave({ name, description, type, icon, color, warningText })}
          disabled={saving || !name.trim()}
          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Kaydet
        </button>
      </div>
    </div>
  )
}

export default function SpacePage() {
  const params = useParams<{ spaceSlug: string }>()
  const [space,       setSpace]       = useState<Space | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [postCounts,  setPostCounts]  = useState<Record<string, number>>({})
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { user: firebaseUser } = useAuthStore()
  const { profile } = useUserProfile()
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''
  const isAdmin   = firebaseUser?.email === ADMIN_EMAIL || profile?.role === 'admin'
  const isMod     = profile?.role === 'moderator'
  const canManage = isAdmin || isMod

  const loadSpace = useCallback(async () => {
    const s = await getSpaceBySlug(params.spaceSlug)
    setSpace(s)
    setLoading(false)
    if (s) {
      const counts: Record<string, number> = {}
      await Promise.all(s.channels.map(async ch => {
        counts[ch.id] = await getChannelPostCount(ch.id)
      }))
      setPostCounts(counts)
    }
  }, [params.spaceSlug])

  useEffect(() => { loadSpace() }, [loadSpace])

  async function handleSaveEdit(channelId: string, data: any) {
    if (!space) return
    setSaving(true)
    await updateChannel(space.id, channelId, data)
    await loadSpace()
    setEditingId(null)
    setSaving(false)
  }

  async function handleAddChannel(data: any) {
    if (!space) return
    setSaving(true)
    await addChannel(space.id, data)
    await loadSpace()
    setShowAddForm(false)
    setSaving(false)
  }

  async function handleDelete(channelId: string) {
    if (!space) return
    if (!confirm('Bu kanalı silmek istediğine emin misin? İçindeki postlar etkilenebilir.')) return
    setDeletingId(channelId)
    await deleteChannel(space.id, channelId)
    await loadSpace()
    setDeletingId(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1 truncate">
            {loading ? '...' : space?.name ?? 'Topluluk'}
          </span>
        </div>

        <div className="hidden lg:block sticky top-0 z-10 glass border-b border-surface-border px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Link href="/dashboard/spaces" className="hover:text-text-secondary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />Topluluklar
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary">{space?.name ?? '...'}</span>
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            </div>
          ) : !space ? (
            <div className="text-center py-20">
              <span className="text-4xl mb-3 block">🏛️</span>
              <p className="font-medium text-text-secondary">Topluluk bulunamadı</p>
              <Link href="/dashboard/spaces" className="mt-4 inline-block text-xs text-brand hover:underline">Topluluklara dön</Link>
            </div>
          ) : (
            <>
              {/* Space bilgisi */}
              <div className="card mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-3xl border border-surface-border shrink-0">
                    {space.iconEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display font-bold text-text-primary text-xl">{space.name}</h1>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{space.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Users className="w-3.5 h-3.5" />{space.memberCount} üye
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-text-muted">
                        📌 {space.channels.length} kanal
                      </span>
                      {space.isPublic
                        ? <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-full px-2 py-0.5">🌐 Herkese Açık</span>
                        : <span className="text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-full px-2 py-0.5">🔒 Özel</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Kanallar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    📌 Kanallar
                  </h2>
                  {canManage && !showAddForm && (
                    <button onClick={() => setShowAddForm(true)}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Kanal Ekle
                    </button>
                  )}
                </div>

                {/* Kanal Ekle formu */}
                {showAddForm && (
                  <ChannelForm
                    onSave={handleAddChannel}
                    onCancel={() => setShowAddForm(false)}
                    saving={saving}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {space.channels.map(channel => {
                    const meta     = CHANNEL_META[channel.type as keyof typeof CHANNEL_META] ?? Object.values(CHANNEL_META)[0]
                    const count    = postCounts[channel.id] ?? 0
                    const isEditing = editingId === channel.id
                    const isDeleting = deletingId === channel.id
                    const colorCls = COLOR_CLASSES[(channel as any).color ?? 'blue'] ?? COLOR_CLASSES.blue
                    const channelIcon = (channel as any).icon ?? meta.icon

                    return (
                      <div key={channel.id} className={cn('card transition-all duration-200', isEditing && 'border-brand/40 col-span-1 sm:col-span-2')}>
                        {isEditing ? (
                          <ChannelForm
                            initial={{
                              name: channel.name,
                              description: (channel as any).description ?? '',
                              type: channel.type,
                              icon: channelIcon,
                              color: (channel as any).color ?? 'blue',
                              warningText: (channel as any).warningText ?? '',
                            }}
                            onSave={(data) => handleSaveEdit(channel.id, data)}
                            onCancel={() => setEditingId(null)}
                            saving={saving}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <Link href={`/dashboard/spaces/${space.slug}/${channel.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg border shrink-0', colorCls.bg, colorCls.border)}>
                                {channelIcon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn('w-2 h-2 rounded-full shrink-0', colorCls.dot)} />
                                  <p className="font-medium text-text-primary text-sm truncate">{channel.name}</p>
                                  <span className="text-2xs text-text-muted tabular-nums shrink-0 ml-auto">{count} gönderi</span>
                                </div>
                                <p className="text-xs text-text-muted mt-0.5 truncate pl-4">
                                  {(channel as any).description || meta.description}
                                </p>
                              </div>
                            </Link>
                            {canManage && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => setEditingId(channel.id)}
                                  className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors"
                                  title="Düzenle">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(channel.id)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                                  title="Sil">
                                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
