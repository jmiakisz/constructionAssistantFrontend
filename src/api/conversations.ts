import client from './client'
import type { ConversationResponse } from '../types'

export const getConversations = (projectId: number) =>
  client.get<ConversationResponse[]>(`/projects/${projectId}/conversations`).then((r) => r.data)

export const createConversation = (projectId: number) =>
  client.post<ConversationResponse>(`/projects/${projectId}/conversations`).then((r) => r.data)
