'use client'

import { useEffect, useCallback, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LightboxImage {
  url:  string
  name: string
}

interface LightboxProps {
  images:     LightboxImage[]
  startIndex: number
  onClose:    () => void
}

export function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(startIndex)
  const [zoomed,  setZoomed]  = useState(false)

  const prev = useCallback(() => {
    setZoomed(false)
    setCurrent(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  const next = useCallback(() => {
    setZoomed(false)
    setCurrent(i => (i + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   prev()
      if (e.key === 'ArrowRight')  next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  const img = images[current]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <p className="text-sm text-white/80 font-medium truncate max-w-[200px] sm:max-w-xs">{img.name}</p>
          {images.length > 1 && (
            <span className="text-xs text-white/50 shrink-0">{current + 1} / {images.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomed(z => !z)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title={zoomed ? 'Küçült' : 'Büyüt'}
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          <a
            href={img.url}
            download={img.name}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="İndir"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Kapat (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ana resim */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-16">
        <img
          key={img.url}
          src={img.url}
          alt={img.name}
          onClick={() => setZoomed(z => !z)}
          className={cn(
            'max-h-[85vh] rounded-lg shadow-2xl select-none transition-all duration-200',
            zoomed
              ? 'max-w-none w-auto cursor-zoom-out scale-150'
              : 'max-w-full object-contain cursor-zoom-in'
          )}
          draggable={false}
        />
      </div>

      {/* Önceki / Sonraki */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-2 z-10 p-2.5 rounded-xl bg-black/40 border border-white/10 text-white hover:bg-black/70 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-2 z-10 p-2.5 rounded-xl bg-black/40 border border-white/10 text-white hover:bg-black/70 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Thumbnail bar */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setZoomed(false); setCurrent(i) }}
              className={cn(
                'w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                i === current ? 'border-brand scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
              )}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
