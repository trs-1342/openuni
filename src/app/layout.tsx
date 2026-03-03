import type { Metadata } from 'next'
import { Inter, Syne, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'OpenUni — Üniversite Topluluk Platformu',
    template: '%s | OpenUni',
  },
  description:
    'İstanbul Gelişim Üniversitesi öğrencileri için düzenli topluluk platformu. Duyurular, akademik destek, kaynak arşivi ve daha fazlası.',
  keywords: ['üniversite', 'öğrenci', 'topluluk', 'platform', 'gelişim üniversitesi'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${syne.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background text-text-primary font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
