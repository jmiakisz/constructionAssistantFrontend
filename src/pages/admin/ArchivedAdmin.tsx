import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getArchivedDocuments, adminDeleteDocument } from '../../api/documents'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'przed chwilą'
  if (diff < 60) return `${diff} min temu`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h} godz. temu`
  return `${Math.floor(h / 24)} dni temu`
}

export default function ArchivedAdmin() {
  const queryClient = useQueryClient()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['admin-archived'],
    queryFn: getArchivedDocuments,
  })

  const deleteMut = useMutation({
    mutationFn: adminDeleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-archived'] })
      setConfirmId(null)
    },
  })

  const byProject = docs.reduce<Record<string, typeof docs>>((acc, d) => {
    const key = `${d.projectId}__${d.projectName}`
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Archiwum dokumentów</h1>
        <p className="text-sm text-gray-500 mt-1">
          Zarchiwizowane dokumenty — mogą być trwale usunięte. Nie można ich ponownie przetworzyć.
        </p>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-7 w-24 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && docs.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">Brak zarchiwizowanych dokumentów.</p>
        </div>
      )}

      {!isLoading && docs.length > 0 && (
        <div className="space-y-4">
          {Object.entries(byProject).map(([key, projectDocs]) => {
            const projectName = key.split('__')[1]
            return (
              <div key={key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">{projectName}</span>
                  </div>
                  <span className="text-xs text-gray-400">{projectDocs.length} dok.</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {projectDocs.map((d) => (
                    <div key={d.id} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.documentType} · {timeAgo(d.createdAt)}</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                        Archiwum
                      </span>
                      {confirmId === d.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Na pewno usunąć?</span>
                          <button
                            onClick={() => deleteMut.mutate(d.id)}
                            disabled={deleteMut.isPending}
                            className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            {deleteMut.isPending ? 'Usuwam...' : 'Usuń'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1.5 cursor-pointer"
                          >
                            Anuluj
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(d.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Usuń trwale
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
