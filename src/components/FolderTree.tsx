import { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocuments, downloadDocument, deleteDocument, archiveDocument } from '../api/documents'
import DocumentPreviewModal from './DocumentPreviewModal'
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveDocumentToFolder,
} from '../api/folders'
import type { FolderResponse } from '../api/folders'
import type { DocumentResponse, DocumentType, Role } from '../types'

// ─── types ────────────────────────────────────────────────────────────────────

interface FolderNode extends FolderResponse {
  children: FolderNode[]
  documents: DocumentResponse[]
}

type DragItem =
  | { type: 'doc'; id: number; folderId: number | null }
  | { type: 'folder'; id: number }

interface TreeCtx {
  projectId: number
  tree: FolderNode[]
  // expand
  expanded: Set<number>
  toggle: (id: number) => void
  // create
  creatingIn: number | null | false
  newName: string
  setNewName: (v: string) => void
  startCreate: (parentId: number | null) => void
  confirmCreate: () => void
  cancelCreate: () => void
  // rename
  renamingId: number | null
  renameVal: string
  setRenameVal: (v: string) => void
  startRename: (id: number, name: string) => void
  confirmRename: () => void
  cancelRename: () => void
  // delete folder
  requestDelete: (id: number) => void
  // delete doc
  requestDeleteDoc: (doc: DocumentResponse) => void
  // move doc
  moveDoc: (docId: number, folderId: number | null) => void
  moveFolder: (folderId: number, newParentId: number | null) => void
  // dnd
  dragItem: DragItem | null
  dragOverId: number | 'root' | null
  startDrag: (item: DragItem) => void
  endDrag: () => void
  setDragOver: (id: number | 'root' | null) => void
  commitDrop: (targetFolderId: number | null) => void
}

const Ctx = createContext<TreeCtx>(null!)
const useTree = () => useContext(Ctx)

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildTree(
  folders: FolderResponse[],
  documents: DocumentResponse[],
): { tree: FolderNode[]; rootDocs: DocumentResponse[] } {
  const map = new Map<number, FolderNode>()
  folders.forEach((f) => map.set(f.id, { ...f, children: [], documents: [] }))

  const tree: FolderNode[] = []
  folders.forEach((f) => {
    const node = map.get(f.id)!
    if (f.parentId != null && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node)
    } else {
      tree.push(node)
    }
  })
  const sort = (arr: FolderNode[]) => arr.sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  sort(tree)
  map.forEach((n) => sort(n.children))

  documents.forEach((d) => {
    if (d.folderId != null && map.has(d.folderId)) map.get(d.folderId)!.documents.push(d)
  })

  const rootDocs = documents.filter((d) => d.folderId == null)
  return { tree, rootDocs }
}

function flatFolders(tree: FolderNode[], depth = 0): { folder: FolderNode; depth: number }[] {
  return tree.flatMap((f) => [{ folder: f, depth }, ...flatFolders(f.children, depth + 1)])
}

