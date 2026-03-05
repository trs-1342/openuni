'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'darker' | 'light' | 'pink'

export const THEMES: { id: Theme; label: string; emoji: string; preview: string[] }[] = [
  { id: 'dark',   label: 'Koyu',        emoji: '🌙', preview: ['#131929', '#1E2535', '#4F7EF7'] },
  { id: 'darker', label: 'Siyah',       emoji: '⚫', preview: ['#080B0F', '#10151E', '#4F7EF7'] },
  { id: 'light',  label: 'Açık',        emoji: '☀️', preview: ['#F0F4FF', '#FFFFFF', '#3D6FE8'] },
  { id: 'pink',   label: 'Açık Pembe',  emoji: '🌸', preview: ['#FFF0F5', '#FFFFFF', '#E05A8A'] },
]

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        // Anında DOM'a uygula - useEffect beklemeden
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme)
        }
        set({ theme })
      },
    }),
    {
      name: 'openuni-theme',
      onRehydrateStorage: () => (state) => {
        // localStorage'dan yüklenince de anında uygula
        if (state && typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
    }
  )
)
