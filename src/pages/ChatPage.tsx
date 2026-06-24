import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMessages, sendMessage } from '../api/messages'
import { getProject } from '../api/projects'
import { getConversations } from '../api/conversations'
import { useAuthStore } from '../store/authStore'
import DocumentPickerModal from '../components/DocumentPickerModal'
import AddToProjectToast from '../components/AddToProjectToast'
import type { Message, DocumentInfo } from '../api/messages'
import type { DocumentResponse } from '../types'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.gif'

// ── Markdown → HTML (prosty renderer bez zależności) ──────────────────────────
function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Nagłówki
    if (line.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false } html += `<h3>${fmt(line.slice(4))}</h3>`; continue }
    if (line.startsWith('## '))  { if (inList) { html += '</ul>'; inList = false } html += `<h2>${fmt(line.slice(3))}</h2>`; continue }
    if (line.startsWith('# '))   { if (inList) { html += '</ul>'; inList = false } html += `<h1>${fmt(line.slice(2))}</h1>`; continue }

    // Linie poziome
    if (/^[-*]{3,}$/.test(line.trim())) { if (inList) { html += '</ul>'; inList = false } html += '<hr>'; continue }

    // Listy
    const listMatch = line.match(/^[-*] (.+)/)
    if (listMatch) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${fmt(listMatch[1])}</li>`
      continue
    }

    // Tabele
    if (line.includes('|')) {
      if (inList) { html += '</ul>'; inList = false }
      if (i === 0 || !lines[i-1].includes('|')) html += '<table>'
      if (/^[|\s:-]+$/.test(line)) continue // separator
      html += `<tr>${line.split('|').filter(Boolean).map(c => `<td>${fmt(c.trim())}</td>`).join('')}</tr>`
      if (i === lines.length - 1 || !lines[i+1]?.includes('|')) html += '</table>'
      continue
    }

    if (inList) { html += '</ul>'; inList = false }

    // Puste linie
    if (line.trim() === '') { html += '<br>'; continue }

    // Akapit
    html += `<p>${fmt(line)}</p>`
  }
  if (inList) html += '</ul>'
  return html
}

function fmt(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

// ── Podgląd dokumentu ─────────────────────────────────────────────────────────
function DocumentPreviewModal({ doc, onClose }: { doc: DocumentInfo; onClose: () => void }) {
  const contentHtml = renderMarkdown(doc.content)

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 32px; color: #111; font-size: 13px; line-height: 1.7; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    h3 { font-size: 14px; font-weight: 600; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    strong { font-weight: 600; }
    code { background: #f3f3f3; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
    br { display: block; margin: 6px 0; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>${contentHtml}</body>
</html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 truncate max-w-md">{doc.title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                         px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Drukuj / PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700
                         hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div
            className="prose prose-sm max-w-none text-gray-800
              [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900
              [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-gray-900 [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-1
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1
              [&_p]:my-1.5 [&_p]:leading-relaxed
              [&_ul]:my-2 [&_ul]:pl-5 [&_li]:my-0.5
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm
              [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5
              [&_strong]:font-semibold
              [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
              [&_hr]:border-gray-200 [&_hr]:my-4"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Karta dokumentu w czacie ──────────────────────────────────────────────────
function DocumentCard({ doc }: { doc: DocumentInfo }) {
  const [open, setOpen] = useState(false)
  const lines = doc.content.split('\n').filter(l => l.trim()).slice(0, 3)

  return (
    <>
      <div
        className="mt-2 border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 cursor-pointer
                   hover:bg-blue-50 transition-colors group"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white border border-blue-200 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800 truncate">{doc.title}</p>
            <p className="text-xs text-blue-500 mt-0.5 truncate">
              {lines[0]?.replace(/^#+\s*/, '') ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700 shrink-0">
            Otwórz
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
      {open && <DocumentPreviewModal doc={doc} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Dymek wiadomości ──────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold
        ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
        {isUser ? 'Ty' : 'AI'}
      </div>
      <div className={`max-w-[72%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-blue-600 text-white rounded-tl-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm'}`}>
          {msg.content}
        </div>
        {msg.document && <DocumentCard doc={msg.document} />}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex flex-row-reverse gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-gray-600">
        AI
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700
                    rounded-lg px-2.5 py-1 text-xs font-medium max-w-[200px]">
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span className="truncate">{file.name}</span>
      <button onClick={onRemove} className="shrink-0 hover:text-blue-900 transition-colors cursor-pointer ml-0.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function ChatPage() {
  const { id, convId } = useParams<{ id: string; convId: string }>()
  const projectId = Number(id)
  const conversationId = Number(convId)

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'upload' | 'project'>('upload')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [toastFiles, setToastFiles] = useState<File[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  })

  const { data: conversations } = useQuery({
    queryKey: ['conversations', projectId],
    queryFn: () => getConversations(projectId),
  })

  const { data: fetchedMessages, isLoading } = useQuery({
    queryKey: ['messages', projectId, conversationId],
    queryFn: () => getMessages(projectId, conversationId),
  })

  useEffect(() => {
    if (fetchedMessages) setLocalMessages(fetchedMessages)
  }, [fetchedMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, sending])

  const conversationTitle =
    conversations?.find((c) => c.id === conversationId)?.title ?? 'Konwersacja'

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && attachedFiles.length === 0) || sending) return

    const displayContent = [
      text,
      attachedFiles.length > 0
        ? `[Załączniki: ${attachedFiles.map((f) => f.name).join(', ')}]`
        : null,
    ].filter(Boolean).join('\n')

    const optimistic: Message = {
      id: Date.now(),
      role: 'user',
      content: displayContent,
      createdAt: new Date().toISOString(),
    }

    const filesToSend = [...attachedFiles]
    setInput('')
    setAttachedFiles([])
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLocalMessages((prev) => [...prev, optimistic])
    setSending(true)

    try {
      const result = await sendMessage(projectId, conversationId, text || displayContent, filesToSend.length > 0 ? filesToSend : undefined)
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.response,
        createdAt: new Date().toISOString(),
        document: result.document ?? null,
      }
      setLocalMessages((prev) => [...prev, aiMsg])
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] })
      if (filesToSend.length > 0) setToastFiles(filesToSend)
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(text)
      setAttachedFiles(filesToSend)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleFileSelected = (file: File) => {
    setAttachedFiles((prev) => [...prev, file])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) setAttachedFiles((prev) => [...prev, ...files])
    e.target.value = ''
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelectExisting = (doc: DocumentResponse) => {
    const ref = `[Dokument: ${doc.name}]`
    setInput((prev) => (prev ? `${prev}\n${ref} ` : `${ref} `))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const removeFile = (index: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !sending

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Link to="/projects" className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">
              Projekty
            </Link>
            <span className="text-gray-300 shrink-0">/</span>
            <Link to={`/projects/${projectId}`}
              className="text-gray-400 hover:text-gray-700 transition-colors truncate max-w-[140px]">
              {project?.name ?? '…'}
            </Link>
            <span className="text-gray-300 shrink-0">/</span>
            <span className="font-medium text-gray-900 truncate max-w-[200px]">{conversationTitle}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-gray-500">{user?.name ?? user?.email}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 !== 0 ? 'flex-row-reverse' : ''} animate-pulse`}>
                  <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                  <div className={`h-10 rounded-2xl ${i % 2 === 0 ? 'bg-blue-100 w-48' : 'bg-gray-200 w-64'}`} />
                </div>
              ))}
            </div>
          )}

          {!isLoading && localMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Zadaj pierwsze pytanie</p>
              <p className="text-xs text-gray-400 mt-1">AI odpowie na podstawie dokumentów projektu</p>
            </div>
          )}

          {localMessages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className={`bg-gray-50 border rounded-2xl px-4 py-3 transition-all
                           focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100
                           ${attachedFiles.length > 0 ? 'border-blue-300' : 'border-gray-200'}`}>

            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachedFiles.map((f, i) => (
                  <FileChip key={i} file={f} onRemove={() => removeFile(i)} />
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Dodaj plik (PDF, obraz)"
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors
                           text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40
                           cursor-pointer disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input ref={fileInputRef} type="file" multiple accept={ACCEPTED}
                className="hidden" onChange={handleNativeFileChange} />

              <button
                type="button"
                onClick={() => { setPickerTab('project'); setPickerOpen(true) }}
                disabled={sending}
                title="Wybierz z projektu"
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors
                           text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40
                           cursor-pointer disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                }}
                onKeyDown={handleKeyDown}
                disabled={sending}
                placeholder="Napisz wiadomość… (Enter — wyślij, Shift+Enter — nowa linia)"
                className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder:text-gray-400
                           focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: '24px', maxHeight: '160px' }}
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200
                           flex items-center justify-center shrink-0 transition-colors cursor-pointer
                           disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">
            AI może popełniać błędy. Weryfikuj ważne informacje w dokumentach projektu.
          </p>
        </div>
      </div>

      {pickerOpen && (
        <DocumentPickerModal
          projectId={projectId}
          tab={pickerTab}
          onTabChange={setPickerTab}
          onClose={() => setPickerOpen(false)}
          onFileSelected={handleFileSelected}
          onSelectExisting={handleSelectExisting}
        />
      )}

      {toastFiles.length > 0 && (
        <AddToProjectToast
          files={toastFiles}
          projectId={projectId}
          onDismiss={() => setToastFiles([])}
        />
      )}
    </div>
  )
}
