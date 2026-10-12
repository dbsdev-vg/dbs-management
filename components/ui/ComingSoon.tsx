'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { Card } from '@/components/ui/Card'

type Props = {
  title: string
  description: string
  icon: IconDefinition
  note?: string
}

export function ComingSoon({ title, description, icon, note }: Props) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 text-center border-border bg-card/50">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <FontAwesomeIcon icon={icon} className="text-2xl text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        {note && <p className="text-xs text-muted-foreground/90 mb-6">{note}</p>}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-accent border border-input text-foreground/80 text-sm transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          Voltar ao Dashboard
        </Link>
      </Card>
    </div>
  )
}
