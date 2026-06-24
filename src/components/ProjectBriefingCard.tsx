import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProjectBriefing } from '../api/projects'
import { useAuthStore } from '../store/authStore'

interface Props {
  projectId: number
}

export default function ProjectBriefingCard({ projectId }: Props) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.userId)
  const [refreshing, setRefreshing] = useState(false)

  const queryKey = ['briefing', projectId, userId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getProjectBriefing(projectId),
    staleTime: 60 * 60 * 1000,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const fresh = await getProjectBriefing(projectId, true)
      queryClient.setQueryData(queryKey, fresh)
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-xl bg-blue-50 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const timeAgo = (() => {
    const diff = Math.floor((Date.now() - new Date(data.generatedAt).getTime()) / 60000)
    if (diff < 1) return 'przed chwilą'
    if (diff < 60) return `${diff} min temu`
    const h = Math.floor(diff / 60)
    return `${h} godz. temu`
  })()

  return (
    <div className="bg-white border border-blue-100 rounded-2xl px-6 py-4 flex gap-4">
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Aktualna sytuacja</span>
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{data.content}</p>
      </div>

      <button
        onClick={handleRefresh}
        disabled={refreshing}
        title="Odśwież podsumowanie"
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                   hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-40 cursor-pointer mt-0.5"
      >
        <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}
