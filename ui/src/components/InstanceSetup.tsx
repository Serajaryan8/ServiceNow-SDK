import { useInstances } from '../context/InstanceContext'
import { useInstanceForm } from '../hooks/useInstanceForm'
import './InstanceSetup.css'

export default function InstanceSetup() {
    const { add } = useInstances()

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
        },
    })

    return (
        <div className="setup-root">
            <div className="setup-card">
                <div className="setup-brand">
                    <span className="setup-logo">⚡</span>
                    <h1 className="setup-title">SN Copilot</h1>
                </div>

                <p className="setup-subtitle">
                    Connect your ServiceNow instance to get started
                </p>

                <form className="setup-form" onSubmit={submit}>
                    {error && <p className="setup-error">{error}</p>}

                    <label className="field-label">
                        Instance Label
                        <input
                            className="field-input"
                            type="text"
                            placeholder="e.g. Development"
                            value={form.label}
                            onChange={setField('label')}
                            required
                            autoFocus
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

                    <button className="btn-primary setup-submit" type="submit" disabled={loading}>
                        {loading ? 'Validating…' : 'Connect Instance'}
                    </button>
                </form>
            </div>
        </div>
    )
}
