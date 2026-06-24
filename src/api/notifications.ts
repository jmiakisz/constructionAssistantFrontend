import client from './client'

export interface ProjectNotification {
  id: number
  projectId: number
  conversationId: number | null
  senderName: string
  senderUserId: number
  question: string
  adminResponse: string | null
  answeredBy: string | null
  status: 'PENDING' | 'ANSWERED'
  createdAt: string
  answeredAt: string | null
}

export const getNotifications = (projectId: number) =>
  client.get<ProjectNotification[]>(`/projects/${projectId}/notifications`).then((r) => r.data)

export const getPendingCount = (projectId: number) =>
  client.get<{ count: number }>(`/projects/${projectId}/notifications/pending-count`).then((r) => r.data.count)

export const replyToNotification = (projectId: number, id: number, response: string) =>
  client.post<ProjectNotification>(`/projects/${projectId}/notifications/${id}/reply`, { response })
    .then((r) => r.data)
