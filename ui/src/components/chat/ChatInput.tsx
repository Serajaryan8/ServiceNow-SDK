import { useRef, useState, KeyboardEvent, ChangeEvent } from 'react'
import './ChatInput.css'

export interface AttachedFile {
    id: string
    file: File
}

interface Props {
    onSend?:  (message: string, files: AttachedFile[]) => void
    disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: Props) {
    const [text, setText]         = useState('')
    const [files, setFiles]       = useState<AttachedFile[]>([])
    const textareaRef             = useRef<HTMLTextAreaElement>(null)
    const fileInputRef            = useRef<HTMLInputElement>(null)

    const canSend = !disabled && (text.trim().length > 0 || files.length > 0)

    const autoResize = () => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value)
        autoResize()
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
        }
    }

    const submit = () => {
        if (!canSend) return
        onSend?.(text.trim(), files)
        setText('')
        setFiles([])
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.focus()
        }
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []).map(file => ({
            id:   crypto.randomUUID(),
            file,
        }))
        setFiles(prev => [...prev, ...selected])
        e.target.value = ''
    }

    const removeFile = (id: string) =>
        setFiles(prev => prev.filter(f => f.id !== id))

    return (
        <div className="chat-input-root">
            {files.length > 0 && (
                <div className="chat-input-files">
                    {files.map(({ id, file }) => (
                        <span key={id} className="file-chip">
                            <FileIcon />
                            <span className="file-chip-name">{file.name}</span>
                            <button
                                className="file-chip-remove"
                                onClick={() => removeFile(id)}
                                aria-label={`Remove ${file.name}`}
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="chat-input-bar">
                <button
                    className="input-icon-btn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach files"
                    title="Attach files"
                    type="button"
                >
                    <AttachIcon />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="file-input-hidden"
                    onChange={handleFileChange}
                    aria-hidden
                    tabIndex={-1}
                />

                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder={disabled ? 'Waiting for response…' : 'Describe what you want to build… (Shift+Enter for new line)'}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={disabled}
                    aria-label="Message input"
                />

                <button
                    className={`send-btn ${canSend ? 'send-btn--active' : ''}`}
                    onClick={submit}
                    disabled={!canSend}
                    aria-label="Send message"
                    type="button"
                >
                    <SendIcon />
                </button>
            </div>

            <p className="chat-input-hint">
                Enter to send · Shift+Enter for new line
            </p>
        </div>
    )
}

function AttachIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function SendIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function FileIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}
