import client from './client'
import type { AuthResponse } from '../types'

export const login = (email: string, password: string) =>
  client.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data)
