import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, replyToNotification } from '../api/notifications'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

interface Props {
  projectId: number
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'przed chwilą'
  if (diff < 60) return `${diff} min temu`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h} godz. temu`
  return `${Math.floor(h / 24)} dni temu`
}

export default function ProjectNotificationsPanel({ projectId }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.userId)
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', projectId],
    queryFn: () => getNotifications(projectId),
    refetchInterval: 30_000,
  })

  const replyMut = useMutation({
    mutationFn: ({ id, response }: { id: number; response: string }) =>
      replyToNotification(projectId, id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', projectId] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count', projectId] })
      setReplyingId(null)
      setReplyText('')
    },
  })

  const pending = notifications.filter((n) => n.status === 'PENDING')

  if (isLoading) return null
  if (notifications.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Pytania do zarządzającego</h3>
          {pending.length > 0 && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pending.length} oczekuje
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {notifications.map((n) => {
          const isReplying = replyingId === n.id
          const isMine = n.senderUserId === userId
          const canReply = n.status === 'PENDING' && !isMine

          return (
            <div key={n.id} className={`px-5 py-4 ${n.status === 'PENDING' ? '' : 'opacity-75'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.status === 'PENDING' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">{n.senderName}</span>
                    <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                    {n.conversationId && (
                      <button
                        onClick={() => navigate(`/projects/${projectId}/conversations/${n.conversationId}`)}
                        className="text-xs text-blue-500 hover:underline cursor-pointer"
                      >
                        → konwersacja
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{n.question}</p>

                  {/* Odpowiedź */}
                  {n.adminResponse && (
                    <div className="mt-2 pl-3 border-l-2 border-emerald-300">
                      <p className="text-xs font-medium text-emerald-700 mb-0.5">
                        {n.answeredBy} odpowiedział:
                      </p>
                      <p className="text-sm text-gray-700">{n.adminResponse}</p>
                    </div>
                  )}

                  {/* Reply form */}
                  {canReply && !isReplying && (
                    <button
                      onClick={() => { setReplyingId(n.id); setReplyText('') }}
                      className="mt-2 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      Odpowiedz
                    </button>
                  )}

                  {isReplying && (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Napisz odpowiedź..."
                        rows={2}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => replyMut.mutate({ id: n.id, response: replyText })}
                          disabled={!replyText.trim() || replyMut.isPending}
                          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700
                                     px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Wyślij
                        </button>
                        <button
                          onClick={() => { setReplyingId(null); setReplyText('') }}
                          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5
                                     rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
