import { useEffect, useRef } from 'react'
import { useInstances } from '../context/InstanceContext'
import { useInstanceForm } from '../hooks/useInstanceForm'
import './AddInstanceModal.css'

interface Props { onClose: () => void }

export default function AddInstanceModal({ onClose }: Props) {
    const { add }    = useInstances()
    const firstInput = useRef<HTMLInputElement>(null)

    const { form, setField, error, loading, submit } = useInstanceForm({
        onSuccess: (fields, result) => {
            add({
                label:       fields.label.trim(),
                url:         fields.url,
                username:    fields.username,
                password:    fields.password,
                displayName: result.user.display_name,
                email:       result.user.email,
                application: result.application,
                updateSet:   result.update_set,
            })
            onClose()
        },
    })

    useEffect(() => { firstInput.current?.focus() }, [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose, loading])

    return (
        <div className="modal-backdrop" onClick={() => !loading && onClose()}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>

                <div className="modal-header">
                    <span className="modal-title">Add Instance</span>
                    <button className="icon-btn" onClick={onClose} disabled={loading} aria-label="Close">✕</button>
                </div>

                <form className="modal-body" onSubmit={submit}>
                    {error && <p className="modal-error">{error}</p>}

                    <label className="field-label">
                        Label
                        <input
                            ref={firstInput}
                            className="field-input"
                            type="text"
                            placeholder="Production"
                            value={form.label}
                            onChange={setField('label')}
                            required
                            disabled={loading}
                        />
                    </label>

                    <label className="field-label">
                        Instance URL
                        <input
                            className="field-input"
                            type="url"
                            placeholder="https://dev12345.service-now.com"
                            value={form.url}
                            onChange={setField('url')}
                            required
                            disabled={loading}
                        />
                    </label>

                    <label className="field-label">
                        Username
                        <input
                            className="field-input"
                            type="text"
                            placeholder="admin"
                            value={form.username}
                            onChange={setField('username')}
                            required
                            autoComplete="username"
                            disabled={loading}
                        />
                    </label>

                    <label className="field-label">
                        Password
                        <input
                            className="field-input"
                            type="password"
                            value={form.password}
                            onChange={setField('password')}
                            required
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </label>

                    <div className="modal-footer">
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Validating…' : 'Connect'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )
}
