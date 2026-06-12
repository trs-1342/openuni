'use client'

// Admin panel — Sistem Logları sekmesi (O1, yalnızca owner)
// Seviye filtresi + arama + genişletilebilir detay satırları.

import { useEffect, useState } from 'react'
import { getSystemLogs, type SystemLogRow } from '@/lib/firestore'
import { cn } from '@/lib/utils'
import {
  RefreshCw, Loader2, Terminal, Info, AlertTriangle,
  AlertOctagon, Search, X, ChevronDown,
} from 'lucide-react'

const LEVEL_META = {
  info:  { label: 'INFO',    icon: Info,          color: 'text-brand',         chip: 'bg-brand/10 border-brand text-brand' },
  warn:  { label: 'WARNING', icon: AlertTriangle, color: 'text-accent-amber',  chip: 'bg-accent-amber/10 border-accent-amber text-accent-amber' },
  error: { label: 'ERROR',   icon: AlertOctagon,  color: 'text-accent-red',    chip: 'bg-accent-red/10 border-accent-red text-accent-red' },
} as const

function LogRow({ log }: { log: SystemLogRow }) {
  const [open, setOpen] = useState(false)
  const meta = LEVEL_META[log.level] ?? LEVEL_META.info
  const Icon = meta.icon

  let detailsPretty: string | null = null
  if (log.details) {
    try { detailsPretty = JSON.stringify(JSON.parse(log.details), null, 2) }
    catch { detailsPretty = log.details }
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden',
      log.level === 'error' ? 'bg-accent-red/5 border-accent-red/20' :
      log.level === 'warn'  ? 'bg-accent-amber/5 border-accent-amber/20' :
      'bg-surface border-surface-border')}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-3">
        <div className="flex items-start gap-2">
          <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', meta.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn('text-2xs font-semibold tracking-wide', meta.color)}>{meta.label}</span>
              {log.event && <span className="text-2xs bg-surface border border-surface-border rounded px-1.5 py-0.5 text-text-muted font-mono">{log.event}</span>}
              {log.source && <span className="text-2xs text-text-muted">{log.source}</span>}
            </div>
            <p className="text-xs font-medium text-text-primary mt-1">{log.message}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <span className="text-2xs text-text-muted whitespace-nowrap">
              {log.createdAt.toLocaleDateString('tr-TR')} {log.createdAt.toLocaleTimeString('tr-TR')}
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t border-surface-border/50 px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-2xs text-text-muted">
            <div>Kullanıcı: <span className="text-text-secondary">{log.userEmail ?? '—'}</span></div>
            <div>UID: <span className="font-mono">{log.userId ?? '—'}</span></div>
          </div>
          {detailsPretty && (
            <pre className="text-2xs text-text-muted bg-background rounded-lg border border-surface-border p-2.5 overflow-x-auto whitespace-pre-wrap break-all font-mono">
              {detailsPretty}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function LogsTab() {
  const [logs,    setLogs]    = useState<SystemLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [level,   setLevel]   = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [search,  setSearch]  = useState('')

  async function load() {
    setLoading(true)
    try { setLogs(await getSystemLogs(200)) }
    catch { setLogs([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const q = search.trim().toLocaleLowerCase('tr')
  const filtered = logs.filter(l => {
    if (level !== 'all' && l.level !== level) return false
    if (!q) return true
    return (
      l.message.toLocaleLowerCase('tr').includes(q) ||
      (l.event ?? '').toLowerCase().includes(q) ||
      (l.source ?? '').toLowerCase().includes(q) ||
      (l.userEmail ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      {/* Filtre + yenile */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { id: 'all',   label: 'Tümü' },
          { id: 'info',  label: '🔵 INFO' },
          { id: 'warn',  label: '🟡 WARNING' },
          { id: 'error', label: '🔴 ERROR' },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setLevel(f.id)}
            className={cn('px-2.5 py-1 rounded-full text-xs border transition-all',
              level === f.id ? 'bg-brand/10 border-brand text-brand' : 'border-surface-border text-text-muted hover:border-surface-active')}>
            {f.label}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          className="ml-auto text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />Yenile
        </button>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Mesaj, olay kodu, kaynak veya e-posta ara..."
          className="input pl-9 text-xs py-2" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs text-text-muted">{filtered.length} / {logs.length} log kaydı</p>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 card">
          <Terminal className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary font-medium">Log kaydı yok</p>
          <p className="text-xs text-text-muted mt-1">
            {logs.length > 0 ? 'Filtreye uyan kayıt bulunamadı' : 'Sistem olayları burada görünecek'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => <LogRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
