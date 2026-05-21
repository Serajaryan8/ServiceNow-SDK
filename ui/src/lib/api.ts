const BASE = 'http://localhost:8000'

// ── Auth types ────────────────────────────────────────────────

export interface ValidatedUser {
    username:     string
    display_name: string
    email:        string
}

export interface ApplicationInfo {
    sys_id: string
    name:   string
    scope:  string
}

export interface UpdateSetInfo {
    sys_id: string
    name:   string
    state:  string
}

export interface ValidateResult {
    user:        ValidatedUser
    application: ApplicationInfo | null
    update_set:  UpdateSetInfo  | null
}

export interface ValidateInstancePayload {
    url:      string
    username: string
    password: string
}

export async function validateInstance(
    payload: ValidateInstancePayload
): Promise<ValidateResult> {
    let res: Response
    try {
        res = await fetch(`${BASE}/auth/validate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        })
    } catch {
        throw new Error('Cannot reach the SN Copilot backend. Is it running on port 8000?')
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(body.detail ?? `Unexpected error (${res.status})`)
    }

    const data = await res.json()
    return {
        user:        data.user,
        application: data.application ?? null,
        update_set:  data.update_set  ?? null,
    }
}

// ── SN Table API types ────────────────────────────────────────

export interface SNTable  { name: string; label: string; sys_id: string }
export interface SNField  { element: string; column_label: string; internal_type: string; choice: string; mandatory: string }
export interface SNChoice { value: string; label: string; sequence: string }

interface SNCreds { url: string; username: string; password: string }

function snHeaders(creds: SNCreds): Record<string, string> {
    return {
        'x-sn-url':      creds.url,
        'x-sn-username': creds.username,
        'x-sn-password': creds.password,
    }
}

export async function listTables(creds: SNCreds, q: string): Promise<SNTable[]> {
    const res = await fetch(`${BASE}/sn/tables?q=${encodeURIComponent(q)}`, {
        headers: snHeaders(creds),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

export async function listFields(creds: SNCreds, table: string): Promise<SNField[]> {
    const res = await fetch(`${BASE}/sn/tables/${table}/fields`, {
        headers: snHeaders(creds),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

export async function listChoices(creds: SNCreds, table: string, field: string): Promise<SNChoice[]> {
    const res = await fetch(
        `${BASE}/sn/tables/${table}/choices?field=${encodeURIComponent(field)}`,
        { headers: snHeaders(creds) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

// ── Chat / streaming ──────────────────────────────────────────

export interface ChatMessage {
    role:    'user' | 'assistant'
    content: string
}

export interface ChatInstanceCtx {
    url:              string
    username:         string
    password:         string
    label:            string
    display_name:     string
    application_name: string | null
    update_set_name:  string | null
}

export async function sendChatMessage(
    instance: ChatInstanceCtx,
    history:  ChatMessage[],
    message:  string,
    onChunk:  (text: string) => void,
    onDone:   () => void,
    onError:  (err: string) => void,
    signal?:  AbortSignal,
): Promise<void> {
    let res: Response
    try {
        res = await fetch(`${BASE}/chat/message`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ instance, history, message }),
            signal,
        })
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        onError('Cannot reach the backend. Is it running on port 8000?')
        return
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        onError(body.detail ?? `Error ${res.status}`)
        return
    }

    const reader  = res.body!.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    while (true) {
        if (signal?.aborted) break
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') { onDone(); return }
            try {
                const parsed = JSON.parse(data)
                if (parsed.text)  onChunk(parsed.text)
                if (parsed.error) onError(parsed.error)
            } catch { /* ignore malformed lines */ }
        }
    }
    onDone()
}
