import type { Conversation } from '../../lib/types'
import './Sidebar.css'

interface Props {
    conversations: Conversation[]
    activeId:      string | null
    onSelect:      (id: string) => void
    onNew:         () => void
    onDelete:      (id: string) => void
}

function relativeTime(ts: number): string {
    const diff = Date.now() - ts
    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (mins  <  1) return 'just now'
    if (mins  < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
}

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="sidebar-title">Conversations</span>
                <button className="icon-btn" onClick={onNew} aria-label="New conversation" title="New conversation">
                    <PenIcon />
                </button>
            </div>

            <div className="sidebar-body">
                {conversations.length === 0 ? (
                    <div className="sidebar-empty">
                        <ChatIcon />
                        <p>No conversations yet</p>
                        <p className="sidebar-empty-hint">Start typing to begin</p>
                    </div>
                ) : (
                    <div className="conv-list">
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`conv-item ${conv.id === activeId ? 'conv-item--active' : ''}`}
                                onClick={() => onSelect(conv.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && onSelect(conv.id)}
                            >
                                <span className="conv-title">{conv.title}</span>
                                <span className="conv-time">{relativeTime(conv.updatedAt)}</span>
                                <button
                                    className="conv-del"
                                    onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
                                    aria-label={`Delete ${conv.title}`}
                                    title="Delete"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    )
}

function PenIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M10.5 1.5a2.12 2.12 0 013 3L5 13H2v-3L10.5 1.5z"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function ChatIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function TrashIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 3h9M5 3V2h3v1M4 3l.5 8h4l.5-8"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
