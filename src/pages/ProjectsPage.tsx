import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getProjects } from '../api/projects'
import { useAuthStore } from '../store/authStore'
import type { ProjectResponse, Role } from '../types'

const roleLabel: Record<Role, string> = {
  PODWYKONAWCA: 'Podwykonawca',
  BRYGADZISTA: 'Brygadzista',
  INZYNIER: 'Inżynier',
  KOSZTORYSANT: 'Kosztorysant',
  KIEROWNIK: 'Kierownik',
  ADMIN: 'Admin',
  OWNER: 'Owner',
}

const roleColor: Record<Role, string> = {
  PODWYKONAWCA: 'bg-gray-100 text-gray-600',
  BRYGADZISTA:  'bg-blue-50 text-blue-700',
  INZYNIER:     'bg-indigo-50 text-indigo-700',
  KOSZTORYSANT: 'bg-purple-50 text-purple-700',
  KIEROWNIK:    'bg-amber-50 text-amber-700',
  ADMIN:        'bg-orange-50 text-orange-700',
  OWNER:        'bg-emerald-50 text-emerald-700',
}

function ProjectCard({ project }: { project: ProjectResponse }) {
  const date = new Date(project.createdAt).toLocaleDateString('pl-PL', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 p-6
                 hover:border-blue-300 hover:shadow-md transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColor[project.userRole]}`}>
          {roleLabel[project.userRole]}
        </span>
      </div>

      <h2 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-blue-600 transition-colors">
        {project.name}
      </h2>

      {project.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{project.description}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-auto">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Założono {date}
      </div>
    </Link>
  )
}

export default function ProjectsPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  const isAdmin = user?.companyRole === 'ADMIN' || user?.companyRole === 'OWNER'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Construction Assistant</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name ?? user?.email}</span>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Moje projekty</h1>
          <p className="text-sm text-gray-500 mt-1">
            Projekty, do których masz dostęp
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Nie udało się pobrać projektów.
          </div>
        )}

        {projects && projects.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="text-sm">Nie masz jeszcze dostępu do żadnego projektu.</p>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
