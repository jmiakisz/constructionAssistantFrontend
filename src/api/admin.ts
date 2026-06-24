import client from './client'
import type { AuthResponse, ProjectResponse } from '../types'
import type { Role } from '../types'

export interface AdminUser {
  id: number
  name: string
  email: string
  companyRole: string
  formalityLevel: string
}

export const getUsers = () =>
  client.get<AdminUser[]>('/admin/users').then((r) => r.data)

export interface TokenStats {
  totals:            { messages: number; inputTokens: number; outputTokens: number; costUsd: number }
  today:             { inputTokens: number; outputTokens: number; costUsd: number }
  thisMonth:         { inputTokens: number; outputTokens: number; costUsd: number }
  byModel:           { model: string; messages: number; inputTokens: number; outputTokens: number; costUsd: number }[]
  byProject:         { projectId: number; projectName: string; conversations: number; activeUsers: number; messages: number; inputTokens: number; outputTokens: number; costUsd: number }[]
  byConversation:    { conversationId: number; title: string; projectName: string; userName: string; messages: number; inputTokens: number; outputTokens: number; costUsd: number; startedAt: string; lastMessageAt: string }[]
  daily:             { day: string; inputTokens: number; outputTokens: number; costUsd: number }[]
  filesByProject:    { projectId: number; projectName: string; documents: number; chunks: number; indexedChunks: number }[]
  filesDaily:        { day: string; documents: number; chunks: number }[]
  embeddingBySource: { source: string; calls: number; totalChars: number; todayChars: number; monthChars: number }[]
  embeddingByProject:{ projectId: number; projectName: string; calls: number; totalChars: number }[]
  embeddingDaily:    { day: string; calls: number; totalChars: number }[]
}

export const getTokenStats = () =>
  client.get<TokenStats>('/admin/tokens/stats').then((r) => r.data)

export const createUser = (email: string, password: string, name: string) =>
  client.post<AuthResponse>('/auth/register', { email, password, name }).then((r) => r.data)

export const createProject = (name: string, description: string) =>
  client.post<ProjectResponse>('/projects', { name, description }).then((r) => r.data)

export const assignMember = (projectId: number, userId: number, role: Role) =>
  client.post(`/projects/${projectId}/members`, null, { params: { userId, role } })

export interface KnowledgeEntry {
  id: number
  content: string
  category: string
  entryType: string
  sourceRole: string
  projectId: number | 'null'
  confidence: number
  validUntil: string
  createdAt: string
}

export const getKnowledge = () =>
  client.get<KnowledgeEntry[]>('/admin/knowledge').then(r => r.data)

export const updateKnowledge = (id: number, data: { content?: string; category?: string; confidence?: number }) =>
  client.patch<KnowledgeEntry>(`/admin/knowledge/${id}`, data).then(r => r.data)

export const deleteKnowledge = (id: number) =>
  client.delete(`/admin/knowledge/${id}`)

export const triggerNightly = () =>
  client.post<{ status: string }>('/admin/nightly/run').then(r => r.data)

export const triggerKnowledge = () =>
  client.post<{ status: string }>('/admin/nightly/knowledge').then(r => r.data)

export const triggerKnowledgeSync = () =>
  client.post<{ status: string; durationMs: number }>('/admin/nightly/knowledge/sync').then(r => r.data)

export const triggerStyles = () =>
  client.post<{ status: string }>('/admin/nightly/styles').then(r => r.data)

export const triggerStylesSync = () =>
  client.post<{ status: string; durationMs: number }>('/admin/nightly/styles/sync').then(r => r.data)

export const triggerCleanup = () =>
  client.post<{ status: string }>('/admin/nightly/cleanup').then(r => r.data)

export const triggerConsolidate = () =>
  client.post<{ status: string }>('/admin/weekly/consolidate').then(r => r.data)

export const triggerReprocess = (days = 90) =>
  client.post<{ reset: number; days: number }>('/admin/messages/reprocess', null, { params: { days } }).then(r => r.data)

// ── Role configs ──────────────────────────────────────────────────────────────

export interface RoleConfig {
  key: string
  label: string
  permissionLevel: number
  isSystem: boolean
  description: string
  sortOrder: number
}

export const getRoles = () =>
  client.get<RoleConfig[]>('/admin/roles').then(r => r.data)

export const createRole = (data: { key: string; label: string; permissionLevel: number; description?: string; sortOrder?: number }) =>
  client.post<RoleConfig>('/admin/roles', data).then(r => r.data)

export const updateRole = (key: string, data: Partial<Pick<RoleConfig, 'label' | 'description' | 'sortOrder' | 'permissionLevel'>>) =>
  client.patch<RoleConfig>(`/admin/roles/${key}`, data).then(r => r.data)

export const deleteRole = (key: string) =>
  client.delete(`/admin/roles/${key}`)

// ── Document type configs ─────────────────────────────────────────────────────

export interface DocumentTypeConfig {
  key: string
  label: string
  description: string
  sortOrder: number
}

export const getDocumentTypes = () =>
  client.get<DocumentTypeConfig[]>('/admin/document-types').then(r => r.data)

export const createDocumentType = (data: { key: string; label: string; description?: string; sortOrder?: number }) =>
  client.post<DocumentTypeConfig>('/admin/document-types', data).then(r => r.data)

export const updateDocumentType = (key: string, data: Partial<Pick<DocumentTypeConfig, 'label' | 'description' | 'sortOrder'>>) =>
  client.patch<DocumentTypeConfig>(`/admin/document-types/${key}`, data).then(r => r.data)

export const deleteDocumentType = (key: string) =>
  client.delete(`/admin/document-types/${key}`)
