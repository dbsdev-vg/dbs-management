'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'

type NavLink = {
  href: string
  label: string
  icon: IconDefinition
}

export function DesktopSidebar({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r border-border fixed top-16 left-0 bottom-0 overflow-y-auto z-10">
      <div className="flex flex-col gap-1 p-4">
        {links.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-expense'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <FontAwesomeIcon icon={link.icon} className="w-5" />
              <span className="font-medium">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}