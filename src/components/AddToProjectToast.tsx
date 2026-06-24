import { useState } from 'react'
import client from '../api/client'

interface Props {
  files: File[]
  projectId: number
  onDismiss: () => void
}

export default function AddToProjectToast({ files, projectId, onDismiss }: Props) {
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const label = files.length === 1
    ? files[0].name
    : `${files.length} pliki/plików`

  const handleAdd = async () => {
    setState('uploading')
    try {
      await Promise.all(
        files.map((file) => {
          const formData = new FormData()
          formData.append('file', file)
          return client.post(`/projects/${projectId}/documents`, formData)
        })
      )
      setState('done')
      setTimeout(onDismiss, 2000)
    } catch {
      setState('error')
    }
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {state === 'idle' && (
            <>
              <p className="text-sm font-medium truncate">{label}</p>
              <p className="text-xs text-gray-400">Dodać też do dokumentów projektu?</p>
            </>
          )}
          {state === 'uploading' && <p className="text-sm text-gray-300">Dodawanie do projektu…</p>}
          {state === 'done'     && <p className="text-sm text-emerald-400">Dodano do projektu</p>}
          {state === 'error'    && <p className="text-sm text-red-400">Nie udało się dodać</p>}
        </div>

        {state === 'idle' && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleAdd}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
              Tak
            </button>
            <span className="text-gray-600">·</span>
            <button onClick={onDismiss}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
              Nie
            </button>
          </div>
        )}

        {state === 'error' && (
          <button onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
