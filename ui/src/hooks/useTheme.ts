import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem('sn-theme') as Theme) ?? 'dark'
    )

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('sn-theme', theme)
    }, [theme])

    return {
        theme,
        toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    }
}
