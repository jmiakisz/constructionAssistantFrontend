import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProjects } from '../../api/projects'
import { createProject } from '../../api/admin'
import type { Role } from '../../types'

const roleLabel: Record<Role, string> = {
  PODWYKONAWCA: 'Podwykonawca', BRYGADZISTA: 'Brygadzista', INZYNIER: 'Inżynier',
  KOSZTORYSANT: 'Kosztorysant', KIEROWNIK: 'Kierownik', ADMIN: 'Admin', OWNER: 'Owner',
}

export default function ProjectsAdmin() {
  const queryClient = useQueryClient()
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createProject(name.trim(), description.trim())
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setName('')
      setDescription('')
    } catch {
      setError('Nie udało się utworzyć projektu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Projekty</h1>
        <p className="text-sm text-gray-500 mt-1">Zarządzaj projektami i twórz nowe inwestycje</p>
      </div>

      {/* Create */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Nowy projekt</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwa projektu *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="np. Budowa hali ul. Lipowa"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Opis</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Krótki opis inwestycji"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium
                       px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? 'Tworzenie…' : 'Utwórz projekt'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Wszystkie projekty</h2>
          {projects && <span className="text-sm text-gray-400">{projects.length}</span>}
        </div>

        {isLoading && (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-48" />
                <div className="h-4 bg-gray-100 rounded w-32 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {projects && projects.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">Brak projektów</div>
        )}

        {projects && projects.length > 0 && (
          <div className="divide-y divide-gray-100">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-400 truncate">{p.description}</p>}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(p.createdAt).toLocaleDateString('pl-PL')}
                </span>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {roleLabel[p.userRole]}
                </span>
                <span className="text-xs text-gray-400">#{p.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
