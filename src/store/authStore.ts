import { create } from 'zustand'
import type { User as FirebaseUser } from 'firebase/auth'

interface AuthState {
  user: FirebaseUser | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: FirebaseUser | null) => void
  setLoading: (v: boolean) => void
  setInitialized: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setLoading: (v) => set({ isLoading: v }),
  setInitialized: () => set({ isInitialized: true, isLoading: false }),
  reset: () => set({ user: null, isLoading: false }),
}))
