'use client'

import { useState, useCallback } from 'react'
import { formatFileSize } from '@/lib/utils'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview?: string       // object URL for images
  progress: number       // 0-100
  status: UploadStatus
  error?: string
  // Firebase'den dönecek — şimdilik boş
  url?: string
}

const ALLOWED_TYPES: Record<string, string[]> = {
  pdf:   ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  doc:   [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
}

const MAX_SIZE_MB = 25
const MAX_FILES   = 5

function detectType(file: File): 'pdf' | 'image' | 'doc' | 'other' {
  if (ALLOWED_TYPES.pdf.includes(file.type))   return 'pdf'
  if (ALLOWED_TYPES.image.includes(file.type)) return 'image'
  if (ALLOWED_TYPES.doc.includes(file.type))   return 'doc'
  return 'other'
}

function validate(file: File): string | null {
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `Dosya boyutu ${MAX_SIZE_MB}MB'ı geçemez (${formatFileSize(file.size)})`
  const allAllowed = Object.values(ALLOWED_TYPES).flat()
  if (!allAllowed.includes(file.type))
    return `Desteklenmeyen dosya türü: ${file.type || 'bilinmiyor'}`
  return null
}

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const addFiles = useCallback((incoming: File[]) => {
    const newEntries: UploadedFile[] = []

    for (const file of incoming) {
      if (files.length + newEntries.length >= MAX_FILES) break

      const error = validate(file)
      const id    = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const type  = detectType(file)
      const preview = type === 'image' ? URL.createObjectURL(file) : undefined

      newEntries.push({
        id, file, name: file.name, size: file.size,
        type, preview,
        progress: error ? 0 : 0,
        status:   error ? 'error' : 'idle',
        error:    error ?? undefined,
      })
    }

    setFiles(prev => [...prev, ...newEntries])

    // Simulate upload progress for valid files
    newEntries
      .filter(f => f.status === 'idle')
      .forEach(entry => simulateUpload(entry.id))
  }, [files.length])

  function simulateUpload(id: string) {
    // Bu fonksiyon Firebase Storage entegrasyonunda
    // gerçek uploadBytesResumable ile değiştirilecek
    let progress = 0
    setFiles(prev =>
      prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f)
    )

    const interval = setInterval(() => {
      progress += Math.random() * 18 + 8
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles(prev =>
          prev.map(f =>
            f.id === id
              ? { ...f, progress: 100, status: 'done', url: `https://storage.example.com/${id}` }
              : f
          )
        )
      } else {
        setFiles(prev =>
          prev.map(f => f.id === id ? { ...f, progress } : f)
        )
      }
    }, 120)
  }

  function removeFile(id: string) {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  function reset() {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setFiles([])
  }

  const allDone    = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const hasErrors  = files.some(f => f.status === 'error')
  const isUploading = files.some(f => f.status === 'uploading')
  const validFiles = files.filter(f => f.status === 'done')
  const canAddMore = files.length < MAX_FILES

  return {
    files, addFiles, removeFile, reset,
    allDone, hasErrors, isUploading, validFiles, canAddMore,
    maxFiles: MAX_FILES, maxSizeMB: MAX_SIZE_MB,
  }
}
