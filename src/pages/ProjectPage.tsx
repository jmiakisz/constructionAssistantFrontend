import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getConversations, createConversation } from '../api/conversations'
import { getProject } from '../api/projects'
import { useAuthStore } from '../store/authStore'
import FolderTree from '../components/FolderTree'
import UploadDocumentModal from '../components/UploadDocumentModal'
import ProjectBriefingCard from '../components/ProjectBriefingCard'
import ProjectNotificationsPanel from '../components/ProjectNotificationsPanel'
import type { ConversationResponse } from '../types'

function ConversationRow({ conv, projectId }: { conv: ConversationResponse; projectId: number }) {
  const date = new Date(conv.createdAt).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short',
  })

  return (
    <Link
      to={`/projects/${projectId}/conversations/${conv.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors group"
    >
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
          {conv.title}
        </p>
        {conv.lastMessage && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
        )}
      </div>
      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{date}</span>
    </Link>
  )
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1 px-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [showUpload, setShowUpload] = useState(false)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  })

  const { data: conversations, isLoading: convsLoading, refetch: refetchConvs } = useQuery({
    queryKey: ['conversations', projectId],
    queryFn: () => getConversations(projectId),
  })

  const handleNewConversation = async () => {
    const conv = await createConversation(projectId)
    await refetchConvs()
    navigate(`/projects/${projectId}/conversations/${conv.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/projects" className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Projekty</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
              {project?.name ?? '…'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name ?? user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        <ProjectBriefingCard projectId={projectId} />
        <ProjectNotificationsPanel projectId={projectId} />

        <div className="flex gap-6 flex-1">
        {/* Left — FolderTree */}
        <FolderTree projectId={projectId} onUploadClick={() => setShowUpload(true)} />

        {/* Right — Conversations */}
        <section className="w-80 shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Konwersacje</h2>
              {conversations && (
                <p className="text-xs text-gray-400 mt-0.5">{conversations.length} rozmów</p>
              )}
            </div>
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700
                         bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nowa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {convsLoading && <SectionSkeleton />}

            {conversations && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">Brak konwersacji</p>
                <button
                  onClick={handleNewConversation}
                  className="mt-3 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Rozpocznij pierwszą rozmowę
                </button>
              </div>
            )}

            {conversations && conversations.length > 0 && (
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <ConversationRow key={conv.id} conv={conv} projectId={projectId} />
                ))}
              </div>
            )}
          </div>
        </section>
        </div>
      </div>

      {showUpload && (
        <UploadDocumentModal projectId={projectId} onClose={() => setShowUpload(false)} />
      )}
    </div>
  )
}
