import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocumentAlerts, getProjectAlerts, reprocessDocument } from '../api/documents'
import DocumentPreviewModal from './DocumentPreviewModal'
import type { DocumentResponse } from '../types'

interface Props {
  projectId: number
  doc: DocumentResponse
  onClose: () => void
}

const levelColor: Record<string, string> = {
  ERROR:   'bg-red-50 text-red-700 border-red-200',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
  INFO:    'bg-blue-50 text-blue-700 border-blue-200',
}

const levelIcon: Record<string, string> = {
  ERROR:   '🔴',
  WARNING: '⚠️',
  INFO:    'ℹ️',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'przed chwilą'
  if (diff < 60) return `${diff} min temu`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h} godz. temu`
  return `${Math.floor(h / 24)} dni temu`
}

function ExtractedDataSection({ doc }: { doc: DocumentResponse }) {
  if (!doc.extractedData) {
    return (
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Analiza AI</h3>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
          {doc.status === 'PROCESSING' || doc.status === 'PENDING'
            ? 'Dokument jest jeszcze przetwarzany...'
            : doc.aiIndexingMode === 'NONE'
              ? 'Dokument w trybie archiwum — brak analizy AI.'
              : 'Brak danych z analizy.'}
        </div>
      </section>
    )
  }

  let parsed: { extracted_data?: Record<string, unknown>; wewnetrzne_niespojnosci?: string[]; ryzyka?: string[] } = {}
  try { parsed = JSON.parse(doc.extractedData) } catch { /* raw fallback */ }

  const fields = parsed.extracted_data
  const niespojnosci = parsed.wewnetrzne_niespojnosci ?? []
  const ryzyka = parsed.ryzyka ?? []

  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Analiza AI</h3>

      {fields && Object.keys(fields).length > 0 && (
        <div className="bg-gray-50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(fields).map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-500 w-2/5 capitalize">
                    {k.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    {Array.isArray(v) ? v.join(', ') : String(v ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {niespojnosci.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-600 mb-1.5">Wewnętrzne niespójności</p>
          <ul className="space-y-1">
            {niespojnosci.map((n, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 bg-amber-50 rounded-lg px-3 py-2">
                <span className="shrink-0 text-amber-500">⚠</span>{n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ryzyka.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 mb-1.5">Ryzyka</p>
          <ul className="space-y-1">
            {ryzyka.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 bg-red-50 rounded-lg px-3 py-2">
                <span className="shrink-0 text-red-500">●</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function DocumentDetailModal({ projectId, doc, onClose }: Props) {
  const [showFilePreview, setShowFilePreview] = useState(false)
  const queryClient = useQueryClient()

  const reprocessMut = useMutation({
    mutationFn: () => reprocessDocument(projectId, doc.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  })

  const { data: docAlerts = [] } = useQuery({
    queryKey: ['alerts', projectId, doc.id],
    queryFn: () => getDocumentAlerts(projectId, doc.id),
    staleTime: 60_000,
  })

  const { data: projectAlerts = [] } = useQuery({
    queryKey: ['alerts', projectId, 'project'],
    queryFn: () => getProjectAlerts(projectId),
    staleTime: 60_000,
    select: (data) => data.filter((a) => a.documentId === null),
  })

  const statusLabel: Record<string, string> = {
    PENDING: 'Oczekuje', PROCESSING: 'Przetwarzanie', DONE: 'Gotowy', ERROR: 'Błąd',
  }
  const statusColor: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-500',
    PROCESSING: 'bg-blue-50 text-blue-600',
    DONE: 'bg-emerald-50 text-emerald-700',
    ERROR: 'bg-red-50 text-red-600',
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{doc.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[doc.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {statusLabel[doc.status] ?? doc.status}
                </span>
                <span className="text-xs text-gray-400">{doc.documentType}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {doc.status === 'ERROR' && (
                <button
                  onClick={() => reprocessMut.mutate()}
                  disabled={reprocessMut.isPending}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50
                             hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {reprocessMut.isPending ? 'Wysyłanie...' : 'Przetwórz ponownie'}
                </button>
              )}
              <button
                onClick={() => setShowFilePreview(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 bg-indigo-50
                           hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Podgląd pliku
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
                           hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* Alerts */}
            {docAlerts.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Alerty ({docAlerts.length})
                </h3>
                <div className="space-y-2">
                  {docAlerts.map((a) => (
                    <div key={a.id}
                      className={`flex gap-3 p-3 rounded-xl border text-sm ${levelColor[a.level] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      <span className="shrink-0 text-base leading-5">{levelIcon[a.level] ?? '•'}</span>
                      <div className="flex-1 min-w-0">
                        <p>{a.message}</p>
                        <p className="text-xs opacity-60 mt-0.5">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Project-level alerts (cross-analysis) */}
            {projectAlerts.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Alerty projektowe (cross-analiza)
                </h3>
                <div className="space-y-2">
                  {projectAlerts.map((a) => (
                    <div key={a.id}
                      className={`flex gap-3 p-3 rounded-xl border text-sm ${levelColor[a.level] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      <span className="shrink-0 text-base leading-5">{levelIcon[a.level] ?? '•'}</span>
                      <div className="flex-1 min-w-0">
                        <p>{a.message}</p>
                        <p className="text-xs opacity-60 mt-0.5">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Extracted data */}
            <ExtractedDataSection doc={doc} />
          </div>
        </div>
      </div>

      {showFilePreview && (
        <DocumentPreviewModal
          projectId={projectId}
          doc={doc}
          onClose={() => setShowFilePreview(false)}
        />
      )}
    </>
  )
}
