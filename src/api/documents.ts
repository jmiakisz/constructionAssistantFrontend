import client from './client'
import type { DocumentResponse, DocumentType, Role } from '../types'

export const getDocuments = (projectId: number) =>
  client.get<DocumentResponse[]>(`/projects/${projectId}/documents`).then((r) => r.data)

export const downloadDocument = async (projectId: number, doc: { id: number; name: string }) => {
  const r = await client.get(`/projects/${projectId}/documents/${doc.id}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(r.data)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const fetchDocumentPreviewBlob = async (projectId: number, documentId: number) => {
  const r = await client.get(`/projects/${projectId}/documents/${documentId}/download?inline=true`, {
    responseType: 'blob',
  })
  return {
    url: URL.createObjectURL(r.data),
    mimeType: (r.headers['content-type'] as string) || '',
  }
}

export const deleteDocument = (projectId: number, documentId: number) =>
  client.delete(`/projects/${projectId}/documents/${documentId}`)

export const archiveDocument = (projectId: number, documentId: number) =>
  client.post(`/projects/${projectId}/documents/${documentId}/archive`)

export type AiIndexingMode = 'FULL' | 'CHUNKS_ONLY' | 'NONE'

export const uploadDocuments = (
  projectId: number,
  files: File[],
  documentType: DocumentType,
  minRole: Role,
  aiIndexingMode: AiIndexingMode,
  folderId?: number | null,
) => {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  form.append('documentType', documentType)
  form.append('minRole', minRole)
  form.append('aiIndexingMode', aiIndexingMode)
  if (folderId != null) form.append('folderId', String(folderId))
  return client
    .post<DocumentResponse[]>(`/projects/${projectId}/documents/bulk`, form)
    .then((r) => r.data)
}
