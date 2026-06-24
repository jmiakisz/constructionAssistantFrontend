import { useQuery } from '@tanstack/react-query'
import { getDocuments } from '../api/documents'
import type { DocumentResponse, DocumentType } from '../types'

const docTypeLabel: Record<DocumentType, string> = {
  UMOWA_INWESTOR:     'Umowa inwestor',
  UMOWA_PODWYKONAWCA: 'Umowa podwykonawca',
  KOSZTORYS:          'Kosztorys',
  HARMONOGRAM:        'Harmonogram',
  PROJEKT_WYKONAWCZY: 'Projekt wykonawczy',
  SWZ:                'SWZ',
  FAKTURA:            'Faktura',
  INNE:               'Inne',
}

interface Props {
  projectId: number
  onClose: () => void
  onSelectExisting: (doc: DocumentResponse) => void
  // kept for backward compat, unused
  tab?: string
  onTabChange?: (tab: 'upload' | 'project') => void
  onFileSelected?: (file: File) => void
}

export default function DocumentPickerModal({ projectId, onClose, onSelectExisting }: Props) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => getDocuments(projectId),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 className="font-semibold text-gray-900">Dodaj dokument z projektu</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {isLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {documents && documents.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Brak dokumentów w tym projekcie</p>
            </div>
          )}

          {documents && documents.length > 0 && (
            <div className="space-y-1">
              {documents.map((doc) => (
                <button key={doc.id}
                  onClick={() => { onSelectExisting(doc); onClose() }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50
                             transition-colors text-left cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-400">{docTypeLabel[doc.documentType]}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
