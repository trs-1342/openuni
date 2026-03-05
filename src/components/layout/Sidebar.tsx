// src/components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, CHANNEL_META } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { useSpaces } from '@/hooks/useSpaces'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { logoutUser } from '@/lib/auth'
import {
  Bell, ChevronDown, ChevronRight, Search, Plus,
  Home, Bookmark, Users, X, LogOut, Settings,
  Info, BookOpen, Shield, Mail, FileText, Hash, ShieldAlert, Archive,
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Space } from '@/types'

const ADMIN_EMAIL = 'khalil.khattab@ogr.gelisim.edu.tr'

// ─── Statik sayfalar (her zaman aranabilir) ──────────────────────────────────
const STATIC_PAGES = [
  { label: 'Ana Sayfa',        href: '/dashboard',                icon: Home,     category: 'Sayfa', keywords: ['anasayfa', 'dashboard', 'panel'] },
  { label: 'Bildirimler',      href: '/dashboard/notifications',  icon: Bell,     category: 'Sayfa', keywords: ['bildirim', 'notification'] },
  { label: 'Üyeler',           href: '/dashboard/members',        icon: Users,    category: 'Sayfa', keywords: ['üye', 'kullanıcı', 'member', 'liste', 'directory'] },
  { label: 'Kaydedilenler',    href: '/dashboard/bookmarks',      icon: Bookmark, category: 'Sayfa', keywords: ['kaydet', 'bookmark', 'favori'] },
  { label: 'Arşivlenenler',     href: '/dashboard/archived',       icon: Archive,  category: 'Sayfa', keywords: ['arşiv', 'archive', 'arşivlendi'] },
  { label: 'Topluluklar',      href: '/dashboard/spaces',         icon: Users,    category: 'Sayfa', keywords: ['topluluk', 'space', 'bölüm'] },
  { label: 'Profil & Ayarlar', href: '/dashboard/settings',       icon: Settings, category: 'Sayfa', keywords: ['profil', 'ayar', 'şifre', 'hesap', 'setting'] },
  { label: 'Hakkımızda',       href: '/about',                    icon: Info,     category: 'Bilgi', keywords: ['hakkında', 'about', 'nedir', 'kim'] },
  { label: 'Kullanım Kılavuzu',href: '/guide',                    icon: BookOpen, category: 'Bilgi', keywords: ['kılavuz', 'nasıl', 'guide', 'yardım', 'help'] },
  { label: 'Gizlilik Politikası', href: '/privacy',               icon: Shield,   category: 'Bilgi', keywords: ['gizlilik', 'kvkk', 'privacy', 'politika'] },
  { label: 'Bize Ulaşın',      href: '/contact',                  icon: Mail,     category: 'Bilgi', keywords: ['iletişim', 'şikayet', 'contact', 'geri bildirim', 'feedback'] },
]

type SearchResult =
  | { kind: 'page';    label: string; href: string; icon: any; category: string }
  | { kind: 'channel'; label: string; href: string; spaceName: string; spaceEmoji: string; channelType: string; category: string }
  | { kind: 'post';    label: string; href: string; spaceName: string; spaceEmoji: string; fileCount: number; tags: string[]; category: string }
  | { kind: 'tag';     label: string; href: string; tag: string; spaceName: string; spaceEmoji: string; category: string }

