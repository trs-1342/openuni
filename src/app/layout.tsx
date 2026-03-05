import React, { type ReactNode } from 'react'
import type { Metadata } from 'next'
import { Inter, Syne, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
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
  description: 'İstanbul Gelişim Üniversitesi öğrencileri için düzenli topluluk platformu. Duyurular, akademik destek, kaynak arşivi ve daha fazlası.',
  keywords: ['üniversite', 'öğrenci', 'topluluk', 'platform', 'gelişim üniversitesi'],
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${syne.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-text-primary font-sans antialiased">
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          try {
            var t = JSON.parse(localStorage.getItem('openuni-theme') || '{}');
            var theme = t.state && t.state.theme ? t.state.theme : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
          } catch(e) {
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        })();
      `}} />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
