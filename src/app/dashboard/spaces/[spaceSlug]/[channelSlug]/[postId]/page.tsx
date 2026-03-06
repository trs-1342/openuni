// src/app/dashboard/spaces/[spaceSlug]/[channelSlug]/[postId]/page.tsx
'use client'
import { db } from '@/lib/firebase'
import { onSnapshot, doc } from 'firebase/firestore'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Lightbox } from '@/components/ui/Lightbox'
import type { LightboxImage } from '@/components/ui/Lightbox'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/Badge'
import { useComments } from '@/hooks/useComments'
import { useAuthStore } from '@/store/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  getPost, getSpaceBySlug, incrementViewCount,
  updatePost, deletePost, archivePost, pinPost,
  toggleReaction, updateComment, deleteComment as deleteCommentFn,
  createComment,
  getListedUsers,
} from '@/lib/firestore'
import { timeAgo, formatFileSize, CHANNEL_META, cn } from '@/lib/utils'
import { PollWidget } from '@/components/posts/PollWidget'
import type { Post, Space, Comment } from '@/types'
import {
  ChevronRight, Eye, MessageSquare, Paperclip, FileText,
  Download, Send, Loader2, ArrowLeft, Pin, Menu, MoreHorizontal,
  Edit2, Trash2, Archive, SmilePlus, Reply, X, Check,
  AlertTriangle, Bookmark, BookmarkCheck, ZoomIn,
} from 'lucide-react'

// Sabit emoji listesi
const ALLOWED_EMOJIS = [
  '😃','😄','😁','😆','😇','😍','🥰','☺️','😊','😛','😝','😜','🤪','😔',
  '🧐','🤓','😎','🤩','🥳','😱','😤','😓','🫡','🤠','👻','☠️','👾','🤖',
  '🤝','👍🏻','💪🏻','🦾','🙏🏻','✍🏻','🫂','🧑🏻‍💻','🎓','🌹','🌟','✨','⚡️',
  '💫','⭐️','💥','🔥','🍎','⚽️','🏀','🗿','💡','⏰','💸','💵','💰','⚒️',
  '💣','🎁','🔑','🎊','🎉','🎀','✉️','📈','📉','🗑️','📌','📍','❌','⭕️',
  '🛑','💢','💯','❗️','❓','⚠️','✅','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣',
  '7️⃣','8️⃣','9️⃣','🔟','🔴','🔵','🟣','⚫️','⚪️','🟤','🔺','🔻','🔈',
  '🔇','🔔','🔕','💬','💭','🗯️','🏳️','🏴','🚩','🇹🇷',
]

// ─── Markdown + mention + URL renderer ───────────────────────────────────────
function renderContent(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    // Heading
    if (line.startsWith('### ')) return <h3 key={li} className="text-sm font-bold text-text-primary mt-2 mb-0.5">{line.slice(4)}</h3>
    if (line.startsWith('## '))  return <h2 key={li} className="text-base font-bold text-text-primary mt-3 mb-1">{line.slice(3)}</h2>
    if (line.startsWith('# '))   return <h1 key={li} className="text-lg font-bold text-text-primary mt-3 mb-1">{line.slice(2)}</h1>
    // Liste
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={li} className="text-sm text-text-secondary ml-4 list-disc">{parseInline(line.slice(2))}</li>
    }
    if (/^\d+\. /.test(line)) {
      return <li key={li} className="text-sm text-text-secondary ml-4 list-decimal">{parseInline(line.replace(/^\d+\. /, ''))}</li>
    }
    // Code block
    if (line.startsWith('```')) return <div key={li} className="bg-[#0d1117] rounded px-3 py-1 font-mono text-xs text-accent-green my-1">{line.slice(3) || ''}</div>
    // Divider
    if (line === '---') return <hr key={li} className="border-surface-border my-2" />
    // Quote
    if (line.startsWith('> ')) return <blockquote key={li} className="border-l-2 border-brand pl-3 my-1 text-sm text-text-muted italic">{parseInline(line.slice(2))}</blockquote>
    // Boş satır
    if (!line.trim()) return <br key={li} />
    return <p key={li} className="text-sm text-text-secondary leading-relaxed">{parseInline(line)}</p>
  })
}

