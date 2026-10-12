'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="flex items-center justify-center w-9 h-9 rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
    </button>
  )
}
