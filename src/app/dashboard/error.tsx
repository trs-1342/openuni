'use client'

import Link from 'next/link'

// Dashboard hata sınırı — bir alt sayfadaki (profil, topluluk, admin vb.) render hatası
// yalnızca içerik alanını etkiler, kullanıcıyı boş ekranla baş başa bırakmaz.
export default function DashboardError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-3">😕</div>
        <h1 className="text-xl font-bold mb-2">Bu bölüm yüklenemedi</h1>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          İçerik gösterilirken bir hata oluştu. Yeniden deneyebilirsin.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => reset()} className="btn-primary py-2.5 px-5 text-sm">Yeniden dene</button>
          <Link href="/dashboard" className="btn-secondary py-2.5 px-5 text-sm">Ana sayfa</Link>
        </div>
      </div>
    </div>
  )
}
