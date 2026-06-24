import { useEffect, useRef, useState } from 'react'
import { fetchDocumentPreviewBlob, downloadDocument } from '../api/documents'
import type { DocumentResponse } from '../types'

interface Props {
  projectId: number
  doc: DocumentResponse
  onClose: () => void
}

export default function DocumentPreviewModal({ projectId, doc, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    fetchDocumentPreviewBlob(projectId, doc.id)
      .then(({ url, mimeType: mt }) => {
        urlRef.current = url
        setBlobUrl(url)
        setMimeType(mt)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))

    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [projectId, doc.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const isPdf   = mimeType.includes('pdf')
  const isImage = mimeType.startsWith('image/')

  const handleDownload = () => downloadDocument(projectId, doc)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           style={{ width: '90vw', height: '90vh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{mimeType || '—'}</p>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50
                       hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Pobierz
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm">Nie udało się załadować podglądu</p>
              <button onClick={handleDownload}
                className="text-sm text-blue-600 hover:underline cursor-pointer">
                Pobierz plik
              </button>
            </div>
          )}

          {!loading && !error && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title={doc.name}
              className="w-full h-full border-0"
            />
          )}

          {!loading && !error && blobUrl && isImage && (
            <div className="flex items-center justify-center h-full p-8">
              <img
                src={blobUrl}
                alt={doc.name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
              />
            </div>
          )}

          {!loading && !error && blobUrl && !isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
              <svg className="w-14 h-14 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-600">Podgląd niedostępny dla tego formatu</p>
              <p className="text-xs text-gray-400">{mimeType}</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600
                           hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Pobierz plik
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
