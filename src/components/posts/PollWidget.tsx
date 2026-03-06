'use client'

'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { votePoll, retractVote, endPoll } from '@/lib/firestore'
import { BarChart2, Clock, CheckCircle2, Loader2, Lock } from 'lucide-react'
import type { Poll, PollOption } from '@/types'

interface PollWidgetProps {
  postId:     string
  poll:       Poll
  currentUid: string
  isAuthor:   boolean
  compact?:   boolean   // PostCard'da küçük gösterim
  onUpdate?:  () => void
}

function timeLeft(endsAt: Date | null): string {
  if (!endsAt) return ''
  const diff = endsAt.getTime() - Date.now()
  if (diff <= 0) return 'Sona erdi'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}g ${h}s kaldı`
  if (h > 0) return `${h}s ${m}dk kaldı`
  return `${m}dk kaldı`
}

export function PollWidget({ postId, poll, currentUid, isAuthor, compact, onUpdate }: PollWidgetProps) {
  const [isPending, startTransition] = useTransition()
  const [localPoll, setLocalPoll] = useState<Poll>({ ...poll, endsAt: poll.endsAt instanceof Date ? poll.endsAt : poll.endsAt ? new Date(poll.endsAt as any) : null })

  const isExpired  = localPoll.endsAt ? localPoll.endsAt.getTime() < Date.now() : false
  const isEnded    = localPoll.isEnded || isExpired
  const totalVotes = localPoll.options.reduce((s: number, o: PollOption) => s + o.votes.length, 0)

  // Kullanıcının oy verdiği seçenekler
  const myVotes = localPoll.options.filter((o: PollOption) => o.votes.includes(currentUid)).map((o: PollOption) => o.id)
  const hasVoted = myVotes.length > 0

  // Sonuçları göster mü?
  const showResults = hasVoted || isEnded || (isAuthor && !localPoll.showResultsAfterEnd)
    || (!localPoll.showResultsAfterEnd)

  function handleVote(optionId: string) {
    if (!currentUid || isEnded || isPending) return
    const alreadyVoted = myVotes.includes(optionId)

    // Optimistic update
    setLocalPoll((prev: Poll) => {
      const opts = prev.options.map((o: PollOption) => {
        if (!prev.allowMultiple) {
          const votes = o.votes.filter((v: string) => v !== currentUid)
          if (!alreadyVoted && o.id === optionId) return { ...o, votes: [...votes, currentUid] }
          return { ...o, votes }
        } else {
          if (o.id === optionId) {
            const votes = alreadyVoted
              ? o.votes.filter((v: string) => v !== currentUid)
              : [...o.votes, currentUid]
            return { ...o, votes }
          }
          return o
        }
      })
      return { ...prev, options: opts }
    })

    startTransition(async () => {
      try {
        const newMyVotes: string[] = !localPoll.allowMultiple
          ? (alreadyVoted ? [] : [optionId])
          : (myVotes.includes(optionId) ? myVotes.filter((id: string) => id !== optionId) : [...myVotes, optionId])

        if (newMyVotes.length === 0) {
          await retractVote(postId, currentUid)
        } else {
          await votePoll(postId, newMyVotes, currentUid)
        }
        onUpdate?.()
      } catch (e) {
        setLocalPoll(poll) // rollback
      }
    })
  }

  function handleRetract() {
    if (!hasVoted || isPending) return
    setLocalPoll((prev: Poll) => ({
      ...prev,
      options: prev.options.map((o: PollOption) => ({ ...o, votes: o.votes.filter((v: string) => v !== currentUid) }))
    }))
    startTransition(async () => {
      try { await retractVote(postId, currentUid); onUpdate?.() }
      catch { setLocalPoll(poll) }
    })
  }

  async function handleEnd() {
    if (!isAuthor || isEnded) return
    await endPoll(postId)
    setLocalPoll((prev: Poll) => ({ ...prev, isEnded: true }))
    onUpdate?.()
  }

  // compact: PostCard'da sadece özet göster
  if (compact) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
        <BarChart2 className="w-3.5 h-3.5 text-brand" />
        <span>{totalVotes} oy · {localPoll.options.length} seçenek</span>
        {isEnded && <Lock className="w-3 h-3 text-text-muted" />}
        {!isEnded && localPoll.endsAt && <Clock className="w-3 h-3" />}
      </div>
    )
  }

  return (
    <div className="mt-4 border border-surface-border rounded-xl overflow-hidden bg-surface/30">
      {/* Başlık */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface/50">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-brand shrink-0" />
          <span className="text-sm font-semibold text-text-primary">Anket</span>
          {localPoll.allowMultiple && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">Çoklu seçim</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />}
          {isEnded ? (
            <span className="flex items-center gap-1 text-2xs text-text-muted">
              <Lock className="w-3 h-3" /> Sona erdi
            </span>
          ) : localPoll.endsAt ? (
            <span className="flex items-center gap-1 text-2xs text-accent-amber">
              <Clock className="w-3 h-3" /> {timeLeft(localPoll.endsAt)}
            </span>
          ) : (
            <span className="text-2xs text-text-muted">Süresiz</span>
          )}
        </div>
      </div>

      {/* Seçenekler */}
      <div className="p-3 space-y-2">
        {localPoll.options.map((option: PollOption) => {
          const pct    = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0
          const isMyVote = option.votes.includes(currentUid)
          const canVote  = !isEnded && currentUid

          return (
            <button
              key={option.id}
              type="button"
              disabled={!canVote || isPending}
              onClick={() => handleVote(option.id)}
              className={cn(
                'w-full relative rounded-lg overflow-hidden border text-left transition-all duration-200',
                canVote ? 'cursor-pointer hover:border-brand/50' : 'cursor-default',
                isMyVote ? 'border-brand/60 bg-brand/5' : 'border-surface-border bg-surface',
              )}
            >
              {/* Progress bar */}
              {showResults && totalVotes > 0 && (
                <div
                  className={cn('absolute inset-y-0 left-0 transition-all duration-500 rounded-lg opacity-20',
                    isMyVote ? 'bg-brand' : 'bg-text-muted')}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2.5 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Checkbox/radio gösterimi */}
                  <div className={cn(
                    'w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-all',
                    localPoll.allowMultiple ? 'rounded' : 'rounded-full',
                    isMyVote ? 'bg-brand border-brand' : 'border-surface-border bg-surface'
                  )}>
                    {isMyVote && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-text-primary truncate">{option.text}</span>
                </div>
                {showResults && (
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-text-muted">{option.votes.length}</span>
                    <span className="text-xs font-semibold text-text-secondary w-10 text-right">{totalVotes > 0 ? `${pct}%` : '—'}</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-surface-border flex items-center justify-between">
        <span className="text-2xs text-text-muted">{totalVotes} toplam oy</span>
        <div className="flex items-center gap-3">
          {hasVoted && !isEnded && (
            <button type="button" onClick={handleRetract}
              className="text-2xs text-text-muted hover:text-accent-red transition-colors">
              Oyu geri al
            </button>
          )}
          {isAuthor && !isEnded && (
            <button type="button" onClick={handleEnd}
              className="text-2xs text-brand hover:text-brand-hover transition-colors">
              Anketi bitir
            </button>
          )}
          {localPoll.showResultsAfterEnd && !isEnded && !hasVoted && (
            <span className="text-2xs text-text-muted italic">Sonuçlar bitiş sonrası açıklanacak</span>
          )}
        </div>
      </div>
    </div>
  )
}
