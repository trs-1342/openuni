'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useSpaces } from '@/hooks/useSpaces'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { createSpace } from '@/lib/firestore'
import { CHANNEL_META, cn } from '@/lib/utils'
import { Search, Users, Menu, Plus, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const ADMIN_EMAIL = 'khalil.khattab@ogr.gelisim.edu.tr'

const EMOJI_PICKS = ['💻','⚡','🏛️','🧬','⚖️','📡','🎨','🏗️','📊','🚀','🔬','🎓','🏥','✈️','🎭','🌐','🔧','📐']

// ─── Topluluk Oluştur Modal ───────────────────────────────────────────────────
function CreateSpaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuthStore()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [emoji,       setEmoji]       = useState('💻')
  const [isPublic,    setIsPublic]    = useState(true)
  const [department,  setDepartment]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  async function handleCreate() {
    if (!name.trim())        { setError('Topluluk adı boş olamaz.'); return }
    if (!description.trim()) { setError('Açıklama boş olamaz.'); return }
    if (!user)               { setError('Oturum bulunamadı.'); return }
    setSaving(true); setError('')
    try {
      await createSpace({
        name:        name.trim(),
        description: description.trim(),
        iconEmoji:   emoji,
        isPublic,
        department:  department.trim(),
        createdBy:   user.uid,
      })
      setDone(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch (e: any) {
      setError(e?.message ?? 'Topluluk oluşturulamadı.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#131929] border border-surface-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="font-display font-semibold text-text-primary">Topluluk Oluştur</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle className="w-10 h-10 text-accent-green" />
            <p className="font-medium text-text-primary">Topluluk oluşturuldu!</p>
            <p className="text-xs text-text-muted">6 kanal otomatik eklendi</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">

            {/* Emoji + İsim */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Topluluk Adı</label>
              <div className="flex gap-2">
                {/* Emoji seçici */}
                <div className="relative group">
                  <button type="button"
                    className="w-10 h-10 rounded-lg bg-surface border border-surface-border text-lg flex items-center justify-center hover:border-brand/40 transition-all shrink-0">
                    {emoji}
                  </button>
                  {/* Emoji dropdown */}
                  <div className="absolute left-0 top-full mt-1 z-10 bg-[#131929] border border-surface-border rounded-xl p-2 hidden group-focus-within:grid grid-cols-6 gap-1 shadow-xl w-48">
                    {EMOJI_PICKS.map(e => (
                      <button key={e} type="button" onClick={() => setEmoji(e)}
                        className={cn('w-7 h-7 rounded text-base hover:bg-surface transition-all flex items-center justify-center',
                          emoji === e && 'bg-brand/20')}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
                  placeholder="Örn: Bilgisayar Mühendisliği" className="input flex-1" maxLength={50} />
              </div>
              {/* Emoji grid — her zaman görünür */}
              <div className="grid grid-cols-9 gap-1 mt-2">
                {EMOJI_PICKS.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)}
                    className={cn('w-8 h-8 rounded-lg text-base hover:bg-surface transition-all flex items-center justify-center border',
                      emoji === e ? 'bg-brand/10 border-brand' : 'border-transparent hover:border-surface-border')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Açıklama</label>
              <textarea value={description} onChange={e => { setDescription(e.target.value); setError('') }}
                placeholder="Bu topluluk ne için? Kimler katılabilir?" rows={2}
                className="input resize-none text-sm" maxLength={200} />
              <p className="text-right text-2xs text-text-muted mt-1">{description.length}/200</p>
            </div>

            {/* Bölüm (isteğe bağlı) */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                İlgili Bölüm <span className="text-text-muted font-normal">(isteğe bağlı)</span>
              </label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                placeholder="Örn: Bilgisayar Mühendisliği" className="input text-sm" maxLength={80} />
            </div>

            {/* Gizlilik */}
            <div className="flex gap-2">
              {[
                { v: true,  label: '🌐 Herkese Açık', desc: 'Tüm öğrenciler görebilir' },
                { v: false, label: '🔒 Özel',         desc: 'Yalnızca davetliler' },
              ].map(opt => (
                <button key={String(opt.v)} type="button" onClick={() => setIsPublic(opt.v)}
                  className={cn('flex-1 py-2.5 px-3 rounded-lg border text-left transition-all',
                    isPublic === opt.v ? 'bg-brand/10 border-brand' : 'border-surface-border hover:border-surface-active')}>
                  <p className={cn('text-xs font-medium', isPublic === opt.v ? 'text-brand' : 'text-text-secondary')}>{opt.label}</p>
                  <p className="text-2xs text-text-muted mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Otomatik kanallar bilgisi */}
            <div className="bg-surface rounded-lg p-3 border border-surface-border">
              <p className="text-2xs font-medium text-text-secondary mb-1.5">Otomatik oluşturulacak kanallar:</p>
              <div className="flex flex-wrap gap-1.5">
                {['📣 Duyurular','📚 Akademik Destek','🗂️ Kaynak Arşivi','🎉 Sosyal Alan','💡 Öneri Kutusu','📌 İlan Panosu'].map(ch => (
                  <span key={ch} className="text-2xs bg-background border border-surface-border rounded px-2 py-0.5 text-text-muted">{ch}</span>
                ))}
              </div>
            </div>

            {/* Hata */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </div>
            )}

            {/* Butonlar */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">İptal</button>
              <button onClick={handleCreate} disabled={saving}
                className={cn('flex-1 py-2.5 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand/90 transition-all flex items-center justify-center gap-2',
                  saving && 'opacity-70 cursor-not-allowed')}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Spaces Page ──────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded ${className}`} />
}

export default function SpacesPage() {
  const { spaces, isLoading, refresh } = useSpaces()
  const { user: firebaseUser }         = useAuthStore()
  const { profile }                    = useUserProfile()
  const [query,       setQuery]       = useState('')
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [showCreate,  setShowCreate]  = useState(false)

  const isAdmin = firebaseUser?.email === ADMIN_EMAIL || profile?.role === 'admin'
  const isMod   = profile?.role === 'moderator'
  const canCreate = isAdmin || isMod

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.description?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[280px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      {showCreate && (
        <CreateSpaceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => refresh?.()}
        />
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1">Topluluklar</span>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand/90 transition-all">
              <Plus className="w-3.5 h-3.5" />Oluştur
            </button>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden lg:sticky lg:flex lg:top-0 lg:z-10 glass border-b border-surface-border px-6 py-4 items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-text-primary">Topluluklar</h1>
            <p className="text-xs text-text-muted mt-0.5">Bölümüne veya ilgi alanına göre topluluğa katıl</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 transition-all">
              <Plus className="w-4 h-4" />Topluluk Oluştur
            </button>
          )}
        </div>

        <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Topluluk veya bölüm ara..." className="input pl-10" />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-4xl mb-3">🏛️</span>
              <p className="font-medium text-text-secondary">
                {query ? `"${query}" için sonuç bulunamadı` : 'Henüz topluluk yok'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {canCreate ? 'İlk topluluğu oluşturmak için "Topluluk Oluştur" butonuna tıkla.' : 'Yakında topluluklar eklenecek.'}
              </p>
              {canCreate && (
                <button onClick={() => setShowCreate(true)}
                  className="mt-4 flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 transition-all">
                  <Plus className="w-4 h-4" />İlk Topluluğu Oluştur
                </button>
              )}
            </div>
          ) : (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                {query ? `"${query}" için sonuçlar (${filtered.length})` : `Topluluklar (${spaces.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(space => (
                  <Link key={space.id} href={`/dashboard/spaces/${space.slug}`}>
                    <div className="card hover:bg-surface-hover hover:border-surface-active transition-all duration-200 cursor-pointer h-full">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-2xl border border-surface-border shrink-0">
                          {space.iconEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary truncate">{space.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-text-muted" />
                            <span className="text-2xs text-text-muted">{space.memberCount} üye</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2">
                        {space.description}
                      </p>
                      <div className="space-y-1">
                        {space.channels.slice(0, 4).map(channel => {
                          const meta = CHANNEL_META[channel.type]
                          return (
                            <div key={channel.id} className="flex items-center gap-2 text-xs text-text-muted">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.bgClass.replace('/10',''))} />
                              <span className="truncate">{meta.icon} {channel.name}</span>
                              <span className="ml-auto tabular-nums text-2xs">{channel.postCount}</span>
                            </div>
                          )
                        })}
                        {space.channels.length > 4 && (
                          <div className="text-2xs text-text-muted pl-3.5">+{space.channels.length - 4} kanal daha</div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
