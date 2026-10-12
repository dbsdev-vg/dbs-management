'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

type ThemeContextType = {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'darkMode'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // null = never chose → default dark
    return stored === 'false' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Sync React state with whatever the layout's inline script already applied
  useEffect(() => {
    setThemeState(readStoredTheme())
  }, [])

  const apply = (t: Theme) => {
    document.documentElement.classList.toggle('dark', t === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, String(t === 'dark'))
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    setThemeState(t)
  }

  const value: ThemeContextType = {
    theme,
    toggle: () => apply(theme === 'dark' ? 'light' : 'dark'),
    setTheme: apply,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
