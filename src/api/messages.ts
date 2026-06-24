import client from './client'

export interface DocumentInfo {
  title: string
  content: string
}

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  document?: DocumentInfo | null
}

export interface SendMessageResult {
  response: string
  document?: DocumentInfo | null
}

export const getMessages = (projectId: number, convId: number) =>
  client
    .get<Message[]>(`/projects/${projectId}/conversations/${convId}/messages`)
    .then((r) => r.data)

export const sendMessage = (
  projectId: number,
  convId: number,
  message: string,
  files?: File[],
): Promise<SendMessageResult> => {
  const url = `/projects/${projectId}/conversations/${convId}/messages`

  if (files && files.length > 0) {
    const form = new FormData()
    form.append('message', message)
    files.forEach((f) => form.append('files', f))
    return client.post<SendMessageResult>(url, form).then((r) => r.data)
  }

  return client
    .post<SendMessageResult>(url, { message })
    .then((r) => r.data)
}
