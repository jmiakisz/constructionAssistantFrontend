import client from './client'
import type { DocumentResponse } from '../types'

export interface FolderResponse {
  id: number
  name: string
  parentId: number | null
  projectId: number
  createdAt: string
}

export const getFolders = (projectId: number) =>
  client.get<FolderResponse[]>(`/projects/${projectId}/folders`).then((r) => r.data)

export const createFolder = (projectId: number, name: string, parentId?: number | null) =>
  client
    .post<FolderResponse>(`/projects/${projectId}/folders`, { name, parentId: parentId ?? null })
    .then((r) => r.data)

export const updateFolder = (
  projectId: number,
  folderId: number,
  data: { name?: string; parentId?: number | null },
) =>
  client
    .patch<FolderResponse>(`/projects/${projectId}/folders/${folderId}`, data)
    .then((r) => r.data)

export const deleteFolder = (projectId: number, folderId: number, force = false) =>
  client.delete(`/projects/${projectId}/folders/${folderId}${force ? '?force=true' : ''}`)

export const moveDocumentToFolder = (
  projectId: number,
  documentId: number,
  folderId: number | null,
) =>
  client
    .patch<DocumentResponse>(`/projects/${projectId}/documents/${documentId}/folder`, { folderId })
    .then((r) => r.data)
