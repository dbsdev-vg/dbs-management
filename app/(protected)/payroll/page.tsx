'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export default function PayrollPage() {
  const { currentWorkspace, loading } = useWorkspace()
  const router = useRouter()

  useEffect(() => {
    if (!loading && currentWorkspace?.type !== 'business') {
      router.replace('/')
    }
  }, [loading, currentWorkspace, router])

  if (loading) return <div className="text-foreground p-6">Carregando...</div>
  if (currentWorkspace?.type !== 'business') return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Folha de Pagamento</h1>
      <p className="text-muted-foreground">Em breve: cálculo de salários, proventos, descontos, eSocial e integração com a contabilidade.</p>
    </div>
  )
}