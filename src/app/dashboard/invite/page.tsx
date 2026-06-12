'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useSpaces } from '@/hooks/useSpaces'
import { isOwner, hasCapability } from '@/lib/permissions'
import { createInvite, getMyInvites, deleteInvite, type Invite } from '@/lib/firestore'
import { cn, timeAgo } from '@/lib/utils'
import { Menu, Ticket, Copy, Check, Trash2, Plus, Loader2 } from 'lucide-react'

export default function InvitePage() {
  const router = useRouter()
  const { user: firebaseUser } = useAuthStore()
  const { profile, isLoading: profileLoading } = useUserProfile()
  const { spaces } = useSpaces()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [spaceId, setSpaceId] = useState('')
  const [maxUses, setMaxUses] = useState('0')
  const [expiresInDays, setExpiresInDays] = useState('0')
  const [copied, setCopied] = useState<string | null>(null)

  const canInvite = isOwner(profile, firebaseUser?.email) || hasCapability(profile, 'invite', firebaseUser?.email)

  // Yetkisi yoksa dashboard'a yönlendir
  useEffect(() => {
    if (!profileLoading && profile && !canInvite) router.replace('/dashboard')
  }, [profileLoading, profile, canInvite, router])

  const load = useCallback(async () => {
    if (!firebaseUser?.uid) return
    setLoading(true)
    try { setInvites(await getMyInvites(firebaseUser.uid)) }
    catch { setInvites([]) }
    finally { setLoading(false) }
  }, [firebaseUser?.uid])

  useEffect(() => { if (canInvite) load() }, [canInvite, load])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  function inviteLink(code: string) { return `${origin}/auth/register?invite=${code}` }

  async function handleCreate() {
    if (!firebaseUser?.uid) return
    setCreating(true)
    try {
      const space = spaces.find(s => s.id === spaceId)
      await createInvite({
        createdBy: firebaseUser.uid,
        createdByName: profile?.displayName ?? firebaseUser.displayName ?? '',
        spaceId: spaceId || undefined,
        spaceName: space?.name,
        maxUses: parseInt(maxUses) || 0,
        expiresInDays: parseInt(expiresInDays) || 0,
      })
      await load()
    } catch { /* sessiz */ }
    finally { setCreating(false) }
  }

  async function copyLink(code: string) {
    try { await navigator.clipboard.writeText(inviteLink(code)); setCopied(code); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  async function handleDelete(code: string) {
    try { await deleteInvite(code); await load() } catch {}
  }

  if (!profileLoading && profile && !canInvite) return null

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
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary"><Menu className="w-5 h-5" /></button>
          <span className="font-display font-semibold text-text-primary">Davet Et</span>
        </div>

        <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
          <div>
            <h1 className="font-display font-bold text-text-primary text-xl flex items-center gap-2">
              <Ticket className="w-5 h-5 text-brand" /> Davet Et
            </h1>
            <p className="text-sm text-text-muted mt-1">Davet bağlantısı oluştur; davetle gelen kişi platforma erişim kazanır.</p>
          </div>

          {/* Oluşturucu */}
          <div className="card space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-2xs font-medium text-text-secondary mb-1">Topluluk (opsiyonel)</label>
                <select value={spaceId} onChange={e => setSpaceId(e.target.value)} className="input text-sm bg-surface">
                  <option value="">Yok</option>
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-2xs font-medium text-text-secondary mb-1">Maks. kullanım (0=sınırsız)</label>
                <input type="number" min={0} value={maxUses} onChange={e => setMaxUses(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="block text-2xs font-medium text-text-secondary mb-1">Gün sonra dolsun (0=hiç)</label>
                <input type="number" min={0} value={expiresInDays} onChange={e => setExpiresInDays(e.target.value)} className="input text-sm" />
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating}
              className={cn('btn-primary w-full justify-center py-2.5 text-sm', creating && 'opacity-60 cursor-not-allowed')}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Davet Bağlantısı Oluştur</>}
            </button>
          </div>

          {/* Liste */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Davetlerim</h2>
            {loading ? (
              <div className="text-sm text-text-muted py-4">Yükleniyor…</div>
            ) : invites.length === 0 ? (
              <div className="text-sm text-text-muted py-4">Henüz davet oluşturmadın.</div>
            ) : (
              invites.map(inv => (
                <div key={inv.code} className="card flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-text-primary truncate">{inviteLink(inv.code)}</p>
                    <p className="text-2xs text-text-muted mt-0.5">
                      {inv.spaceName ? `${inv.spaceName} · ` : ''}
                      {inv.maxUses ? `${inv.uses}/${inv.maxUses} kullanım` : `${inv.uses} kullanım`}
                      {inv.expiresAt ? ` · ${timeAgo(inv.expiresAt)} dolar` : ''} · {timeAgo(inv.createdAt)}
                    </p>
                  </div>
                  <button onClick={() => copyLink(inv.code)} className="p-2 rounded-lg text-text-muted hover:text-brand hover:bg-surface transition-all shrink-0" title="Kopyala">
                    {copied === inv.code ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(inv.code)} className="p-2 rounded-lg text-text-muted hover:text-accent-red hover:bg-surface transition-all shrink-0" title="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
