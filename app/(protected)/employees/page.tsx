'use client'

import { faUsers } from '@fortawesome/free-solid-svg-icons'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function EmployeesPage() {
  return (
    <ComingSoon
      title="Funcionários"
      icon={faUsers}
      description="Cadastro de funcionários, cargos e informações trabalhistas."
      note="Disponível com o módulo de negócios."
    />
  )
}
