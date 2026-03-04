// src/app/(static)/layout.tsx
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: { default: 'OpenUni', template: '%s | OpenUni' } }

export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-surface-border glass sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">O</span>
            </div>
            <span className="font-display font-semibold text-text-primary">OpenUni</span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <Link href="/about"   className="hover:text-text-secondary transition-colors">Hakkımızda</Link>
            <Link href="/guide"   className="hover:text-text-secondary transition-colors">Kılavuz</Link>
            <Link href="/privacy" className="hover:text-text-secondary transition-colors">Gizlilik</Link>
            <Link href="/contact" className="hover:text-text-secondary transition-colors">İletişim</Link>
            <Link href="/auth/login" className="btn-primary text-xs px-3 py-1.5">Giriş Yap</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-surface-border py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand flex items-center justify-center">
                <span className="text-white font-bold text-xs">O</span>
              </div>
              <span className="text-sm text-text-muted">OpenUni — IGÜ Öğrenci Platformu</span>
            </div>
            <div className="flex items-center gap-5 text-xs text-text-muted">
              <Link href="/about"   className="hover:text-text-secondary transition-colors">Hakkımızda</Link>
              <Link href="/guide"   className="hover:text-text-secondary transition-colors">Kullanım Kılavuzu</Link>
              <Link href="/privacy" className="hover:text-text-secondary transition-colors">Gizlilik Politikası</Link>
              <Link href="/contact" className="hover:text-text-secondary transition-colors">İletişim</Link>
            </div>
          </div>
          <p className="text-center text-2xs text-text-muted/50 mt-6">
            © {new Date().getFullYear()} OpenUni. Ücretsiz, reklamsız, öğrenciler için.
          </p>
        </div>
      </footer>
    </div>
  )
}
