'use client'

import React, { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore()

  // Tema değişince anında uygula - useEffect beklemeden
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
