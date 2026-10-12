'use client'

import { faCalculator } from '@fortawesome/free-solid-svg-icons'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function TaxesPage() {
  return (
    <ComingSoon
      title="Impostos"
      icon={faCalculator}
      description="Estimativas de impostos, DRE e apuração de tributos para o seu negócio."
      note="Disponível com o módulo de negócios."
    />
  )
}
