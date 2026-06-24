import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse } from '../types'

interface AuthState {
  token: string | null
  user: Omit<AuthResponse, 'token'> | null
  login: (data: AuthResponse) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: ({ token, ...user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'coass-auth' }
  )
)
