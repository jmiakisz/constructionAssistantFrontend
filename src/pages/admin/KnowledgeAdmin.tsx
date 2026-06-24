import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjects } from '../../api/projects'
import {
  getKnowledge, updateKnowledge, deleteKnowledge,
  triggerNightly, triggerKnowledge, triggerKnowledgeSync,
  triggerStyles, triggerStylesSync, triggerCleanup, triggerConsolidate, triggerReprocess,
  type KnowledgeEntry,
} from '../../api/admin'

const CATEGORIES = ['TECHNICZNA', 'FINANSOWA', 'PODWYKONAWCY', 'MATERIALY']
const TYPES = ['PERMANENT', 'TEMPORAL']

const catColor: Record<string, string> = {
  TECHNICZNA: 'bg-blue-50 text-blue-700',
  FINANSOWA: 'bg-amber-50 text-amber-700',
  PODWYKONAWCY: 'bg-purple-50 text-purple-700',
  MATERIALY: 'bg-emerald-50 text-emerald-700',
}

const typeColor: Record<string, string> = {
  PERMANENT: 'bg-gray-100 text-gray-600',
  TEMPORAL: 'bg-orange-50 text-orange-600',
}

type SyncKey = 'nightly' | 'knowledge' | 'knowledge-sync' | 'styles' | 'styles-sync' | 'cleanup' | 'consolidate' | 'reprocess'
type SyncStatus = { loading: boolean; result?: string; error?: string }

const SYNC_BUTTONS: { key: SyncKey; label: string; desc: string; fn: () => Promise<any> }[] = [
  { key: 'nightly',       label: 'Pełny nightly',          desc: 'Wiedza + style razem',             fn: triggerNightly },
  { key: 'knowledge',     label: 'Wiedza (async)',          desc: 'Nowe wpisy z wiadomości',          fn: triggerKnowledge },
  { key: 'knowledge-sync',label: 'Wiedza (sync)',           desc: 'Synchronicznie — zwraca czas',     fn: triggerKnowledgeSync },
  { key: 'styles',        label: 'Style (async)',           desc: 'Konsoliduje styl użytkowników',    fn: triggerStyles },
  { key: 'styles-sync',   label: 'Style (sync)',            desc: 'Synchronicznie',                   fn: triggerStylesSync },
  { key: 'cleanup',       label: 'Wyczyść przestarzałe',   desc: 'Usuwa przeterminowane TEMPORAL',   fn: triggerCleanup },
  { key: 'consolidate',   label: 'Konsoliduj duplikaty',   desc: 'Scal podobne wpisy (weekly)',      fn: triggerConsolidate },
  { key: 'reprocess',     label: 'Reprocess wiad.',         desc: 'Reset flagi przetworzenia 90 dni', fn: () => triggerReprocess(90) },
]

const INITIAL_SYNC: Record<SyncKey, SyncStatus> = {
  nightly: { loading: false }, knowledge: { loading: false }, 'knowledge-sync': { loading: false },
  styles: { loading: false }, 'styles-sync': { loading: false }, cleanup: { loading: false },
  consolidate: { loading: false }, reprocess: { loading: false },
}

