import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { ApplicationInfo, UpdateSetInfo } from '../lib/api'

export interface SNInstance {
    id:          string
    label:       string
    url:         string           // always stored without trailing slash
    username:    string
    password:    string
    displayName: string           // from SN validation
    email:       string           // from SN validation
    application: ApplicationInfo | null   // current app scope
    updateSet:   UpdateSetInfo   | null   // current update set
}

interface InstanceContextValue {
    instances: SNInstance[]
    active:    SNInstance | null
    add:       (data: Omit<SNInstance, 'id'>) => void
    remove:    (id: string) => void
    activate:  (id: string) => void
}

const Ctx = createContext<InstanceContextValue | null>(null)

const INSTANCES_KEY = 'sn-instances'
const ACTIVE_KEY    = 'sn-active'

function load(): SNInstance[] {
    try { return JSON.parse(localStorage.getItem(INSTANCES_KEY) ?? '[]') }
    catch { return [] }
}

export function InstanceProvider({ children }: { children: ReactNode }) {
    const [instances, setInstances] = useState<SNInstance[]>(load)
    const [activeId, setActiveId]   = useState<string | null>(
        () => localStorage.getItem(ACTIVE_KEY)
    )

    const active = instances.find(i => i.id === activeId) ?? instances[0] ?? null

    const persist = (next: SNInstance[]) => {
        localStorage.setItem(INSTANCES_KEY, JSON.stringify(next))
        setInstances(next)
    }

    const add = useCallback((data: Omit<SNInstance, 'id'>) => {
        const inst: SNInstance = { ...data, url: data.url.replace(/\/$/, ''), id: crypto.randomUUID() }
        setInstances(prev => {
            const next = [...prev, inst]
            localStorage.setItem(INSTANCES_KEY, JSON.stringify(next))
            return next
        })
        setActiveId(inst.id)
        localStorage.setItem(ACTIVE_KEY, inst.id)
    }, [])

    const remove = useCallback((id: string) => {
        setInstances(prev => {
            const next = prev.filter(i => i.id !== id)
            persist(next)
            return next
        })
        setActiveId(prev => {
            if (prev !== id) return prev
            const remaining = instances.filter(i => i.id !== id)
            const newActive = remaining[0]?.id ?? null
            newActive ? localStorage.setItem(ACTIVE_KEY, newActive) : localStorage.removeItem(ACTIVE_KEY)
            return newActive
        })
    }, [instances])

    const activate = useCallback((id: string) => {
        setActiveId(id)
        localStorage.setItem(ACTIVE_KEY, id)
    }, [])

    return (
        <Ctx.Provider value={{ instances, active, add, remove, activate }}>
            {children}
        </Ctx.Provider>
    )
}

export function useInstances() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useInstances must be inside InstanceProvider')
    return ctx
}