function buildResults(query: string, spaces: Space[], posts: any[] = []): SearchResult[] {
  if (!query.trim()) return []

  const isTagSearch  = query.startsWith('#')
  const isFileSearch = query.toLowerCase().startsWith('dosya:') || query.toLowerCase().startsWith('pdf:')
  const cleanQ       = isTagSearch ? query.slice(1).trim().toLowerCase()
                     : isFileSearch ? (query.split(':')[1]?.trim() ?? '').toLowerCase()
                     : query.toLowerCase().trim()
  const q = cleanQ

  const results: SearchResult[] = []

  // ── Tag araması: #javascript ──────────────────────────────────────────────
  if (isTagSearch && q) {
    posts.forEach((p: any) => {
      const tags: string[] = p.tags ?? []
      const matchedTags = tags.filter(t => t.toLowerCase().includes(q))
      if (matchedTags.length > 0) {
        results.push({
          kind: 'tag',
          label: p.title,
          href: `/dashboard/spaces/${p._space?.slug}/${p._channel?.slug}/${p.id}`,
          tag: matchedTags[0],
          spaceName: p._space?.name ?? '',
          spaceEmoji: p._space?.iconEmoji ?? '',
          category: 'Etiket',
        })
      }
    })
    return results.slice(0, 12)
  }

  // ── Dosya/PDF araması: dosya:fizik veya pdf:fizik ─────────────────────────
  if (isFileSearch && q) {
    posts.forEach((p: any) => {
      const atts: any[] = p.attachments ?? []
      const matchedFiles = atts.filter((a: any) =>
        a.name?.toLowerCase().includes(q) || a.type === 'pdf'
      )
      if (matchedFiles.length > 0) {
        results.push({
          kind: 'post',
          label: p.title,
          href: `/dashboard/spaces/${p._space?.slug}/${p._channel?.slug}/${p.id}`,
          spaceName: p._space?.name ?? '',
          spaceEmoji: p._space?.iconEmoji ?? '',
          fileCount: matchedFiles.length,
          tags: p.tags ?? [],
          category: 'Dosya',
        })
      }
    })
    if (results.length === 0) {
      // Tüm dosyalı postları getir
      posts.forEach((p: any) => {
        if ((p.attachments?.length ?? 0) > 0) {
          results.push({
            kind: 'post',
            label: p.title,
            href: `/dashboard/spaces/${p._space?.slug}/${p._channel?.slug}/${p.id}`,
            spaceName: p._space?.name ?? '',
            spaceEmoji: p._space?.iconEmoji ?? '',
            fileCount: p.attachments?.length ?? 0,
            tags: p.tags ?? [],
            category: 'Dosya',
          })
        }
      })
    }
    return results.slice(0, 12)
  }

  // ── Normal arama ──────────────────────────────────────────────────────────
  // 1. Statik sayfalar
  STATIC_PAGES.forEach(page => {
    const hit = page.label.toLowerCase().includes(q) || page.keywords.some(k => k.includes(q))
    if (hit) results.push({ kind: 'page', label: page.label, href: page.href, icon: page.icon, category: page.category })
  })

  // 2. Topluluklar
  spaces.forEach(space => {
    const spaceMatch = space.name.toLowerCase().includes(q) || space.description?.toLowerCase().includes(q)
    if (spaceMatch) {
      const firstCh = space.channels[0]
      if (firstCh) results.push({
        kind: 'channel', label: space.name,
        href: `/dashboard/spaces/${space.slug}/${firstCh.slug}`,
        spaceName: space.name, spaceEmoji: space.iconEmoji ?? '',
        channelType: firstCh.type, category: 'Topluluk',
      })
    }
    space.channels.forEach(ch => {
      const chMatch =
        ch.name.toLowerCase().includes(q) ||
        CHANNEL_META[ch.type as keyof typeof CHANNEL_META]?.label?.toLowerCase().includes(q)
      if (chMatch && !spaceMatch) results.push({
        kind: 'channel', label: ch.name,
        href: `/dashboard/spaces/${space.slug}/${ch.slug}`,
        spaceName: space.name, spaceEmoji: space.iconEmoji ?? '',
        channelType: ch.type, category: 'Kanal',
      })
    })
  })

  // 3. Gönderi başlığı ve içeriği
  if (q.length >= 2) {
    posts.forEach((p: any) => {
      const hit = p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) ||
                  (p.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
      if (hit) results.push({
        kind: 'post', label: p.title,
        href: `/dashboard/spaces/${p._space?.slug}/${p._channel?.slug}/${p.id}`,
        spaceName: p._space?.name ?? '', spaceEmoji: p._space?.iconEmoji ?? '',
        fileCount: p.attachments?.length ?? 0, tags: p.tags ?? [],
        category: 'Gönderi',
      })
    })
  }

  return results.slice(0, 14)
}

// ─── Arama overlay ────────────────────────────────────────────────────────────
interface SearchOverlayProps {
  spaces: Space[]
  onClose: () => void
}

