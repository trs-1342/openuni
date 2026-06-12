'use client'

import Link from 'next/link'

// Uygulama segmenti hata sınırı — bir sayfadaki render hatası tüm siteyi çökertmesin.
export default function AppError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h1 className="text-xl font-bold mb-2">Bir şeyler ters gitti</h1>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Bu sayfa yüklenirken beklenmedik bir hata oluştu. Tekrar deneyebilir ya da ana sayfaya dönebilirsin.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => reset()} className="btn-primary py-2.5 px-5 text-sm">Yeniden dene</button>
          <Link href="/dashboard" className="btn-secondary py-2.5 px-5 text-sm">Ana sayfa</Link>
        </div>
      </div>
    </div>
  )
}
