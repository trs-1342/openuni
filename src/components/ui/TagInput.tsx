'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  className?: string
}

export function TagInput({
  value, onChange,
  placeholder = 'Etiket ekle...',
  maxTags = 5,
  className,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30)
    if (!tag) return
    if (value.includes(tag)) { setInput(''); return }
    if (value.length >= maxTags) return
    onChange([...value, tag])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border bg-surface cursor-text',
        'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
        'transition-all duration-150',
        className,
      )}
    >
      <Tag className="w-3.5 h-3.5 text-text-muted shrink-0" />

      {value.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand text-xs font-medium"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-accent-red transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {value.length < maxTags && (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => addTag(input)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
        />
      )}

      <span className="ml-auto text-2xs text-text-muted shrink-0 select-none">
        {value.length}/{maxTags}
      </span>
    </div>
  )
}