function SearchOverlay({ spaces, onClose }: SearchOverlayProps) {
  const router  = useRouter()
  const [query, setQuery]       = useState('')
  const [active, setActive]     = useState(0)
  const [posts,  setPosts]      = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  // # ile başlıyorsa tag modu, dosya: ile başlıyorsa dosya modu
  const isTagSearch  = query.startsWith('#')
  const isFileSearch = query.toLowerCase().startsWith('dosya:') || query.toLowerCase().startsWith('pdf:')
  const cleanQuery   = isTagSearch ? query.slice(1).trim() : isFileSearch ? query.split(':')[1]?.trim() ?? '' : query

  // Post/dosya araması için Firestore çağrısı
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setPosts([]); return }
    if (!isTagSearch && !isFileSearch && query.length < 3) return

    setPostsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const { getRecentPostsForUser } = await import('@/lib/firestore')
        // Tüm space'lerden son 50 post çek, client'ta filtrele
        const allPosts: any[] = []
        for (const space of spaces.slice(0, 8)) {
          for (const ch of space.channels.slice(0, 6)) {
            try {
              const { getPosts } = await import('@/lib/firestore')
              const ps = await getPosts(ch.id, 20)
              allPosts.push(...ps.map((p: any) => ({ ...p, _space: space, _channel: ch })))
            } catch {}
          }
        }
        setPosts(allPosts)
      } catch {}
      setPostsLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, spaces])

  const results = buildResults(query, spaces, posts)

  // Input'a odaklan
  useEffect(() => { inputRef.current?.focus() }, [])

  // Active item değişince scroll et
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      navigate(results[active].href)
    }
  }

  // Query değişince cursor'u sıfırla
  useEffect(() => { setActive(0) }, [query])

  // Kategori grupları
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  // Sıralı kategoriler
  const categoryOrder = ['Sayfa', 'Topluluk', 'Kanal', 'Bilgi']
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  )

  // Tüm results düz liste (index için)
  let flatIdx = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Kutu */}
      <div
        className="relative w-full max-w-[560px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#111827] border border-surface-border rounded-2xl overflow-hidden">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sayfa, kanal, gönderi ara... | #etiket | dosya: veya pdf:"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="text-2xs bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono text-text-muted">ESC</kbd>
              <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Arama ipuçları */}
          <div className="px-4 py-2 border-b border-surface-border flex flex-wrap gap-1.5">
            {[
              { label: '#etiket', color: 'text-brand' },
              { label: 'dosya:', color: 'text-accent-amber' },
              { label: 'pdf:', color: 'text-accent-red' },
            ].map(tip => (
              <button key={tip.label} onClick={() => {}} className={`text-2xs px-2 py-0.5 rounded-full bg-surface border border-surface-border ${tip.color} font-mono hover:bg-surface-hover transition-colors`}>
                {tip.label}
              </button>
            ))}
          </div>

          {/* Boş state — ipuçları */}
          {!query && (
            <div className="px-4 py-5">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">Hızlı Erişim</p>
              <ul className="space-y-0.5">
                {STATIC_PAGES.slice(0, 5).map(page => {
                  const Icon = page.icon
                  return (
                    <li key={page.href}>
                      <button
                        onClick={() => navigate(page.href)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-surface border border-surface-border flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <span className="text-sm text-text-secondary">{page.label}</span>
                        <span className="ml-auto text-2xs text-text-muted">{page.category}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Sonuçlar */}
          {query && (
            <>
              {postsLoading && results.length === 0 ? (
                <div className="flex items-center justify-center py-6 gap-2 text-sm text-text-muted">
                  <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                  Aranıyor...
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm text-text-secondary font-medium">"{query}" için sonuç bulunamadı</p>
                  <p className="text-xs text-text-muted mt-1">Farklı kelimeler deneyin</p>
                </div>
              ) : (
                <ul ref={listRef} className="py-2 max-h-80 overflow-y-auto">
                  {sortedCategories.map(cat => (
                    <li key={cat}>
                      {/* Kategori başlığı */}
                      <div className="px-4 py-1.5">
                        <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">{cat}</span>
                      </div>
                      {grouped[cat].map(result => {
                        const currentIdx = flatIdx++
                        const isActive   = currentIdx === active

                        if (result.kind === 'page') {
                          const Icon = result.icon
                          return (
                            <button
                              key={result.href}
                              onClick={() => navigate(result.href)}
                              onMouseEnter={() => setActive(currentIdx)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                                isActive ? 'bg-brand/10' : 'hover:bg-surface'
                              )}
                            >
                              <div className={cn(
                                'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                                isActive ? 'bg-brand/10 border-brand/30' : 'bg-surface border-surface-border'
                              )}>
                                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-brand' : 'text-text-muted')} />
                              </div>
                              <span className={cn('text-sm flex-1', isActive ? 'text-text-primary' : 'text-text-secondary')}>
                                {result.label}
                              </span>
                              {isActive && (
                                <kbd className="text-2xs bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono text-text-muted shrink-0">
                                  ↵
                                </kbd>
                              )}
                            </button>
                          )
                        }

                        // Channel result
                        if (result.kind === 'channel') {
                          const meta = CHANNEL_META[result.channelType as keyof typeof CHANNEL_META]
                          return (
                            <button
                              key={result.href}
                              onClick={() => navigate(result.href)}
                              onMouseEnter={() => setActive(currentIdx)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                                isActive ? 'bg-brand/10' : 'hover:bg-surface'
                              )}
                            >
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0', meta?.bgClass ?? 'bg-surface')}>
                                {meta?.icon ?? '#'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={cn('text-sm block truncate', isActive ? 'text-text-primary' : 'text-text-secondary')}>{result.label}</span>
                                <span className="text-2xs text-text-muted">{result.spaceEmoji} {result.spaceName}</span>
                              </div>
                              {isActive && <kbd className="text-2xs bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono text-text-muted shrink-0">↵</kbd>}
                            </button>
                          )
                        }

                        // Post result
                        if (result.kind === 'post') {
                          return (
                            <button
                              key={result.href}
                              onClick={() => navigate(result.href)}
                              onMouseEnter={() => setActive(currentIdx)}
                              className={cn('w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left', isActive ? 'bg-brand/10' : 'hover:bg-surface')}
                            >
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border', isActive ? 'bg-brand/10 border-brand/30' : 'bg-surface border-surface-border')}>
                                {result.fileCount > 0 ? '📎' : '📄'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={cn('text-sm block truncate', isActive ? 'text-text-primary' : 'text-text-secondary')}>{result.label}</span>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-2xs text-text-muted">{result.spaceEmoji} {result.spaceName}</span>
                                  {result.fileCount > 0 && <span className="text-2xs text-accent-amber">📎 {result.fileCount} dosya</span>}
                                  {result.tags.slice(0,2).map((t: string) => (
                                    <span key={t} className="text-2xs text-brand bg-brand/10 rounded px-1">#{t}</span>
                                  ))}
                                </div>
                              </div>
                              {isActive && <kbd className="text-2xs bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono text-text-muted shrink-0">↵</kbd>}
                            </button>
                          )
                        }

                        // Tag result
                        if (result.kind === 'tag') {
                          return (
                            <button
                              key={result.href + (result as any).tag}
                              onClick={() => navigate(result.href)}
                              onMouseEnter={() => setActive(currentIdx)}
                              className={cn('w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left', isActive ? 'bg-brand/10' : 'hover:bg-surface')}
                            >
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border', isActive ? 'bg-brand/10 border-brand/30' : 'bg-surface border-surface-border')}>
                                🏷️
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={cn('text-sm block truncate', isActive ? 'text-text-primary' : 'text-text-secondary')}>{result.label}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-2xs text-brand bg-brand/10 rounded px-1">#{(result as any).tag}</span>
                                  <span className="text-2xs text-text-muted">{result.spaceEmoji} {result.spaceName}</span>
                                </div>
                              </div>
                              {isActive && <kbd className="text-2xs bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono text-text-muted shrink-0">↵</kbd>}
                            </button>
                          )
                        }

                        return null
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-surface-border flex items-center gap-4 text-2xs text-text-muted">
            <span className="flex items-center gap-1"><kbd className="font-mono bg-surface border border-surface-border px-1 rounded">↑↓</kbd> Gezin</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-surface border border-surface-border px-1 rounded">↵</kbd> Aç</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-surface border border-surface-border px-1 rounded">ESC</kbd> Kapat</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Space section ────────────────────────────────────────────────────────────
function SpaceSection({ space, isActive, onNavigate }: any) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(isActive)

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all',
          'hover:bg-surface text-text-muted hover:text-text-secondary',
          isActive && 'text-text-secondary'
        )}
      >
        <span className="text-sm leading-none">{space.iconEmoji}</span>
        <span className="flex-1 text-left truncate">{space.name}</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="ml-2 mt-0.5 space-y-0.5">
          {space.channels.map((channel: any) => {
            const meta   = CHANNEL_META[channel.type as keyof typeof CHANNEL_META]
            const href   = `/dashboard/spaces/${space.slug}/${channel.slug}`
            const active = pathname === href
            return (
              <Link
                key={channel.id}
                href={href}
                onClick={onNavigate}
                className={cn('sidebar-item pl-4 text-xs', active && 'active')}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', {
                  'bg-accent-amber':  channel.type === 'announcement',
                  'bg-accent-green':  channel.type === 'academic',
                  'bg-accent-purple': channel.type === 'archive',
                  'bg-accent-red':    channel.type === 'listing',
                  'bg-brand':         channel.type === 'social',
                  'bg-text-muted':    channel.type === 'suggestion',
                })} />
                <span className="flex-1 truncate">{meta.icon} {channel.name}</span>
{/* postCount Firestore'dan realtime gelince tekrar eklenecek */}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps { onClose?: () => void }

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)

  const { spaces, isLoading } = useSpaces()
  const { profile }            = useUserProfile()
  const { user: firebaseUser } = useAuthStore()
  const { unreadCount }        = useNotifications()

  const displayName = profile?.displayName ?? firebaseUser?.displayName ?? 'Kullanıcı'
  const department  = profile?.department ?? ''

  // ─── Ctrl+K / ⌘K global kısayol ──────────────────────────────────────────
  const openSearch = useCallback(() => setSearchOpen(true), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  async function handleLogout() {
    await logoutUser()
    router.replace('/auth/login')
  }

  const topItems = [
    { label: 'Ana Sayfa',     href: '/dashboard',              icon: Home },
    { label: 'Bildirimler',   href: '/dashboard/notifications', icon: Bell,     badge: unreadCount },
    { label: 'Üyeler',        href: '/dashboard/members',       icon: Users },
  { label: 'Kaydedilenler', href: '/dashboard/bookmarks',     icon: Bookmark },
  { label: 'Arşivlenenler',  href: '/dashboard/archived',      icon: Archive },
    { label: 'Topluluklar',   href: '/dashboard/spaces',        icon: Users },
  ]

  return (
    <>
      {/* Arama overlay — spaces'ı geçir ki kanal araması çalışsın */}
      {searchOpen && (
        <SearchOverlay
          spaces={spaces}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-background-secondary border-r border-surface-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-border">
          <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden flex items-center justify-center bg-brand/10 border border-brand/20">
            <img
              src="/favicon.svg"
              alt="OpenUni"
              className="w-6 h-6 object-contain"
              onError={(e: any) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement!.innerHTML = '<span class="text-brand font-display font-bold text-sm">O</span>'
              }}
            />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-sm text-text-primary leading-none">OpenUni</div>
            <div className="text-2xs text-text-muted mt-0.5">IGÜ Platformu</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Arama butonu */}
        <div className="px-3 py-3 border-b border-surface-border">
          <button
            onClick={openSearch}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-surface-border text-text-muted text-xs hover:border-brand/40 hover:text-text-secondary transition-all group"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-brand transition-colors" />
            <span className="flex-1 text-left">Ara...</span>
            <div className="flex items-center gap-0.5 shrink-0">
              <kbd className="text-2xs bg-background-secondary px-1.5 py-0.5 rounded border border-surface-border font-mono leading-tight">
                {typeof window !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
              </kbd>
              <kbd className="text-2xs bg-background-secondary px-1.5 py-0.5 rounded border border-surface-border font-mono leading-tight">K</kbd>
            </div>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          <div className="space-y-0.5">
            {topItems.map(item => {
              const Icon   = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn('sidebar-item', active && 'active')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="bg-brand text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="divider" />

          {/* Spaces */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Toplulukların</span>
              <button
                onClick={() => router.push('/dashboard/spaces?create=1')}
                className="text-text-muted hover:text-text-primary transition-colors p-0.5 hover:bg-surface rounded"
                title="Yeni topluluk oluştur"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {isLoading ? (
              <div className="px-3 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-7 bg-surface rounded animate-pulse" />)}
              </div>
            ) : (
              spaces.map(space => (
                <SpaceSection
                  key={space.id}
                  space={space}
                  isActive={pathname.includes(space.slug)}
                  onNavigate={onClose}
                />
              ))
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-surface-border space-y-1">
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className={cn('sidebar-item', pathname === '/dashboard/settings' && 'active')}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="flex-1">Profil & Ayarlar</span>
          </Link>

          <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-surface transition-colors">
            <Avatar name={displayName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-text-primary truncate">{displayName}</div>
              <div className="text-2xs text-text-muted truncate">{department || 'Öğrenci'}</div>
            </div>
            {(firebaseUser?.email === ADMIN_EMAIL || profile?.role === 'admin') && (
              <Link href="/dashboard/admin" title="Admin Paneli" onClick={onClose}
                className="p-1 text-text-muted hover:text-brand transition-colors shrink-0">
                <ShieldAlert className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-1 text-text-muted hover:text-accent-red transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
