import { useState, useRef, useEffect, useCallback } from 'react'
import { useInstances } from '../../context/InstanceContext'
import { sendChatMessage, type ChatMessage as ApiMsg } from '../../lib/api'
import type { Message, Conversation } from '../../lib/types'
import ChatInput, { type AttachedFile } from './ChatInput'
import './ChatWindow.css'

interface Props {
    conversation: Conversation | null
    onCreate:     (title: string, messages: Message[]) => string
    onUpdate:     (id: string, messages: Message[], title?: string) => void
}

// ── Clarification block parsing ───────────────────────────────

interface ClarifyQ {
    id:       string
    label:    string
    type:     'text' | 'select'
    hint?:    string
    options?: string[]
}

interface ClarifyBlock {
    intro:     string
    questions: ClarifyQ[]
}

function parseClarify(content: string): ClarifyBlock | null {
    const m = content.match(/^```clarify\n([\s\S]*?)\n```\s*$/)
    if (!m) return null
    try { return JSON.parse(m[1]) } catch { return null }
}

// ── Main component ────────────────────────────────────────────

export default function ChatWindow({ conversation, onCreate, onUpdate }: Props) {
    const { active } = useInstances()

    const [messages,  setMessages]  = useState<Message[]>(conversation?.messages ?? [])
    const [streaming, setStreaming] = useState(false)

    const convIdRef      = useRef(conversation?.id)
    const pendingTitleRef = useRef<string | undefined>()
    const abortRef       = useRef<AbortController | null>(null)
    const bottomRef      = useRef<HTMLDivElement>(null)

    // Reset when conversation changes (e.g. sidebar click)
    useEffect(() => {
        if (conversation?.id === convIdRef.current) return
        abortRef.current?.abort()
        abortRef.current = null
        convIdRef.current = conversation?.id
        setMessages(conversation?.messages ?? [])
        setStreaming(false)
    }, [conversation?.id, conversation?.messages])

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const persist = useCallback((msgs: Message[]) => {
        const cid = convIdRef.current
        if (!cid) return
        onUpdate(cid, msgs, pendingTitleRef.current)
        pendingTitleRef.current = undefined
    }, [onUpdate])

    const handleSend = useCallback((text: string, _files: AttachedFile[]) => {
        if (!active || !text.trim() || streaming) return

        const userMsg: Message = { id: crypto.randomUUID(), role: 'user',      content: text.trim() }
        const aiMsg:   Message = { id: crypto.randomUUID(), role: 'assistant', content: '' }

        const historyForApi: ApiMsg[] = messages.map(m => ({ role: m.role, content: m.content }))
        const isFirst = messages.length === 0

        // Register conversation on first message
        if (isFirst) {
            const title = text.trim().slice(0, 50)
            pendingTitleRef.current = title
            const newId = onCreate(title, [userMsg])
            convIdRef.current = newId
        }

        const nextMessages = [...messages, userMsg, aiMsg]
        setMessages(nextMessages)
        setStreaming(true)

        const abort = new AbortController()
        abortRef.current = abort

        let accumulated = ''

        sendChatMessage(
            {
                url:              active.url,
                username:         active.username,
                password:         active.password,
                label:            active.label,
                display_name:     active.displayName,
                application_name: active.application?.name ?? null,
                update_set_name:  active.updateSet?.name  ?? null,
            },
            historyForApi,
            text.trim(),
            (chunk) => {
                if (abort.signal.aborted) return
                accumulated += chunk
                const snap = accumulated
                setMessages(prev => {
                    const last = prev[prev.length - 1]
                    if (!last || last.role !== 'assistant') return prev
                    return [...prev.slice(0, -1), { ...last, content: snap }]
                })
            },
            () => {
                if (abort.signal.aborted) return
                setStreaming(false)
                setMessages(prev => {
                    persist(prev)
                    return prev
                })
                abortRef.current = null
            },
            (err) => {
                if (abort.signal.aborted) return
                setStreaming(false)
                setMessages(prev => {
                    const last = prev[prev.length - 1]
                    if (!last || last.role !== 'assistant') return prev
                    const updated = [...prev.slice(0, -1), { ...last, content: `⚠ ${err}` }]
                    persist(updated)
                    return updated
                })
                abortRef.current = null
            },
            abort.signal,
        )
    }, [active, messages, streaming, onCreate, persist])

    const handleClarify = useCallback((answers: Record<string, string>) => {
        const lines = Object.entries(answers).map(([, v]) => `• ${v}`).join('\n')
        handleSend(lines, [])
    }, [handleSend])

    return (
        <main className="chat-window">
            {/* ── Progress bar ── */}
            <div className={`stream-bar ${streaming ? 'stream-bar--active' : ''}`} />

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">⚡</div>
                        <h2 className="chat-empty-title">What would you like to build?</h2>
                        <p className="chat-empty-instance">{active?.url.replace('https://', '') ?? ''}</p>
                        <p className="chat-empty-hint">
                            Describe what you need — Flows, Actions, Subflows, Business Rules, and more.
                        </p>
                    </div>
                ) : (
                    <div className="msg-list">
                        {messages.map((msg, i) => {
                            const isLast       = i === messages.length - 1
                            const isStreaming_  = streaming && isLast && msg.role === 'assistant'
                            const isThinking   = isStreaming_ && msg.content === ''
                            const clarify      = !isStreaming_ ? parseClarify(msg.content) : null
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    isStreaming={isStreaming_}
                                    isThinking={isThinking}
                                    clarify={clarify}
                                    onClarify={handleClarify}
                                />
                            )
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            <ChatInput onSend={handleSend} disabled={streaming} />
        </main>
    )
}

// ── Message bubble ────────────────────────────────────────────

interface BubbleProps {
    message:    Message
    isStreaming: boolean
    isThinking: boolean
    clarify:    ClarifyBlock | null
    onClarify:  (answers: Record<string, string>) => void
}

function MessageBubble({ message, isStreaming, isThinking, clarify, onClarify }: BubbleProps) {
    const isUser = message.role === 'user'

    return (
        <div className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--ai'}`}>
            {!isUser && <div className="msg-avatar">⚡</div>}

            <div className={`msg-bubble ${isUser ? 'msg-bubble--user' : 'msg-bubble--ai'}`}>
                {isThinking ? (
                    <div className="msg-thinking">
                        <span className="thinking-dot" />
                        <span className="thinking-dot" />
                        <span className="thinking-dot" />
                    </div>
                ) : clarify ? (
                    <ClarifyCard block={clarify} onSubmit={onClarify} />
                ) : (
                    <>
                        <pre className="msg-text">{message.content}</pre>
                        {isStreaming && <span className="msg-cursor" />}
                    </>
                )}
            </div>

            {isUser && <div className="msg-avatar msg-avatar--user">you</div>}
        </div>
    )
}

// ── Clarification card ────────────────────────────────────────

interface ClarifyCardProps {
    block:    ClarifyBlock
    onSubmit: (answers: Record<string, string>) => void
}

function ClarifyCard({ block, onSubmit }: ClarifyCardProps) {
    const [answers, setAnswers] = useState<Record<string, string>>(() =>
        Object.fromEntries(block.questions.map(q => [q.id, '']))
    )

    const allFilled = block.questions.every(q => answers[q.id]?.trim())

    const set = (id: string, val: string) =>
        setAnswers(prev => ({ ...prev, [id]: val }))

    const submit = () => {
        if (!allFilled) return
        const formatted = block.questions
            .map(q => `${q.label}: ${answers[q.id]}`)
            .join('\n')
        onSubmit({ _formatted: formatted })
    }

    return (
        <div className="clarify-card">
            <p className="clarify-intro">{block.intro}</p>
            <div className="clarify-questions">
                {block.questions.map(q => (
                    <div key={q.id} className="clarify-q">
                        <label className="clarify-label">{q.label}</label>
                        {q.type === 'select' && q.options ? (
                            <select
                                className="clarify-input"
                                value={answers[q.id]}
                                onChange={e => set(q.id, e.target.value)}
                            >
                                <option value="">Select…</option>
                                {q.options.map(o => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                className="clarify-input"
                                type="text"
                                placeholder={q.hint ?? ''}
                                value={answers[q.id]}
                                onChange={e => set(q.id, e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && allFilled && submit()}
                            />
                        )}
                    </div>
                ))}
            </div>
            <button
                className={`clarify-submit ${allFilled ? '' : 'clarify-submit--disabled'}`}
                onClick={submit}
                disabled={!allFilled}
            >
                Continue →
            </button>
        </div>
    )
}