function parseInline(text: string): React.ReactNode[] {
  // Bold, italic, code, mention, URL'yi işle
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(@[\w._%+-]+)|(\bhttps?:\/\/[^\s]+)/g
  let last = 0; let m: RegExpExecArray | null; let i = 0

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{text.slice(last, m.index)}</span>)
    if (m[1]) parts.push(<strong key={i++} className="font-semibold text-text-primary">{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={i++} className="italic">{m[4]}</em>)
    else if (m[5]) parts.push(<code key={i++} className="bg-surface px-1 rounded text-xs font-mono text-accent-amber">{m[6]}</code>)
    else if (m[7]) { const uname = m[7].slice(1); parts.push(<Link key={i++} href={`/dashboard/profile/${uname}`} className="text-accent-amber font-semibold hover:underline" onClick={e => e.stopPropagation()}>@{uname}</Link>) }
    else if (m[8]) parts.push(<a key={i++} href={m[8]} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 break-all">{m[8]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={i++}>{text.slice(last)}</span>)
  return parts
}

// ─── Emoji picker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    <div className="absolute z-50 bottom-full mb-1 left-0 bg-[#1a2235] border border-surface-border rounded-xl p-2 shadow-xl w-72">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-2xs text-text-muted font-medium">İfade seç</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-10 gap-0.5 max-h-40 overflow-y-auto">
        {ALLOWED_EMOJIS.map(e => (
          <button key={e} onClick={() => { onSelect(e); onClose() }}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-base leading-none transition-colors"
            title={e}>{e}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Reaction bar ─────────────────────────────────────────────────────────────
function ReactionBar({
  reactions = {}, currentUserId, onToggle,
}: { reactions?: Record<string, string[]>; currentUserId: string; onToggle: (e: string) => void }) {
  const [showPicker, setShowPicker] = useState(false)
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0)
  return (
    <div className="flex items-center gap-1 flex-wrap relative">
      {entries.map(([emoji, users]) => (
        <button key={emoji} onClick={() => onToggle(emoji)}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all',
            users.includes(currentUserId)
              ? 'bg-brand/10 border-brand text-brand'
              : 'bg-surface border-surface-border text-text-secondary hover:border-brand/40'
          )}>
          <span>{emoji}</span>
          <span className="tabular-nums text-2xs">{users.length}</span>
        </button>
      ))}
      <div className="relative">
        <button onClick={() => setShowPicker(p => !p)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-surface-border text-text-muted hover:border-brand/40 hover:text-brand text-xs transition-all">
          <SmilePlus className="w-3.5 h-3.5" />
        </button>
        {showPicker && <EmojiPicker onSelect={onToggle} onClose={() => setShowPicker(false)} />}
      </div>
    </div>
  )
}

// ─── Yorum bileşeni ───────────────────────────────────────────────────────────
function MentionDropdown({ suggestions, onSelect }: { suggestions: any[]; onSelect: (u: string) => void }) {
  if (!suggestions.length) return null
  return (
    <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-surface border border-surface-border rounded-xl shadow-xl overflow-hidden">
      {suggestions.map((u: any) => (
        <button key={u.uid} type="button" onMouseDown={e => { e.preventDefault(); onSelect(u.username) }}
          className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-surface-hover transition-colors text-left">
          <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">
            {u.displayName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary">{u.displayName}</p>
            <p className="text-2xs text-text-muted">@{u.username}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// eslint-disable-next-line
function CommentItem({
  comment, currentUserId, currentUserRole, postAuthorId,
  onReply, onReaction, allUsers,
}: any) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [isSaving, setIsSaving] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [cmtMentionOpen, setCmtMentionOpen] = useState(false)
  const [cmtMentionPos,  setCmtMentionPos]  = useState(0)
  const [cmtMentionQ,    setCmtMentionQ]    = useState('')
  const [cmtMentionSugg, setCmtMentionSugg] = useState<any[]>([])
  const cmtEditRef = useRef<HTMLTextAreaElement>(null)
  const canEdit = comment.authorId === currentUserId
  const canDelete = canEdit || currentUserRole === 'moderator' || currentUserRole === 'admin'

  function handleCmtEditInput(val: string, cursor: number) {
    const before = val.slice(0, cursor)
    const match = before.match(/@(\w*)$/)
    if (match) {
      const q = match[1].toLowerCase()
      const filtered = (allUsers || []).filter((u: any) => u.username?.toLowerCase().startsWith(q) || u.displayName?.toLowerCase().includes(q)).slice(0, 6)
      setCmtMentionQ(q); setCmtMentionPos(cursor - match[0].length)
      setCmtMentionSugg(filtered); setCmtMentionOpen(filtered.length > 0)
    } else setCmtMentionOpen(false)
  }

  if (deleted || comment.content === '[silindi]') {
    return (
      <div className="flex gap-3 opacity-50">
        <div className="w-7 h-7 rounded-full bg-surface shrink-0" />
        <p className="text-xs text-text-muted italic mt-1.5">Bu yorum silindi.</p>
      </div>
    )
  }

  async function saveEdit() {
    if (!editText.trim()) return
    setIsSaving(true)
    try { await updateComment(comment.id, editText.trim()); setEditing(false) }
    finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    await deleteCommentFn(comment.id, comment.postId)
    setDeleted(true)
  }

  return (
    <div className={cn('flex gap-3 group', comment.parentId && 'ml-8 pl-3 border-l border-surface-border')}>
      <Link href={`/dashboard/profile/${comment.author.username ?? comment.author.uid}`} className="shrink-0 mt-0.5"><Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size="sm" className="hover:ring-2 hover:ring-brand/30 transition-all" /></Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Link href={`/dashboard/profile/${comment.author.username ?? comment.author.uid}`} className="text-xs font-medium text-text-primary hover:text-brand transition-colors">{comment.author.displayName}</Link>
          <RoleBadge role={comment.author.role} />
          {comment.author.uid === postAuthorId && (
            <span className="text-2xs text-brand bg-brand/10 px-1.5 py-0.5 rounded-sm font-medium">Yazar</span>
          )}
          <span className="text-2xs text-text-muted">{timeAgo(comment.createdAt)}</span>
          {comment.isEdited && <span className="text-2xs text-text-muted italic">(düzenlendi)</span>}
        </div>

        {comment.replyToAuthor && (() => {
          const isUsername = /^[\w._%+-]+$/.test(comment.replyToAuthor)
          return (
            <p className="text-2xs text-brand mb-1">
              ↩{' '}
              {isUsername
                ? <Link href={`/dashboard/profile/${comment.replyToAuthor}`}
                    className="hover:underline">@{comment.replyToAuthor}</Link>
                : <span>@{comment.replyToAuthor}</span>
              }
            </p>
          )
        })()}

        {editing ? (
          <div className="space-y-2">
            <div className="relative">
            <textarea ref={cmtEditRef} value={editText} onChange={e => { setEditText(e.target.value); handleCmtEditInput(e.target.value, e.target.selectionStart) }}
              className="input text-xs resize-none" rows={3} />
              {cmtMentionOpen && (
                <MentionDropdown suggestions={cmtMentionSugg} onSelect={u => {
                  const before = editText.slice(0, cmtMentionPos)
                  const after  = editText.slice(cmtEditRef.current?.selectionStart ?? cmtMentionPos + cmtMentionQ.length + 1)
                  setEditText(before + '@' + u + ' ' + after)
                  setCmtMentionOpen(false)
                }} />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={isSaving}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" />{isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">İptal</button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary leading-relaxed">
            {renderContent(comment.content)}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <ReactionBar
            reactions={comment.reactions}
            currentUserId={currentUserId}
            onToggle={e => onReaction(comment.id, e)}
          />
          <button onClick={() => onReply(comment)}
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-brand transition-colors">
            <Reply className="w-3 h-3" />Yanıtla
          </button>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100">
              <Edit2 className="w-3 h-3" />Düzenle
            </button>
          )}
          {canDelete && !editing && (
            <button onClick={handleDelete}
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-3 h-3" />Sil
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function PostDetailPage() {
  const params = useParams<{ spaceSlug: string; channelSlug: string; postId: string }>()
  const router  = useRouter()
  const { user: firebaseUser } = useAuthStore()
  const { profile }            = useUserProfile()

  const [post,       setPost]       = useState<Post | null>(null)
  const [lightbox,   setLightbox]   = useState<{ images: LightboxImage[]; index: number } | null>(null)
  const [space,      setSpace]      = useState<Space | null>(null)
  const [isLoading,  setIsLoading]  = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [commentText,setCommentText]= useState('')
  const [replyTo,    setReplyTo]    = useState<Comment | null>(null)
  const [showEmoji,  setShowEmoji]  = useState(false)
  const [showMenu,   setShowMenu]   = useState(false)
  const [isEditing,  setIsEditing]  = useState(false)
  const [editTitle,  setEditTitle]  = useState('')
  const [editContent,setEditContent]= useState('')
  const [isSaving,   setIsSaving]   = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef= useRef<HTMLTextAreaElement>(null)

  // Mention autocomplete
  const [allUsers,          setAllUsers]          = useState<any[]>([])
  const [mentionOpen,       setMentionOpen]       = useState(false)
  const [mentionQuery,      setMentionQuery]      = useState('')
  const [mentionPos,        setMentionPos]        = useState(0)
  const [mentionSuggestions,setMentionSuggestions]= useState<any[]>([])
  const [mentionTarget,     setMentionTarget]     = useState<'comment'|'edit'>('comment')

  // edit mention
  const [editMentionOpen,   setEditMentionOpen]   = useState(false)
  const [editMentionQuery,  setEditMentionQuery]  = useState('')
  const [editMentionPos,    setEditMentionPos]    = useState(0)
  const [editMentionSugg,   setEditMentionSugg]   = useState<any[]>([])

  const channel = space?.channels.find(c => c.slug === params.channelSlug)
  const { comments, isLoading: commentsLoading, isSubmitting, addComment } = useComments(params.postId)

  const currentUid  = firebaseUser?.uid ?? ''
  const currentRole = profile?.role ?? 'student'
  const isAuthor    = post?.authorId === currentUid
  const isMod       = currentRole === 'moderator' || currentRole === 'admin'
  const isAdmin     = firebaseUser?.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '') || currentRole === 'admin'
  const canEdit     = isAuthor
  const canModerate = isMod
  const [showViewers,    setShowViewers]    = useState(false)
  const [viewerProfiles, setViewerProfiles] = useState<Array<{uid:string;displayName:string;username?:string;avatarUrl?:string}>>([])
  const [viewersLoading, setViewersLoading] = useState(false)

  // ban/mute kontrolü
  const isMuted = profile?.isMuted && (!profile.muteUntil || new Date(profile.muteUntil) > new Date())
  const isBanned = profile?.isBanned && (!profile.banUntil || new Date(profile.banUntil) > new Date())

  useEffect(() => {
    getListedUsers(200).then(u => setAllUsers(u)).catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      const [p, s] = await Promise.all([getPost(params.postId), getSpaceBySlug(params.spaceSlug)])
      setSpace(s); setIsLoading(false)
      if (p) {
        setPost(p)
        setEditTitle(p.title); setEditContent(p.content)
        // Gerçekçi view: sadece bir kez, kullanıcı başına
        if (firebaseUser?.uid) {
          incrementViewCount(params.postId, firebaseUser.uid).catch(() => {})
        }
      }
    }
    load()

    // viewCount anlık — post dokümanını dinle
    const unsub = onSnapshot(doc(db, 'posts', params.postId), (snap) => {
      if (snap.exists()) {
        setPost(prev => prev ? { ...prev, viewCount: snap.data().viewCount ?? 0, viewedBy: snap.data().viewedBy ?? [] } : prev)
      }
    })
    return () => unsub()
  }, [params.postId, params.spaceSlug])

  useEffect(() => {
    if (profile?.bookmarks && post) {
      setBookmarked(profile.bookmarks.includes(post.id))
    }
  }, [profile?.bookmarks, post?.id])

  // Mention autocomplete — @ yazıldığında boşluk yok
  function handleCommentKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  async function handleSubmitComment() {
    if (!commentText.trim() || isSubmitting || isMuted || isBanned) return
    // İçeriğe @mention ekleme — replyToAuthor metadata olarak ayrı saklanıyor
    // Gösterimde "↩ @username" zaten ayrı satırda çıkıyor
    const content = commentText.trim()
    // replyToAuthor: username varsa username, yoksa displayName (eski yorumlar için)
    const replyToAuthor = replyTo
      ? ((replyTo.author as any).username?.trim() || replyTo.author.displayName)
      : undefined
    await addComment(content, replyTo?.id, replyToAuthor)
    setCommentText('')
    setReplyTo(null)
  }

  async function handlePostReaction(emoji: string) {
    if (!currentUid || !post) return
    // Optimistic update — sunucu yanıtı beklemeden UI'ı güncelle
    setPost(prev => {
      if (!prev) return prev
      const reactions: Record<string, string[]> = { ...(prev.reactions ?? {}) }
      const users = reactions[emoji] ?? []
      reactions[emoji] = users.includes(currentUid)
        ? users.filter(u => u !== currentUid)
        : [...users, currentUid]
      return { ...prev, reactions }
    })
    await toggleReaction('posts', post.id, emoji, currentUid)
  }

  async function handleCommentReaction(commentId: string, emoji: string) {
    if (!currentUid) return
    await toggleReaction('comments', commentId, emoji, currentUid)
  }

  async function handleSaveEdit() {
    if (!post) return
    setIsSaving(true)
    try { await updatePost(post.id, { title: editTitle, content: editContent }); setIsEditing(false); setPost({ ...post, title: editTitle, content: editContent, isEdited: true }) }
    finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!post || !confirm('Bu paylaşımı silmek istediğinize emin misiniz?')) return
    await deletePost(post.id)
    router.back()
  }

  async function handleArchive() {
    if (!post) return
    await archivePost(post.id)
    setPost({ ...post, status: 'archived' })
    setShowMenu(false)
  }

  async function handlePin() {
    if (!post) return
    await pinPost(post.id, !post.isPinned)
    setPost({ ...post, isPinned: !post.isPinned })
    setShowMenu(false)
  }

  function handleMentionInput(val: string, cursor: number, isEdit = false) {
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/@(\w*)$/)
    if (match) {
      const q = match[1].toLowerCase()
      const filtered = allUsers.filter(u => u.username?.toLowerCase().startsWith(q) || u.displayName?.toLowerCase().includes(q)).slice(0, 6)
      if (isEdit) { setEditMentionQuery(q); setEditMentionPos(cursor - match[0].length); setEditMentionSugg(filtered); setEditMentionOpen(filtered.length > 0) }
      else { setMentionQuery(q); setMentionPos(cursor - match[0].length); setMentionSuggestions(filtered); setMentionOpen(filtered.length > 0) }
    } else {
      if (isEdit) setEditMentionOpen(false)
      else setMentionOpen(false)
    }
  }

  function applyMention(username: string, isEdit = false) {
    if (isEdit) {
      const ta = editTextareaRef.current
      const before = editContent.slice(0, editMentionPos)
      const after  = editContent.slice(ta?.selectionStart ?? editMentionPos + editMentionQuery.length + 1)
      setEditContent(before + '@' + username + ' ' + after)
      setEditMentionOpen(false)
    } else {
      const ta = textareaRef.current
      const before = commentText.slice(0, mentionPos)
      const after  = commentText.slice(ta?.selectionStart ?? mentionPos + mentionQuery.length + 1)
      setCommentText(before + '@' + username + ' ' + after)
      setMentionOpen(false)
    }
  }

  function insertMention() {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const before = commentText.slice(0, pos)
    const after  = commentText.slice(pos)
    setCommentText(before + '@' + after)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + 1, pos + 1) }, 0)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden lg:block"><Sidebar /></div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden lg:block"><Sidebar /></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><p className="text-text-primary font-medium">Gönderi bulunamadı.</p>
            <Link href="/dashboard" className="text-brand text-sm mt-2 block">Ana sayfaya dön</Link>
          </div>
        </div>
      </div>
    )
  }

  const inputDisabled = isMuted || isBanned || isSubmitting

  return (
    <>
    {/* Görüntüleyenler Modalı */}
    {showViewers && (isAdmin || isMod) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setShowViewers(false)}>
        <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <p className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand" />
              Görüntüleyenler ({(post as any)?.viewedBy?.length ?? 0})
            </p>
            <button onClick={() => setShowViewers(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {viewersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-brand animate-spin" />
              </div>
            ) : viewerProfiles.length === 0 ? (
              <p className="text-center text-xs text-text-muted py-8">Henüz görüntüleyen yok</p>
            ) : (
              viewerProfiles.map(u => (
                <Link key={u.uid} href={`/dashboard/profile/${u.username ?? u.uid}`}
                  onClick={() => setShowViewers(false)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors">
                  <Avatar name={u.displayName} src={u.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{u.displayName}</p>
                    {u.username && <p className="text-2xs text-text-muted">@{u.username}</p>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {lightbox && (
      <Lightbox
        images={lightbox.images}
        startIndex={lightbox.index}
        onClose={() => setLightbox(null)}
      />
    )}
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block"><Sidebar /></div>
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[240px]"><Sidebar onClose={() => setDrawerOpen(false)} /></div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-safe">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-surface-border px-3 py-3 flex items-center gap-2">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded hover:bg-surface text-text-secondary"><Menu className="w-5 h-5" /></button>
          <button onClick={() => router.back()} className="p-1.5 rounded hover:bg-surface text-text-secondary"><ArrowLeft className="w-4 h-4" /></button>
          <span className="flex-1 text-sm font-medium text-text-primary truncate">{post.title}</span>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-4 lg:py-6 space-y-5">
          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-1 text-xs text-text-muted flex-wrap">
            <Link href="/dashboard" className="hover:text-text-secondary transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-3 h-3" />
            {space && <Link href={`/dashboard/spaces/${params.spaceSlug}/${params.channelSlug}`} className="hover:text-text-secondary transition-colors">{space.name}</Link>}
            {channel && <><ChevronRight className="w-3 h-3" /><span>{channel.name}</span></>}
          </div>

          {/* Post */}
          <article className="card space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <Link href={`/dashboard/profile/${post.author.username ?? post.author.uid}`} className="shrink-0 mt-0.5">
                <Avatar name={post.author.displayName} src={post.author.avatarUrl} size="md" className="hover:ring-2 hover:ring-brand/30 transition-all" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/profile/${post.author.username ?? post.author.uid}`} className="text-sm font-medium text-text-primary hover:text-brand transition-colors">{post.author.displayName}</Link>
                  <RoleBadge role={post.author.role} />
                  <span className="text-2xs text-text-muted">{timeAgo(post.createdAt)}</span>
                  {post.isPinned && <span className="flex items-center gap-1 text-2xs text-accent-amber"><Pin className="w-2.5 h-2.5" />Sabitlenmiş</span>}
                  {post.isEdited && <span className="text-2xs text-text-muted italic">(düzenlendi)</span>}
                  {post.status === 'archived' && <span className="text-2xs text-text-muted bg-surface px-1.5 py-0.5 rounded-sm">Arşivlendi</span>}
                </div>
              </div>

              {/* Aksiyon menüsü */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Bookmark */}
                <button
                  onClick={async () => {
                    if (!currentUid || !profile) return
                    const { toggleBookmark } = await import('@/lib/firestore')
                    await toggleBookmark(currentUid, post.id, profile.bookmarks ?? [])
                    setBookmarked(b => !b)
                  }}
                  className={cn('p-1.5 rounded hover:bg-surface transition-colors', bookmarked ? 'text-brand' : 'text-text-muted')}>
                  {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>

                {(canEdit || canModerate) && (
                  <div className="relative">
                    <button onClick={() => setShowMenu(m => !m)}
                      className="p-1.5 rounded hover:bg-surface text-text-muted transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a2235] border border-surface-border rounded-lg shadow-xl overflow-hidden w-44">
                          {canEdit && (
                            <button onClick={() => { setIsEditing(true); setShowMenu(false) }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />Düzenle
                            </button>
                          )}
                          {(canEdit || canModerate) && (
                            <button onClick={handleArchive}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors">
                              <Archive className="w-3.5 h-3.5" />{post.status === 'archived' ? 'Arşivden Çıkar' : 'Arşivle'}
                            </button>
                          )}
                          {canModerate && (
                            <button onClick={handlePin}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors">
                              <Pin className="w-3.5 h-3.5" />{post.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                            </button>
                          )}
                          <div className="border-t border-surface-border" />
                          {(canEdit || canModerate) && (
                            <button onClick={handleDelete}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-accent-red hover:bg-accent-red/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />Sil
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* İçerik (veya düzenleme) */}
            {isEditing ? (
              <div className="space-y-3">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="input text-base font-semibold" placeholder="Başlık" />
                <div className="relative">
                <textarea ref={editTextareaRef} value={editContent} onChange={e => { setEditContent(e.target.value); handleMentionInput(e.target.value, e.target.selectionStart, true) }}
                  className="input resize-none" rows={8} placeholder="İçerik (Markdown desteklenir)" />
                  {editMentionOpen && editMentionSugg.length > 0 && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-surface border border-surface-border rounded-xl shadow-xl overflow-hidden">
                      {editMentionSugg.map((u: any) => (
                        <button key={u.uid} type="button" onMouseDown={e => { e.preventDefault(); applyMention(u.username, true) }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-surface-hover transition-colors text-left">
                          <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                            {u.displayName?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text-primary">{u.displayName}</p>
                            <p className="text-2xs text-text-muted">@{u.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={isSaving}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />{isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm px-4 py-2">İptal</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-bold text-text-primary leading-snug">{post.title}</h1>
                <div className="prose-sm space-y-1">{renderContent(post.content)}</div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-2xs px-2 py-0.5 rounded-sm bg-surface text-text-muted border border-surface-border">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Ekler */}
                {/* Poll */}
                {(post as any).poll && (
                  <PollWidget
                    postId={post.id}
                    poll={(post as any).poll}
                    currentUid={currentUid}
                    isAuthor={isAuthor}
                    onUpdate={async () => {
                      const { getPost } = await import('@/lib/firestore')
                      const p = await getPost(post.id)
                      if (p) setPost(p)
                    }}
                  />
                )}

                {post.attachments.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                      <Paperclip className="w-3 h-3" />Ekler ({post.attachments.length})
                    </p>
                    {/* Resim önizlemeleri */}
                    {post.attachments.filter(a => a.type === 'image').length > 0 && (() => {
                      const imgs = post.attachments.filter(a => a.type === 'image')
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {imgs.map((att, idx) => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => setLightbox({ images: imgs.map(i => ({ url: i.url, name: i.name })), index: idx })}
                              className="block rounded-lg overflow-hidden border border-surface-border hover:border-brand/40 transition-all group text-left w-full"
                            >
                              <img src={att.url} alt={att.name}
                                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-200" />
                              <div className="px-2 py-1.5 flex items-center gap-1.5 bg-surface/50">
                                <span className="text-2xs text-text-muted truncate flex-1">{att.name}</span>
                                <ZoomIn className="w-3 h-3 text-text-muted group-hover:text-brand shrink-0 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                    {/* PDF ve diğer dosyalar */}
                    {post.attachments.filter(a => a.type !== 'image').map(att => (
                      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" download
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-surface-border hover:border-brand/40 text-xs text-text-secondary hover:text-text-primary transition-all group">
                        <FileText className={cn('w-3.5 h-3.5 shrink-0', att.type === 'pdf' ? 'text-accent-red' : 'text-accent-amber')} />
                        <span className="flex-1 truncate">{att.name}</span>
                        <span className="text-text-muted tabular-nums shrink-0">{formatFileSize(att.size)}</span>
                        <Download className="w-3.5 h-3.5 text-text-muted group-hover:text-brand shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Reactions */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-border/50 gap-2 flex-wrap">
              <ReactionBar
                reactions={post.reactions}
                currentUserId={currentUid}
                onToggle={handlePostReaction}
              />
              <div className="flex items-center gap-3 text-2xs text-text-muted">
                <span
                  className={cn("flex items-center gap-1", (isAdmin || isMod) && "cursor-pointer hover:text-brand transition-colors")}
                  onClick={async () => {
                    if (!isAdmin && !isMod) return
                    setShowViewers(true)
                    setViewersLoading(true)
                    try {
                      const viewedBy: string[] = (post as any).viewedBy ?? []
                      if (viewedBy.length === 0) { setViewerProfiles([]); setViewersLoading(false); return }
                      const { getDocs, query, collection, where } = await import('firebase/firestore')
                      // Batch: max 10 per 'in' query
                      const chunks: string[][] = []
                      for (let i = 0; i < viewedBy.length; i += 10) chunks.push(viewedBy.slice(i, i+10))
                      const results: any[] = []
                      for (const chunk of chunks) {
                        const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)))
                        snap.docs.forEach(d => results.push({ uid: d.id, ...d.data() }))
                      }
                      setViewerProfiles(results)
                    } finally { setViewersLoading(false) }
                  }}
                  title={(isAdmin || isMod) ? "Görüntüleyenleri gör" : undefined}
                >
                  <Eye className="w-3 h-3" />{post.viewCount}
                </span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
              </div>
            </div>
          </article>

          {/* Yorumlar */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />{post.commentCount} Yorum
            </h2>

            {commentsLoading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="flex gap-3"><div className="w-7 h-7 rounded-full bg-surface animate-pulse shrink-0" /><div className="flex-1 h-12 bg-surface rounded animate-pulse" /></div>)}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">Henüz yorum yok. İlk yorumu sen yap!</div>
            ) : (
              <div className="space-y-4">
                {comments.map(c => (
                  <CommentItem key={c.id}
                    comment={c as any}
                    currentUserId={currentUid}
                    currentUserRole={currentRole}
                    postAuthorId={post.authorId}
                    onReply={setReplyTo}
                    allUsers={allUsers}
                    onReaction={handleCommentReaction}
                  />
                ))}
              </div>
            )}

            {/* Yorum kutusu */}
            {isBanned ? (
              <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />Hesabınız askıya alındı.
              </div>
            ) : isMuted ? (
              <div className="flex items-center gap-2 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-lg px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />Hesabınız geçici olarak susturuldu.
              </div>
            ) : (
              <div className="card space-y-3">
                {replyTo && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface border border-surface-border text-xs text-text-muted">
                    <Reply className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">@{replyTo.author.username ?? replyTo.author.displayName}'e yanıt veriyorsunuz</span>
                    <button onClick={() => setReplyTo(null)} className="shrink-0 hover:text-text-primary"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <div className="flex gap-2 items-start">
                  <Avatar name={profile?.displayName ?? 'Sen'} src={profile?.avatarUrl} size="sm" className="shrink-0 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={commentText}
                        onChange={e => { setCommentText(e.target.value); handleMentionInput(e.target.value, e.target.selectionStart) }}
                        onKeyDown={e => { if (e.key === 'Escape') setMentionOpen(false); handleCommentKey(e) }}
                        placeholder="Yorum yaz... (@mention, **bold**, *italic*, `kod`, URL desteklenir)"
                        rows={3}
                        className="input resize-none text-sm"
                      />
                      {mentionOpen && mentionSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-surface border border-surface-border rounded-xl shadow-xl overflow-hidden">
                          {mentionSuggestions.map((u: any) => (
                            <button key={u.uid} type="button" onMouseDown={e => { e.preventDefault(); applyMention(u.username) }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-surface-hover transition-colors text-left">
                              <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                                {u.displayName?.[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-text-primary">{u.displayName}</p>
                                <p className="text-2xs text-text-muted">@{u.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={insertMention} title="Mention"
                          className="px-2 py-1 text-xs text-text-muted hover:text-brand hover:bg-surface rounded transition-colors font-mono">@</button>
                        {['**B**','*I*','`code`'].map((f, i) => (
                          <button key={i} title={f}
                            className="px-2 py-1 text-xs text-text-muted hover:text-text-secondary hover:bg-surface rounded transition-colors font-mono">
                            {f}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-text-muted hidden sm:block">Ctrl+Enter</span>
                        <button
                          onClick={handleSubmitComment}
                          disabled={inputDisabled || !commentText.trim()}
                          className={cn('btn-primary text-xs px-4 py-2 flex items-center gap-1.5',
                            (inputDisabled || !commentText.trim()) && 'opacity-50 cursor-not-allowed')}>
                          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Gönder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </>
  )
}