const docTypeColor: Record<DocumentType, string> = {
  UMOWA_INWESTOR:     'bg-blue-50 text-blue-700',
  UMOWA_PODWYKONAWCA: 'bg-indigo-50 text-indigo-700',
  KOSZTORYS:          'bg-amber-50 text-amber-700',
  HARMONOGRAM:        'bg-purple-50 text-purple-700',
  PROJEKT_WYKONAWCZY: 'bg-emerald-50 text-emerald-700',
  SWZ:                'bg-rose-50 text-rose-700',
  FAKTURA:            'bg-orange-50 text-orange-700',
  INNE:               'bg-gray-100 text-gray-600',
}
const docTypeLabel: Record<DocumentType, string> = {
  UMOWA_INWESTOR: 'Umowa inwestor', UMOWA_PODWYKONAWCA: 'Umowa podwykonawca',
  KOSZTORYS: 'Kosztorys', HARMONOGRAM: 'Harmonogram', PROJEKT_WYKONAWCZY: 'Projekt wykon.',
  SWZ: 'SWZ', FAKTURA: 'Faktura', INNE: 'Inne',
}
const statusDot: Record<string, string> = {
  DONE: 'bg-emerald-400', PROCESSING: 'bg-amber-400 animate-pulse',
  PENDING: 'bg-gray-300', ERROR: 'bg-red-400',
}
const ROLE_LEVEL: Record<Role, number> = {
  PODWYKONAWCA: 1, BRYGADZISTA: 2, INZYNIER: 3, KOSZTORYSANT: 3, KIEROWNIK: 4, ADMIN: 5, OWNER: 6,
}
const ROLE_LABEL: Partial<Record<Role, string>> = {
  BRYGADZISTA: 'Brygadzista+', INZYNIER: 'Inżynier+', KOSZTORYSANT: 'Kosztorysant+',
  KIEROWNIK: 'Kierownik+', ADMIN: 'Admin+', OWNER: 'Właściciel',
}
function getMinRole(roles: string[]): Role | null {
  if (!roles.length) return null
  return roles.reduce<Role>((min, r) =>
    (ROLE_LEVEL[r as Role] ?? 99) < (ROLE_LEVEL[min] ?? 99) ? (r as Role) : min
  , roles[0] as Role)
}

// ─── InlineInput ──────────────────────────────────────────────────────────────

