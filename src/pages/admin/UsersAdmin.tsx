import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProjects } from '../../api/projects'
import { getUsers, createUser, assignMember } from '../../api/admin'
import type { Role } from '../../types'

const ALL_ROLES: Role[] = ['PODWYKONAWCA', 'BRYGADZISTA', 'INZYNIER', 'KOSZTORYSANT', 'KIEROWNIK', 'ADMIN', 'OWNER']
const roleLabel: Record<Role, string> = {
  PODWYKONAWCA: 'Podwykonawca', BRYGADZISTA: 'Brygadzista', INZYNIER: 'Inżynier',
  KOSZTORYSANT: 'Kosztorysant', KIEROWNIK: 'Kierownik', ADMIN: 'Admin', OWNER: 'Owner',
}
const companyRoleColor: Record<string, string> = {
  OWNER: 'bg-emerald-50 text-emerald-700',
  ADMIN: 'bg-orange-50 text-orange-700',
  MEMBER: 'bg-gray-100 text-gray-600',
}

export default function UsersAdmin() {
  const queryClient = useQueryClient()
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['admin-users'], queryFn: getUsers })

  // Create user
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)

  // Assign
  const [assignUserId, setAssignUserId] = useState('')
  const [assignProjectId, setAssignProjectId] = useState('')
  const [assignRole, setAssignRole] = useState<Role>('INZYNIER')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignDone, setAssignDone] = useState(false)

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreatedId(null)
    try {
      const data = await createUser(email, password, name)
      setCreatedId(data.userId)
      setAssignUserId(String(data.userId))
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEmail('')
      setPassword('')
      setName('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCreateError(msg ?? 'Nie udało się utworzyć konta.')
    } finally {
      setCreating(false)
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignUserId || !assignProjectId) return
    setAssigning(true)
    setAssignError(null)
    setAssignDone(false)
    try {
      await assignMember(Number(assignProjectId), Number(assignUserId), assignRole)
      setAssignDone(true)
      setAssignProjectId('')
    } catch {
      setAssignError('Nie udało się przypisać użytkownika.')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Użytkownicy</h1>
        <p className="text-sm text-gray-500 mt-1">Twórz konta i przydzielaj dostępy do projektów</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Create user */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Nowe konto</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię i nazwisko *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jan Kowalski"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jan@firma.pl"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hasło tymczasowe *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 znaków"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {createError && <p className="text-sm text-red-500">{createError}</p>}
            {createdId && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3.5 py-2.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Konto utworzone — ID użytkownika: <strong>{createdId}</strong>
              </div>
            )}

            <button type="submit" disabled={creating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed">
              {creating ? 'Tworzenie…' : 'Utwórz konto'}
            </button>
          </form>
        </div>

        {/* Assign to project */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Przydziel do projektu</h2>
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Użytkownik *</label>
              <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="">Wybierz użytkownika…</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Projekt *</label>
              <select value={assignProjectId} onChange={(e) => setAssignProjectId(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="">Wybierz projekt…</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rola w projekcie *</label>
              <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabel[r]}</option>
                ))}
              </select>
            </div>

            {assignError && <p className="text-sm text-red-500">{assignError}</p>}
            {assignDone && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3.5 py-2.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Użytkownik przypisany do projektu
              </div>
            )}

            <button type="submit" disabled={assigning || !assignUserId || !assignProjectId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed">
              {assigning ? 'Przypisywanie…' : 'Przypisz użytkownika'}
            </button>
          </form>
        </div>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Wszyscy użytkownicy</h2>
          {users && <span className="text-sm text-gray-400">{users.length}</span>}
        </div>

        {usersLoading && (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {users && users.length > 0 && (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-600">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${companyRoleColor[u.companyRole] ?? 'bg-gray-100 text-gray-600'}`}>
                  {u.companyRole}
                </span>
                <button
                  onClick={() => setAssignUserId(String(u.id))}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                >
                  Przydziel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
