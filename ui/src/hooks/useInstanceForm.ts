import { useState, FormEvent } from 'react'
import { validateInstance, ValidateResult } from '../lib/api'

export interface InstanceFormFields {
    label:    string
    url:      string
    username: string
    password: string
}

interface UseInstanceFormOptions {
    onSuccess: (fields: InstanceFormFields, result: ValidateResult) => void
}

const EMPTY: InstanceFormFields = { label: '', url: '', username: '', password: '' }

export function useInstanceForm({ onSuccess }: UseInstanceFormOptions) {
    const [form, setForm]       = useState<InstanceFormFields>(EMPTY)
    const [error, setError]     = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const setField = (field: keyof InstanceFormFields) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }))

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        const url = form.url.trim()
        if (!url.startsWith('https://')) {
            setError('Instance URL must start with https://')
            return
        }

        setLoading(true)
        try {
            const result = await validateInstance({
                url,
                username: form.username.trim(),
                password: form.password,
            })
            onSuccess({ ...form, url }, result)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Validation failed')
        } finally {
            setLoading(false)
        }
    }

    return { form, setField, error, loading, submit }
}
