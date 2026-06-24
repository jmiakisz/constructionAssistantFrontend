import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTokenStats } from '../../api/admin'

const fmtTokens = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
const fmtCost = (n: number) => {
  if (typeof n !== 'number') return '$0.00'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

const shortModel = (model: string) =>
  model.replace('claude-', '').replace(/-\d{8}$/, '')

function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${accent ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function DailyChart({ data }: { data: { day: string; inputTokens: number; outputTokens: number; costUsd: number }[] }) {
  const last30 = data.slice(-30)
  const maxVal = Math.max(...last30.map(d => d.inputTokens + d.outputTokens), 1)

  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {last30.map((d) => {
          const total = d.inputTokens + d.outputTokens
          const inH = Math.round((d.inputTokens / maxVal) * 100)
          const outH = Math.round((d.outputTokens / maxVal) * 100)
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                <p className="font-medium">{fmtDate(d.day)}</p>
                <p>In: {fmtTokens(d.inputTokens)}</p>
                <p>Out: {fmtTokens(d.outputTokens)}</p>
                <p>{fmtCost(d.costUsd)}</p>
              </div>
              {total > 0 && (
                <>
                  <div className="w-full bg-blue-200 rounded-t-sm" style={{ height: `${outH}%` }} />
                  <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: `${inH}%` }} />
                </>
              )}
              {total === 0 && <div className="w-full bg-gray-100 rounded-t-sm" style={{ height: '4px' }} />}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {last30[0] && <span>{fmtDate(last30[0].day)}</span>}
        {last30[last30.length - 1] && <span>{fmtDate(last30[last30.length - 1].day)}</span>}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-blue-500" /> Tokeny wejściowe
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-blue-200" /> Tokeny wyjściowe
        </div>
      </div>
    </div>
  )
}

type Tab = 'chat' | 'files' | 'embeddings'

export default function TokensAdmin() {
  const [tab, setTab] = useState<Tab>('chat')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['token-stats'],
    queryFn: getTokenStats,
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 bg-gray-100 rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  if (!data) return null

  const { totals, today, thisMonth, byModel, byProject, byConversation, daily, filesByProject, filesDaily, embeddingBySource, embeddingByProject } = data

  const totalTokens = totals.inputTokens + totals.outputTokens
  const monthTokens = thisMonth.inputTokens + thisMonth.outputTokens
  const todayTokens = today.inputTokens + today.outputTokens
  const maxProjectCost = Math.max(...byProject.map(p => Number(p.costUsd)), 1)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Zużycie tokenów</h1>
          <p className="text-sm text-gray-500 mt-1">Koszty AI i aktywność w podziale na projekty i modele</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200
                     hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Odśwież
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Łączny koszt" value={fmtCost(Number(totals.costUsd))} sub={`${fmtTokens(totalTokens)} tokenów`} accent />
        <StatCard label="Dziś" value={fmtCost(Number(today.costUsd))} sub={`${fmtTokens(todayTokens)} tokenów`} />
        <StatCard label="Ten miesiąc" value={fmtCost(Number(thisMonth.costUsd))} sub={`${fmtTokens(monthTokens)} tokenów`} />
        <StatCard label="Wiadomości" value={fmtTokens(totals.messages)} sub="łącznie" />
        <StatCard label="Tokeny wejściowe" value={fmtTokens(totals.inputTokens)} sub="łącznie" />
        <StatCard label="Tokeny wyjściowe" value={fmtTokens(totals.outputTokens)} sub="łącznie" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['chat', 'Rozmowy'], ['files', 'Pliki'], ['embeddings', 'Embeddingi']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer
              ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <div className="space-y-6">
          {/* Daily chart */}
          {daily.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Dzienny ruch tokenów</h2>
              <DailyChart data={daily} />
            </div>
          )}

          {/* By model */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Według modelu</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Model</th>
                  <th className="text-right px-6 py-3 font-medium">Wiadomości</th>
                  <th className="text-right px-6 py-3 font-medium">Tokeny in</th>
                  <th className="text-right px-6 py-3 font-medium">Tokeny out</th>
                  <th className="text-right px-6 py-3 font-medium">Koszt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byModel.map((m) => (
                  <tr key={m.model} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{shortModel(m.model)}</span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">{m.messages.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(m.inputTokens)}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(m.outputTokens)}</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">{fmtCost(Number(m.costUsd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* By project */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Według projektu</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {byProject.map((p) => (
                <div key={p.projectId} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.projectName}</p>
                      <p className="text-sm font-semibold text-gray-900 ml-4 shrink-0">{fmtCost(Number(p.costUsd))}</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(Number(p.costUsd) / maxProjectCost) * 100}%` }} />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                      <span>{p.conversations} rozmów</span>
                      <span>{p.activeUsers} userów</span>
                      <span>{p.messages} wiad.</span>
                      <span>{fmtTokens(p.inputTokens + p.outputTokens)} tokenów</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top conversations */}
          {byConversation.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Najdroższe konwersacje</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left px-6 py-3 font-medium">Konwersacja</th>
                    <th className="text-left px-6 py-3 font-medium">Projekt / User</th>
                    <th className="text-right px-6 py-3 font-medium">Wiad.</th>
                    <th className="text-right px-6 py-3 font-medium">Tokeny</th>
                    <th className="text-right px-6 py-3 font-medium">Koszt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byConversation.slice(0, 10).map((c) => (
                    <tr key={c.conversationId} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-[200px]">{c.title}</p>
                        {c.startedAt && <p className="text-xs text-gray-400">{fmtDate(c.startedAt)}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-gray-600 truncate max-w-[160px]">{c.projectName}</p>
                        <p className="text-xs text-gray-400">{c.userName}</p>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">{c.messages}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(c.inputTokens + c.outputTokens)}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">{fmtCost(Number(c.costUsd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Dokumenty według projektu</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Projekt</th>
                  <th className="text-right px-6 py-3 font-medium">Dokumenty</th>
                  <th className="text-right px-6 py-3 font-medium">Chunki</th>
                  <th className="text-right px-6 py-3 font-medium">Zaindeksowane</th>
                  <th className="text-right px-6 py-3 font-medium">% indeksu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filesByProject.map((p) => {
                  const pct = p.chunks > 0 ? Math.round((p.indexedChunks / p.chunks) * 100) : 0
                  return (
                    <tr key={p.projectId} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">{p.projectName}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{p.documents}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{p.chunks.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{p.indexedChunks.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                          ${pct === 100 ? 'bg-emerald-50 text-emerald-700' : pct > 50 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filesDaily.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Nowe dokumenty dziennie</h2>
              <div className="flex items-end gap-1 h-24">
                {filesDaily.slice(-30).map((d) => {
                  const max = Math.max(...filesDaily.map(x => x.documents), 1)
                  const h = Math.round((d.documents / max) * 100)
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        {fmtDate(d.day)}: {d.documents} dok., {d.chunks} chunków
                      </div>
                      <div className="w-full bg-emerald-400 rounded-t-sm" style={{ height: `${Math.max(h, d.documents > 0 ? 8 : 2)}%` }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'embeddings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Według źródła</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Źródło</th>
                  <th className="text-right px-6 py-3 font-medium">Wywołania</th>
                  <th className="text-right px-6 py-3 font-medium">Znaki łącznie</th>
                  <th className="text-right px-6 py-3 font-medium">Dziś</th>
                  <th className="text-right px-6 py-3 font-medium">Ten miesiąc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {embeddingBySource.map((e) => (
                  <tr key={e.source} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700 bg-gray-50">{e.source}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{e.calls.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(e.totalChars)}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(e.todayChars)}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(e.monthChars)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Według projektu</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">Projekt</th>
                  <th className="text-right px-6 py-3 font-medium">Wywołania</th>
                  <th className="text-right px-6 py-3 font-medium">Znaki łącznie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {embeddingByProject.map((e) => (
                  <tr key={e.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{e.projectName}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{e.calls.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{fmtTokens(e.totalChars)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
