'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { getListedUsers } from '@/lib/firestore'
import { cn } from '@/lib/utils'
import { USER_TYPE_LABELS } from '@/lib/departments'
import type { User } from '@/types'
import { Users, Search, Menu, ArrowLeft, GraduationCap, Crown, ShieldCheck, Loader2 } from 'lucide-react'

export default function MembersPage() {
  const router = useRouter()
  const [users,     setUsers]     = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search,    setSearch]    = useState('')
  const [drawerOpen,setDrawerOpen]= useState(false)

  useEffect(() => {
    getListedUsers(200).then(u => {
      setUsers(u)
      setIsLoading(false)
    })
  }, [])

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.displayName?.toLowerCase().includes(q) ||
      (u as any).username?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      (u as any).fakulte?.toLowerCase().includes(q)
    )
  })

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
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => router.back()} className="p-1.5 rounded hover:bg-surface text-text-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-semibold text-text-primary flex-1">Üyeler</span>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-10 glass border-b border-surface-border px-6 py-4 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />Geri
            </button>
            <div>
              <h1 className="font-display font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-text-muted" />
                Üyeler
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {isLoading ? '...' : `${filtered.length} üye listeleniyor`}
              </p>
            </div>
          </div>
          {/* Arama */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İsim, kullanıcı adı, bölüm..."
              className="input pl-9 text-xs py-2"
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Mobil arama */}
          <div className="lg:hidden relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              className="input pl-9 text-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-secondary">
                {search ? 'Sonuç bulunamadı' : 'Henüz listelenen üye yok'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {search ? 'Farklı bir arama dene' : 'Kullanıcılar Settings → Kullanıcı Adı bölümünden listeye katılabilir'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(u => {
                const roleInfo = u.role === 'admin'
                  ? { icon: Crown,       label: 'Admin',     color: 'text-accent-amber' }
                  : u.role === 'moderator'
                  ? { icon: ShieldCheck, label: 'Moderatör', color: 'text-accent-purple' }
                  : null
                const typeLabel = (u as any).userType
                  ? USER_TYPE_LABELS[(u as any).userType as keyof typeof USER_TYPE_LABELS]
                  : null

                return (
                  <Link
                    key={u.uid}
                    href={`/dashboard/profile/${(u as any).username ?? u.uid}`}
                    className="card flex items-center gap-3 hover:bg-surface-hover hover:border-surface-active transition-all group"
                  >
                    <Avatar name={u.displayName} src={u.avatarUrl} size="md" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors truncate">
                          {u.displayName}
                        </span>
                        {roleInfo && (
                          <roleInfo.icon className={cn('w-3.5 h-3.5 shrink-0', roleInfo.color)} />
                        )}
                      </div>
                      {(u as any).username && (
                        <p className="text-xs text-text-muted">@{(u as any).username}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {typeLabel && (
                          <span className="flex items-center gap-1 text-2xs text-text-muted">
                            <GraduationCap className="w-3 h-3" />{typeLabel}
                          </span>
                        )}
                        {u.department && (
                          <span className="text-2xs text-text-muted truncate">{u.department}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