function InlineInput({
  value, onChange, onConfirm, onCancel, placeholder = 'Nazwa folderu',
}: {
  value: string; onChange: (v: string) => void
  onConfirm: () => void; onCancel: () => void; placeholder?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    done.current = false
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => { done.current = true; onConfirm() }
  const cancel = () => { done.current = true; onCancel() }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        onBlur={() => { if (!done.current) onCancel() }}
        className="flex-1 min-w-0 text-sm px-2 py-0.5 border border-blue-400 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
      />
      <button
        onMouseDown={(e) => { e.preventDefault(); commit() }}
        title="Zatwierdź (Enter)"
        className="w-6 h-6 rounded flex items-center justify-center text-white bg-blue-500
                   hover:bg-blue-600 transition-colors cursor-pointer shrink-0"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); cancel() }}
        title="Anuluj (Esc)"
        className="w-6 h-6 rounded flex items-center justify-center text-gray-400
                   hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── MoveFolderPopover ────────────────────────────────────────────────────────

function MoveFolderPopover({
  currentFolderId, onSelect, onClose,
}: { currentFolderId: number | null; onSelect: (id: number | null) => void; onClose: () => void }) {
  const { tree } = useTree()
  const items = flatFolders(tree)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl shadow-lg border border-gray-200
                 min-w-[200px] max-w-xs py-1 max-h-60 overflow-y-auto"
    >
      <button onMouseDown={(e) => { e.preventDefault(); onSelect(null) }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50
                    ${currentFolderId == null ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        Bez folderu (root)
      </button>
      {items.map(({ folder, depth }) => (
        <button key={folder.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(folder.id) }}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          className={`w-full flex items-center gap-2 pr-3 py-2 text-sm hover:bg-gray-50
                      ${currentFolderId === folder.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          {folder.name}
        </button>
      ))}
    </div>
  )
}

// ─── DocRow ───────────────────────────────────────────────────────────────────

function DocRow({ doc, indent }: { doc: DocumentResponse; indent: number }) {
  const { projectId, moveDoc, dragItem, startDrag, endDrag, requestDeleteDoc } = useTree()
  const [showMove, setShowMove]       = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const date = new Date(doc.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  const dot = statusDot[doc.status] ?? 'bg-gray-300'
  const minRole = getMinRole(doc.visibleForRoles ?? [])
  const accessLabel = minRole ? (ROLE_LABEL[minRole] ?? null) : null
  const aiLabel = doc.aiIndexingMode === 'NONE'
    ? { text: 'Archiwum', cls: 'bg-gray-100 text-gray-500' }
    : doc.aiIndexingMode === 'FULL'
      ? { text: 'Pełne AI', cls: 'bg-violet-50 text-violet-600' }
      : null
  const isDragging = dragItem?.type === 'doc' && dragItem.id === doc.id

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', '')
        startDrag({ type: 'doc', id: doc.id, folderId: doc.folderId })
      }}
      onDragEnd={endDrag}
      style={{ paddingLeft: `${12 + indent * 20}px` }}
      className={`group flex items-center gap-2 py-2 px-3 rounded-xl transition-colors relative cursor-grab active:cursor-grabbing
                  ${isDragging ? 'opacity-40' : 'hover:bg-gray-50'}`}
    >
      {/* drag handle */}
      <svg className="w-3.5 h-3.5 text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 -ml-1 cursor-grab"
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>

      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {aiLabel && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full hidden group-hover:inline ${aiLabel.cls}`}>
            {aiLabel.text}
          </span>
        )}
        {accessLabel && (
          <span className="hidden group-hover:flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {accessLabel}
          </span>
        )}
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${docTypeColor[doc.documentType]}`}>
          {docTypeLabel[doc.documentType]}
        </span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} title={doc.status} />

        {/* Preview */}
        <button onClick={() => setShowPreview(true)} title="Podgląd"
          className="w-6 h-6 rounded flex items-center justify-center text-gray-300
                     hover:text-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer
                     opacity-0 group-hover:opacity-100">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Download */}
        <button onClick={() => downloadDocument(projectId, doc)} title="Pobierz"
          className="w-6 h-6 rounded flex items-center justify-center text-gray-300
                     hover:text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer
                     opacity-0 group-hover:opacity-100">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Delete */}
        <button onClick={() => requestDeleteDoc(doc)} title="Usuń / Archiwizuj"
          className="w-6 h-6 rounded flex items-center justify-center text-gray-300
                     hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer
                     opacity-0 group-hover:opacity-100">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Move to folder */}
        <div className="relative">
          <button onClick={() => setShowMove((v) => !v)} title="Przenieś do folderu"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-300
                       hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer
                       opacity-0 group-hover:opacity-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </button>
          {showMove && (
            <MoveFolderPopover
              currentFolderId={doc.folderId}
              onSelect={(id) => { moveDoc(doc.id, id); setShowMove(false) }}
              onClose={() => setShowMove(false)}
            />
          )}
        </div>
      </div>

      {showPreview && (
        <DocumentPreviewModal
          projectId={projectId}
          doc={doc}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

// ─── FolderRow ────────────────────────────────────────────────────────────────

function FolderRow({ node, depth }: { node: FolderNode; depth: number }) {
  const {
    expanded, toggle,
    creatingIn, newName, setNewName, startCreate, confirmCreate, cancelCreate,
    renamingId, renameVal, setRenameVal, startRename, confirmRename, cancelRename,
    requestDelete,
    dragItem, dragOverId, setDragOver, commitDrop, startDrag, endDrag,
  } = useTree()

  const isExpanded = expanded.has(node.id)
  const isRenaming = renamingId === node.id
  const isDragging = dragItem?.type === 'folder' && dragItem.id === node.id
  const isDropTarget = dragOverId === node.id && !isDragging &&
    !(dragItem?.type === 'folder' && dragItem.id === node.id)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(node.id)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    commitDrop(node.id)
  }

  const childCount = node.children.length + node.documents.length

  return (
    <>
      {/* Folder header */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', '')
          startDrag({ type: 'folder', id: node.id })
        }}
        onDragEnd={endDrag}
        onDragOver={handleDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
        }}
        onDrop={handleDrop}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        className={`group flex items-center gap-1.5 py-2 px-2 rounded-xl transition-colors
                    ${isDragging ? 'opacity-40' : ''}
                    ${isDropTarget ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'hover:bg-gray-50'}`}
      >
        {/* Drag handle */}
        <svg className="w-3.5 h-3.5 text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>

        {/* Chevron */}
        <button onClick={() => toggle(node.id)}
          className="w-4 h-4 rounded flex items-center justify-center text-gray-400
                     hover:text-gray-700 transition-colors cursor-pointer shrink-0">
          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Folder icon */}
        <svg className={`w-4 h-4 shrink-0 transition-colors ${isDropTarget ? 'text-blue-500' : isExpanded ? 'text-amber-400' : 'text-amber-300'}`}
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>

        {/* Name / rename */}
        {isRenaming ? (
          <InlineInput
            value={renameVal}
            onChange={setRenameVal}
            onConfirm={confirmRename}
            onCancel={cancelRename}
          />
        ) : (
          <button onClick={() => toggle(node.id)}
            className="flex-1 min-w-0 text-sm font-medium text-gray-700 text-left truncate
                       hover:text-gray-900 cursor-pointer">
            {node.name}
            {childCount > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">{childCount}</span>
            )}
          </button>
        )}

        {/* Actions */}
        {!isRenaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => { startCreate(node.id) }}
              title="Nowy podfolder"
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400
                         hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button onClick={() => startRename(node.id, node.name)}
              title="Zmień nazwę"
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400
                         hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => requestDelete(node.id)}
              title="Usuń folder"
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400
                         hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* New subfolder input */}
      {creatingIn === node.id && (
        <div className="flex items-center gap-2 py-1.5 px-2"
          style={{ paddingLeft: `${8 + (depth + 1) * 20 + 18}px` }}>
          <svg className="w-4 h-4 text-amber-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <InlineInput
            value={newName}
            onChange={setNewName}
            onConfirm={confirmCreate}
            onCancel={cancelCreate}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && (
        <>
          {node.children.map((child) => (
            <FolderRow key={child.id} node={child} depth={depth + 1} />
          ))}
          {node.documents.map((doc) => (
            <DocRow key={doc.id} doc={doc} indent={depth + 1} />
          ))}
        </>
      )}
    </>
  )
}

// ─── FolderTree (main export) ─────────────────────────────────────────────────

export default function FolderTree({
  projectId,
  onUploadClick,
}: {
  projectId: number
  onUploadClick: () => void
}) {
  const queryClient = useQueryClient()

  // ── query ──
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => getFolders(projectId),
  })
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => getDocuments(projectId),
  })
  const [filterType, setFilterType] = useState<DocumentType | null>(null)

  const filteredDocs = useMemo(
    () => filterType ? documents.filter((d) => d.documentType === filterType) : documents,
    [documents, filterType],
  )
  const { tree, rootDocs } = useMemo(() => buildTree(folders, filteredDocs), [folders, filteredDocs])
  const presentTypes = useMemo(
    () => Array.from(new Set(documents.map((d) => d.documentType))) as DocumentType[],
    [documents],
  )

  // ── ui state ──
  const [expanded, setExpanded]     = useState<Set<number>>(new Set())
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameVal, setRenameVal]   = useState('')
  const [creatingIn, setCreatingIn] = useState<number | null | false>(false)
  const [newName, setNewName]       = useState('')
  const [deleteConflictId, setDeleteConflictId] = useState<number | null>(null)
  const [deleteDocTarget, setDeleteDocTarget]   = useState<DocumentResponse | null>(null)
  // dnd
  const [dragItem, setDragItemState]   = useState<DragItem | null>(null)
  const [dragOverId, setDragOverId]    = useState<number | 'root' | null>(null)

  // ── mutations ──
  const inv = (keys: (string | number)[][]) => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }))

  const createMut = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: number | null }) =>
      createFolder(projectId, name, parentId),
    onSuccess: (f) => {
      inv([['folders', projectId]])
      if (f.parentId) setExpanded((s) => new Set([...s, f.parentId!]))
      setCreatingIn(false)
      setNewName('')
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateFolder(projectId, id, { name }),
    onSuccess: () => { inv([['folders', projectId]]); setRenamingId(null) },
  })

  const deleteMut = useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) =>
      deleteFolder(projectId, id, force),
    onSuccess: () => {
      inv([['folders', projectId], ['documents', projectId]])
      setDeleteConflictId(null)
    },
    onError: (_e, v) => setDeleteConflictId(v.id),
  })

  const moveDocMut = useMutation({
    mutationFn: ({ docId, folderId }: { docId: number; folderId: number | null }) =>
      moveDocumentToFolder(projectId, docId, folderId),
    onSuccess: () => inv([['documents', projectId]]),
  })

  const moveFolderMut = useMutation({
    mutationFn: ({ id, parentId }: { id: number; parentId: number | null }) =>
      updateFolder(projectId, id, { parentId }),
    onSuccess: () => inv([['folders', projectId]]),
  })

  const deleteDocMut = useMutation({
    mutationFn: (docId: number) => deleteDocument(projectId, docId),
    onSuccess: () => { inv([['documents', projectId]]); setDeleteDocTarget(null) },
  })

  const archiveDocMut = useMutation({
    mutationFn: (docId: number) => archiveDocument(projectId, docId),
    onSuccess: () => { inv([['documents', projectId]]); setDeleteDocTarget(null) },
  })

  // ── handlers ──
  const toggle = (id: number) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const startCreate = (parentId: number | null) => {
    setCreatingIn(parentId)
    setNewName('')
    if (parentId != null) setExpanded((s) => new Set([...s, parentId]))
  }

  const confirmCreate = () => {
    if (!newName.trim()) { setCreatingIn(false); return }
    createMut.mutate({
      name: newName.trim(),
      parentId: typeof creatingIn === 'number' ? creatingIn : null,
    })
  }

  const cancelCreate = () => { setCreatingIn(false); setNewName('') }

  const startRename  = (id: number, name: string) => { setRenamingId(id); setRenameVal(name) }
  const confirmRename = () => {
    if (renamingId == null || !renameVal.trim()) { setRenamingId(null); return }
    renameMut.mutate({ id: renamingId, name: renameVal.trim() })
  }
  const cancelRename  = () => setRenamingId(null)

  const requestDelete = (id: number) => deleteMut.mutate({ id })
  const requestDeleteDoc = (doc: DocumentResponse) => setDeleteDocTarget(doc)
  const moveDoc = (docId: number, folderId: number | null) => moveDocMut.mutate({ docId, folderId })
  const moveFolder = (id: number, parentId: number | null) => moveFolderMut.mutate({ id, parentId })

  // dnd
  const startDrag = (item: DragItem) => setDragItemState(item)
  const endDrag   = () => { setDragItemState(null); setDragOverId(null) }
  const setDragOver = (id: number | 'root' | null) => setDragOverId(id)

  const commitDrop = (targetFolderId: number | null) => {
    if (!dragItem) return
    if (dragItem.type === 'doc') {
      if (targetFolderId !== dragItem.folderId)
        moveDoc(dragItem.id, targetFolderId)
    } else {
      if (targetFolderId !== dragItem.id)
        moveFolder(dragItem.id, targetFolderId)
    }
    setDragItemState(null)
    setDragOverId(null)
  }

  const ctx: TreeCtx = {
    projectId, tree,
    expanded, toggle,
    creatingIn, newName, setNewName, startCreate, confirmCreate, cancelCreate,
    renamingId, renameVal, setRenameVal, startRename, confirmRename, cancelRename,
    requestDelete, requestDeleteDoc, moveDoc, moveFolder,
    dragItem, dragOverId, startDrag, endDrag, setDragOver, commitDrop,
  }

  const isRootDropTarget = dragOverId === 'root' && dragItem != null
  const isEmpty = !isLoading && documents.length === 0 && folders.length === 0 && creatingIn === false

  return (
    <Ctx.Provider value={ctx}>
      <section className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Pliki</h2>
              {documents.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {filterType ? `${filteredDocs.length} z ${documents.length}` : `${documents.length}`} dokumentów
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => startCreate(null)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700
                           hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Folder
              </button>
              <button
                onClick={onUploadClick}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700
                           bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj
              </button>
            </div>
          </div>
          {/* Type filter */}
          {presentTypes.length > 1 && (
            <div className="flex items-center gap-1 px-3 pb-2 flex-wrap">
              <button
                onClick={() => setFilterType(null)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer font-medium
                  ${filterType === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                Wszystkie
              </button>
              {presentTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? null : t)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer font-medium
                    ${filterType === t ? docTypeColor[t] + ' ring-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {docTypeLabel[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tree */}
        <div
          className={`flex-1 overflow-y-auto p-2 transition-colors
                      ${isRootDropTarget ? 'bg-blue-50/60' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver('root') }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
          }}
          onDrop={(e) => { e.preventDefault(); commitDrop(null) }}
        >
          {isLoading && (
            <div className="space-y-1 px-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Brak dokumentów w tym projekcie</p>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-0.5">
              {/* New root-folder input */}
              {creatingIn === null && (
                <div className="flex items-center gap-2 py-1.5 px-2 pl-[14px]">
                  <svg className="w-4 h-4 text-amber-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <InlineInput
                    value={newName}
                    onChange={setNewName}
                    onConfirm={confirmCreate}
                    onCancel={cancelCreate}
                  />
                </div>
              )}

              {tree.map((node) => <FolderRow key={node.id} node={node} depth={0} />)}

              {rootDocs.map((doc) => <DocRow key={doc.id} doc={doc} indent={0} />)}

              {/* Drop indicator when dragging over root */}
              {isRootDropTarget && dragItem?.type === 'doc' && (
                <div className="mx-2 h-0.5 bg-blue-400 rounded-full" />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Delete conflict dialog */}
      {deleteConflictId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"
               onClick={() => setDeleteConflictId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Folder nie jest pusty</h3>
            <p className="text-sm text-gray-500 mb-5">
              Folder zawiera pliki lub podfoldery. Czy chcesz go usunąć razem z zawartością?
              Pliki trafią do root projektu.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConflictId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100
                           hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">
                Anuluj
              </button>
              <button onClick={() => deleteMut.mutate({ id: deleteConflictId, force: true })}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500
                           hover:bg-red-600 rounded-xl transition-colors cursor-pointer">
                Usuń z zawartością
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete document dialog */}
      {deleteDocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"
               onClick={() => setDeleteDocTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-1">Usuń dokument</h3>
            <p className="text-sm text-gray-500 mb-1 truncate font-medium">{deleteDocTarget.name}</p>
            <p className="text-sm text-gray-400 mb-5">Wybierz co zrobić z tym plikiem:</p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => archiveDocMut.mutate(deleteDocTarget.id)}
                disabled={archiveDocMut.isPending || deleteDocMut.isPending}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200
                           hover:bg-amber-50 hover:border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <p className="text-sm font-semibold text-gray-800">Archiwizuj</p>
                <p className="text-xs text-gray-400 mt-0.5">Plik zostaje na dysku, znika z listy i zostaje usunięty z indeksu AI</p>
              </button>
              <button
                onClick={() => deleteDocMut.mutate(deleteDocTarget.id)}
                disabled={archiveDocMut.isPending || deleteDocMut.isPending}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200
                           hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <p className="text-sm font-semibold text-red-600">Usuń na stałe</p>
                <p className="text-xs text-gray-400 mt-0.5">Plik, rekord i wszystkie chunki AI zostaną trwale usunięte</p>
              </button>
            </div>
            <button onClick={() => setDeleteDocTarget(null)}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100
                         hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">
              Anuluj
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
