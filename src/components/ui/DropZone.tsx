'use client'

import { useRef, useState, useCallback } from 'react'
import { cn, formatFileSize } from '@/lib/utils'
import type { UploadedFile } from '@/hooks/useFileUpload'
import {
  Upload, X, FileText, ImageIcon, File,
  CheckCircle, AlertCircle, Loader2, CloudUpload,
} from 'lucide-react'

// ─── File Icon ────────────────────────────────────────────────────────────────
function FileIcon({ type }: { type: UploadedFile['type'] }) {
  if (type === 'pdf')   return <FileText className="w-4 h-4 text-accent-red" />
  if (type === 'image') return <ImageIcon className="w-4 h-4 text-brand" />
  if (type === 'doc')   return <File      className="w-4 h-4 text-accent-amber" />
  return <File className="w-4 h-4 text-text-muted" />
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ progress, status }: { progress: number; status: UploadedFile['status'] }) {
  const colorMap = {
    idle:      'bg-surface-border',
    uploading: 'bg-brand',
    done:      'bg-accent-green',
    error:     'bg-accent-red',
  }
  return (
    <div className="h-0.5 w-full rounded-full bg-surface-border overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-200', colorMap[status])}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({ file, onRemove }: any) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
      file.status === 'error'     && 'bg-accent-red/5  border-accent-red/20',
      file.status === 'done'      && 'bg-accent-green/5 border-accent-green/20',
      file.status === 'uploading' && 'bg-surface border-surface-border',
      file.status === 'idle'      && 'bg-surface border-surface-border',
    )}>
      {/* Thumbnail or Icon */}
      <div className="w-8 h-8 rounded bg-background border border-surface-border flex items-center justify-center shrink-0 overflow-hidden">
        {file.preview
          ? <img src={file.preview} alt="" className="w-full h-full object-cover" />
          : <FileIcon type={file.type} />
        }
      </div>

      {/* Name + Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-text-primary truncate">{file.name}</span>
          <span className="text-2xs text-text-muted shrink-0 tabular-nums">
            {formatFileSize(file.size)}
          </span>
        </div>

        {file.status === 'error' ? (
          <p className="text-2xs text-accent-red flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {file.error}
          </p>
        ) : (
          <ProgressBar progress={file.progress} status={file.status} />
        )}
      </div>

      {/* Status Icon */}
      <div className="shrink-0">
        {file.status === 'uploading' && (
          <Loader2 className="w-4 h-4 text-brand animate-spin" />
        )}
        {file.status === 'done' && (
          <CheckCircle className="w-4 h-4 text-accent-green" />
        )}
        {(file.status === 'idle' || file.status === 'error') && (
          <button
            type="button"
            onClick={onRemove}
            className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {file.status === 'done' && (
          <button
            type="button"
            onClick={onRemove}
            className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
interface DropZoneProps {
  files: UploadedFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  canAddMore: boolean
  maxFiles: number
  maxSizeMB: number
  className?: string
}

export function DropZone({
  files, onAdd, onRemove, canAddMore, maxFiles, maxSizeMB, className
}: DropZoneProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!canAddMore) return
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) onAdd(dropped)
  }, [canAddMore, onAdd])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (canAddMore) setIsDragging(true)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) onAdd(selected)
    e.target.value = '' // allow re-selecting same file
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Drop Area */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all duration-200 group select-none',
            isDragging
              ? 'border-brand bg-brand/10 scale-[1.01]'
              : 'border-surface-border hover:border-brand/50 hover:bg-surface',
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-brand/20 text-brand' : 'bg-surface text-text-muted group-hover:text-brand group-hover:bg-brand/10',
          )}>
            <CloudUpload className="w-5 h-5" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">
              {isDragging ? 'Dosyayı bırak' : 'Dosya sürükle veya tıkla'}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              PDF, Word, resim • Maks. {maxSizeMB}MB • {files.length}/{maxFiles} dosya
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(file => (
            <FileRow
              key={file.id}
              file={file}
              onRemove={() => onRemove(file.id)}
            />
          ))}
        </div>
      )}

      {/* Max reached notice */}
      {!canAddMore && (
        <p className="text-center text-xs text-text-muted py-2">
          Maksimum dosya sayısına ulaşıldı ({maxFiles}/{maxFiles})
        </p>
      )}
    </div>
  )
}
