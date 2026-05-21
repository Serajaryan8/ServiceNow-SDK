import React, { useState, useRef, useEffect } from 'react'
import { useInstances } from '../../context/InstanceContext'
import { useTheme } from '../../hooks/useTheme'
import AddInstanceModal from '../AddInstanceModal'
import './TopBar.css'

export default function TopBar() {
    const { instances, active, activate, remove } = useInstances()
    const { theme, toggle } = useTheme()
    const [dropOpen, setDropOpen]   = useState(false)
    const [showModal, setShowModal] = useState(false)
    const dropRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node))
                setDropOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const select = (id: string) => { activate(id); setDropOpen(false) }

    const handleRemove = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        remove(id)
    }

    return (
        <>
            <header className="topbar">

                {/* Brand */}
                <div className="topbar-brand">
                    <span className="topbar-logo">⚡</span>
                    <span className="topbar-name">SN Copilot</span>
                </div>

                <div className="topbar-divider" />

                {/* ── Instance switcher ── */}
                <div className="topbar-inst" ref={dropRef}>
                    <button
                        className="inst-trigger"
                        onClick={() => setDropOpen(v => !v)}
                        aria-haspopup="listbox"
                        aria-expanded={dropOpen}
                    >
                        <span className="inst-dot" />
                        <span className="ctx-stack">
                            <span className="ctx-label">Instance</span>
                            <span className="ctx-value">{active?.label ?? '—'}</span>
                        </span>
                        <ChevronIcon open={dropOpen} />
                    </button>

                    {dropOpen && (
                        <div className="inst-dropdown" role="listbox">
                            <p className="drop-section">Instances</p>
                            {instances.map(inst => (
                                <div
                                    key={inst.id}
                                    className={`drop-item ${inst.id === active?.id ? 'drop-item--active' : ''}`}
                                    role="option"
                                    aria-selected={inst.id === active?.id}
                                    onClick={() => select(inst.id)}
                                >
                                    <span className="drop-dot" />
                                    <span className="drop-meta">
                                        <span className="drop-name">{inst.label}</span>
                                        <span className="drop-url">{inst.url.replace('https://', '')}</span>
                                    </span>
                                    {inst.id === active?.id && <CheckIcon />}
                                    <button
                                        className="drop-del"
                                        onClick={e => handleRemove(e, inst.id)}
                                        aria-label={`Remove ${inst.label}`}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                            <div className="drop-divider" />
                            <button
                                className="drop-add"
                                onClick={() => { setDropOpen(false); setShowModal(true) }}
                            >
                                <PlusIcon />
                                Add instance
                            </button>
                        </div>
                    )}
                </div>

                <div className="topbar-divider" />

                {/* ── Application ── */}
                <div className="ctx-pill">
                    <span className="ctx-label">Application</span>
                    <span className="ctx-value">
                        {active?.application?.name ?? 'Global'}
                    </span>
                </div>

                <div className="topbar-divider" />

                {/* ── Update Set ── */}
                <div className={`ctx-pill ${!active?.updateSet ? 'ctx-pill--warn' : ''}`}>
                    <span className="ctx-label">Update Set</span>
                    <span className="ctx-value">
                        {active?.updateSet?.name ?? 'Not set'}
                    </span>
                </div>

                <div className="topbar-divider" />

                {/* ── User ── */}
                <div className="ctx-pill">
                    <span className="ctx-label">User</span>
                    <span className="ctx-value">
                        {active?.displayName ?? '—'}
                    </span>
                </div>

                {/* ── Theme toggle ── */}
                <div className="topbar-actions">
                    <button
                        className="icon-btn"
                        onClick={toggle}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
                </div>

            </header>

            {showModal && <AddInstanceModal onClose={() => setShowModal(false)} />}
        </>
    )
}

/* ── Icons ──────────────────────────────────────────────── */

function ChevronIcon({ open }: { open: boolean }) {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
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

function PlusIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function SunIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function MoonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
