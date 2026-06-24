import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadDocuments } from '../api/documents'
import type { AiIndexingMode } from '../api/documents'
import { getFolders } from '../api/folders'
import type { DocumentType, Role } from '../types'

interface Props {
  projectId: number
  onClose: () => void
}

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'INNE',               label: 'Inne' },
  { value: 'UMOWA_INWESTOR',     label: 'Umowa inwestor' },
  { value: 'UMOWA_PODWYKONAWCA', label: 'Umowa podwykonawca' },
  { value: 'KOSZTORYS',          label: 'Kosztorys' },
  { value: 'HARMONOGRAM',        label: 'Harmonogram' },
  { value: 'PROJEKT_WYKONAWCZY', label: 'Projekt wykonawczy' },
  { value: 'SWZ',                label: 'SWZ' },
  { value: 'FAKTURA',            label: 'Faktura' },
]

const AI_MODES: { value: AiIndexingMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'FULL',
    label: 'Pełne AI',
    desc: 'ekstrakcja danych + wyszukiwanie w czacie',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    value: 'CHUNKS_ONLY',
    label: 'Tylko wyszukiwanie',
    desc: 'fragmenty do kontekstu AI w czacie',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    value: 'NONE',
    label: 'Tylko archiwum',
    desc: 'poufne — bez przetwarzania przez AI',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
]

const ACCESS_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'PODWYKONAWCA', label: 'Wszyscy',             desc: 'każdy uczestnik projektu' },
  { value: 'BRYGADZISTA',  label: 'Brygadzista i wyżej', desc: 'brygadzista, inżynier, kierownik…' },
  { value: 'INZYNIER',     label: 'Inżynier i wyżej',    desc: 'inżynier, kosztorysant, kierownik…' },
  { value: 'KIEROWNIK',    label: 'Kierownik i wyżej',   desc: 'kierownik, admin, właściciel' },
  { value: 'ADMIN',        label: 'Admin / Właściciel',  desc: 'tylko admin i właściciel' },
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadDocumentModal({ projectId, onClose }: Props) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [docType, setDocType] = useState<DocumentType>('INNE')
  const [aiMode, setAiMode] = useState<AiIndexingMode>('CHUNKS_ONLY')
  const [minRole, setMinRole] = useState<Role>('PODWYKONAWCA')
  const [folderId, setFolderId] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => getFolders(projectId),
  })

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => uploadDocuments(projectId, files, docType, minRole, aiMode, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
      onClose()
    },
  })

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const newFiles = Array.from(incoming)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...newFiles.filter((f) => !existing.has(f.name + f.size))]
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900">Dodaj dokumenty</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-5">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
              ${dragging
                ? 'border-blue-400 bg-blue-50'
                : files.length > 0
                  ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <svg className="w-7 h-7 text-gray-300 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-500">
              {files.length > 0
                ? <><span className="text-blue-600 font-medium">Dodaj kolejne pliki</span> lub przeciągnij</>
                : <>Przeciągnij pliki lub <span className="text-blue-600 font-medium">wybierz z dysku</span></>
              }
            </p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, Word, Excel, obrazy — do 100 MB każdy</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {files.length === 1 ? '1 plik' : `${files.length} pliki/plików`}
                  <span className="ml-1.5 font-normal text-gray-400">· {formatBytes(totalSize)}</span>
                </p>
                {files.length > 1 && (
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Usuń wszystkie
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div key={i}
                    className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg group"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="flex-1 text-sm text-gray-700 truncate">{f.name}</p>
                    <span className="text-xs text-gray-400 shrink-0">{formatBytes(f.size)}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="w-5 h-5 rounded flex items-center justify-center text-gray-300
                                 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Folder */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Folder
            </label>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value === '' ? null : Number(e.target.value))}
              disabled={folders.length === 0}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white
                         text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                         cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              <option value="">{folders.length === 0 ? 'Brak folderów — najpierw utwórz folder' : 'Bez folderu (root)'}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Document type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Typ dokumentu
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white
                         text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                         cursor-pointer"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* AI indexing mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Przetwarzanie AI
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AI_MODES.map((mode) => {
                const selected = aiMode === mode.value
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setAiMode(mode.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center
                                transition-colors cursor-pointer
                                ${selected
                                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                                }`}
                  >
                    <span className={selected ? 'text-blue-600' : 'text-gray-400'}>{mode.icon}</span>
                    <span className="text-xs font-semibold leading-tight">{mode.label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{mode.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Access control */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Kto może zobaczyć
            </label>
            <div className="space-y-1.5">
              {ACCESS_OPTIONS.map((opt) => {
                const selected = minRole === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMinRole(opt.value)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left
                                transition-colors cursor-pointer
                                ${selected
                                  ? 'border-blue-400 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                                    ${selected ? 'border-blue-500' : 'border-gray-300'}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {isError && (
            <p className="text-xs text-red-500 text-center">Nie udało się dodać dokumentów. Spróbuj ponownie.</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
                         hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => mutate()}
              disabled={files.length === 0 || isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         rounded-xl transition-colors cursor-pointer"
            >
              {isPending
                ? 'Dodawanie…'
                : files.length <= 1
                  ? 'Dodaj dokument'
                  : `Dodaj ${files.length} pliki/plików`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
