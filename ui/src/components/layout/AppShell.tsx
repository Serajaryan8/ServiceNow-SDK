import { useState, useCallback } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import ChatWindow from '../chat/ChatWindow'
import type { Message, Conversation } from '../../lib/types'
import './AppShell.css'

const CONVS_KEY       = 'sn-conversations'
const ACTIVE_CONV_KEY = 'sn-active-conv'

function loadConversations(): Conversation[] {
    try { return JSON.parse(localStorage.getItem(CONVS_KEY) ?? '[]') }
    catch { return [] }
}

function saveConversations(convs: Conversation[]) {
    localStorage.setItem(CONVS_KEY, JSON.stringify(convs))
}

export default function AppShell() {
    const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
    const [activeId, setActiveId] = useState<string | null>(() => {
        const saved = localStorage.getItem(ACTIVE_CONV_KEY)
        const convs = loadConversations()
        return saved && convs.some(c => c.id === saved) ? saved : convs[0]?.id ?? null
    })

    const activeConv = conversations.find(c => c.id === activeId) ?? null

    const createConversation = useCallback((title: string, messages: Message[]): string => {
        const conv: Conversation = {
            id:        crypto.randomUUID(),
            title:     title.slice(0, 50),
            messages,
            updatedAt: Date.now(),
        }
        setConversations(prev => {
            const next = [conv, ...prev]
            saveConversations(next)
            return next
        })
        setActiveId(conv.id)
        localStorage.setItem(ACTIVE_CONV_KEY, conv.id)
        return conv.id
    }, [])

    const updateConversation = useCallback((id: string, messages: Message[], title?: string) => {
        setConversations(prev => {
            const next = prev.map(c =>
                c.id === id
                    ? { ...c, messages, updatedAt: Date.now(), ...(title ? { title: title.slice(0, 50) } : {}) }
                    : c
            )
            saveConversations(next)
            return next
        })
    }, [])

    const deleteConversation = useCallback((id: string) => {
        setConversations(prev => {
            const next = prev.filter(c => c.id !== id)
            saveConversations(next)
            if (activeId === id) {
                const newActive = next[0]?.id ?? null
                setActiveId(newActive)
                if (newActive) localStorage.setItem(ACTIVE_CONV_KEY, newActive)
                else           localStorage.removeItem(ACTIVE_CONV_KEY)
            }
            return next
        })
    }, [activeId])

    const selectConversation = useCallback((id: string) => {
        setActiveId(id)
        localStorage.setItem(ACTIVE_CONV_KEY, id)
    }, [])

    const newConversation = useCallback(() => {
        setActiveId(null)
        localStorage.removeItem(ACTIVE_CONV_KEY)
    }, [])

    return (
        <div className="app-shell">
            <TopBar />
            <div className="app-body">
                <Sidebar
                    conversations={conversations}
                    activeId={activeId}
                    onSelect={selectConversation}
                    onNew={newConversation}
                    onDelete={deleteConversation}
                />
                <ChatWindow
                    key={activeId ?? '__new__'}
                    conversation={activeConv}
                    onCreate={createConversation}
                    onUpdate={updateConversation}
                />
            </div>
        </div>
    )
}
