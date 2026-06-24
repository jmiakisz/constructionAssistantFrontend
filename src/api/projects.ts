import client from './client'
import type { ProjectResponse } from '../types'

export const getProjects = () =>
  client.get<ProjectResponse[]>('/projects').then((r) => r.data)

export const getProject = (id: number) =>
  client.get<ProjectResponse>(`/projects/${id}`).then((r) => r.data)

export interface ProjectBriefing {
  content: string
  generatedAt: string
  cached: boolean
}

export const getProjectBriefing = (projectId: number, refresh = false) =>
  client.get<ProjectBriefing>(`/projects/${projectId}/briefing${refresh ? '?refresh=true' : ''}`)
    .then((r) => r.data)