export default function KnowledgeAdmin() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')

  const [editId, setEditId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [syncStatus, setSyncStatus] = useState<Record<SyncKey, SyncStatus>>(INITIAL_SYNC)

  const { data: knowledge = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-knowledge'],
    queryFn: getKnowledge,
    staleTime: 0,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateKnowledge>[1] }) =>
      updateKnowledge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge'] })
      setEditId(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge'] })
      setDeleteId(null)
    },
  })

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name])),
    [projects],
  )

  const projectsInKnowledge = useMemo(() => {
    const pids = new Set(knowledge.map(k =>
      k.projectId === 'null' || k.projectId == null ? 'company' : String(k.projectId)
    ))
    return [...pids]
  }, [knowledge])

  const filtered = useMemo(() => knowledge.filter(k => {
    if (search && !k.content.toLowerCase().includes(search.toLowerCase())) return false
    if (filterProject) {
      const pid = k.projectId === 'null' || k.projectId == null ? 'company' : String(k.projectId)
      if (pid !== filterProject) return false
    }
    if (filterCategory && k.category !== filterCategory) return false
    if (filterType && k.entryType !== filterType) return false
    return true
  }), [knowledge, search, filterProject, filterCategory, filterType])

  const handleSync = async (key: SyncKey, fn: () => Promise<any>) => {
    setSyncStatus(prev => ({ ...prev, [key]: { loading: true } }))
    try {
      const res = await fn()
      const label = res.durationMs != null
        ? `OK (${res.durationMs}ms)`
        : res.reset != null
          ? `Reset: ${res.reset} wiad.`
          : 'Zaakceptowano'
      setSyncStatus(prev => ({ ...prev, [key]: { loading: false, result: label } }))
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge'] })
    } catch {
      setSyncStatus(prev => ({ ...prev, [key]: { loading: false, error: 'Błąd!' } }))
    }
  }

  const startEdit = (entry: KnowledgeEntry) => {
    setEditId(entry.id)
    setEditContent(entry.content)
    setEditCategory(entry.category ?? '')
    setDeleteId(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Wiedza AI</h1>
          <p className="text-sm text-gray-500 mt-1">Baza wiedzy agenta i triggery nocnych synchronizacji</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200
                     hover:bg-gray-50 disabled:opacity-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Odśwież
        </button>
      </div>

      {/* Sync section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Synchronizacje</h2>
        <div className="grid grid-cols-4 gap-3">
          {SYNC_BUTTONS.map(({ key, label, desc, fn }) => {
            const s = syncStatus[key]
            return (
              <div key={key} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                {s.result && <p className="text-xs font-medium text-emerald-600">{s.result}</p>}
                {s.error && <p className="text-xs font-medium text-red-500">{s.error}</p>}
                <button
                  onClick={() => handleSync(key, fn)}
                  disabled={s.loading}
                  className="mt-auto text-xs font-medium text-white bg-blue-600 hover:bg-blue-700
                             disabled:bg-blue-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer
                             disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {s.loading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Czekaj…
                    </>
                  ) : 'Uruchom'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Knowledge table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Baza wiedzy</h2>
            {!isLoading && (
              <span className="text-sm text-gray-400">{filtered.length} / {knowledge.length}</span>
            )}
          </div>
          <div className="flex gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj w treści…"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wszystkie projekty</option>
              <option value="company">Firmowa</option>
              {projectsInKnowledge
                .filter(p => p !== 'company')
                .map(pid => (
                  <option key={pid} value={pid}>
                    {projectMap[Number(pid)] ?? `#${pid}`}
                  </option>
                ))}
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kategoria</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Typ</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="h-7 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Brak wpisów</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(entry => {
              const projectName =
                entry.projectId === 'null' || entry.projectId == null
                  ? 'Firmowa'
                  : projectMap[Number(entry.projectId)] ?? `#${entry.projectId}`
              const isCompany = entry.projectId === 'null' || entry.projectId == null
              const isEditing = editId === entry.id
              const isConfirmDelete = deleteId === entry.id

              return (
                <div
                  key={entry.id}
                  className={`px-6 py-4 transition-colors ${isEditing ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white
                                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">— kategoria —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button
                          onClick={() => updateMut.mutate({ id: entry.id, data: { content: editContent, category: editCategory } })}
                          disabled={updateMut.isPending || !editContent.trim()}
                          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                                     disabled:bg-blue-300 px-4 py-1.5 rounded-lg transition-colors cursor-pointer
                                     disabled:cursor-not-allowed"
                        >
                          {updateMut.isPending ? 'Zapisuję…' : 'Zapisz'}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5
                                     rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        >
                          Anuluj
                        </button>
                        <span className="text-xs text-gray-400 ml-auto">{editContent.length}/500 znaków</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-relaxed">{entry.content}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {entry.category && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor[entry.category] ?? 'bg-gray-100 text-gray-600'}`}>
                              {entry.category}
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[entry.entryType] ?? 'bg-gray-100 text-gray-600'}`}>
                            {entry.entryType}
                          </span>
                          {entry.sourceRole && (
                            <span className="text-xs text-gray-400">{entry.sourceRole}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {isCompany ? '🏢 Firmowa' : `📁 ${projectName}`}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">pewność: {entry.confidence}</span>
                          {entry.validUntil && (
                            <>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-amber-500">
                                ważny do: {new Date(entry.validUntil).toLocaleDateString('pl-PL')}
                              </span>
                            </>
                          )}
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.createdAt).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                      </div>

                      {isConfirmDelete ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-red-600 font-medium">Usunąć?</span>
                          <button
                            onClick={() => deleteMut.mutate(entry.id)}
                            disabled={deleteMut.isPending}
                            className="text-xs font-medium text-white bg-red-500 hover:bg-red-600
                                       px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Tak
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700
                                       px-2.5 py-1 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                          >
                            Nie
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                                       rounded-lg transition-colors cursor-pointer"
                            title="Edytuj"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setDeleteId(entry.id); setEditId(null) }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50
                                       rounded-lg transition-colors cursor-pointer"
                            title="Usuń"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
