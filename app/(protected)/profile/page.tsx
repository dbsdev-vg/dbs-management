'use client'

import { faUser } from '@fortawesome/free-solid-svg-icons'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function ProfilePage() {
  return (
    <ComingSoon
      title="Perfil"
      icon={faUser}
      description="Gerencie seus dados pessoais, foto e preferências de conta."
      note="A edição completa do perfil chega em uma próxima fase."
    />
  )
}
