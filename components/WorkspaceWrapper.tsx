// WorkspaceWrapper.tsx
'use client'

import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { workspaces, currentWorkspace, loading } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't do anything until the fetch is done
    if (loading) return

    const isSelectPage = pathname === '/select-workspace'

    if (!isSelectPage && workspaces.length === 0) {
      router.push('/select-workspace')
      return
    }

    if (!isSelectPage && workspaces.length > 0 && !currentWorkspace) {
      router.push('/select-workspace')
    }
  }, [loading, workspaces, currentWorkspace, pathname, router])

  // Render nothing while loading to avoid flash of wrong content
  if (loading) return null

  return <>{children}</>
}

export function WorkspaceWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceGuard>{children}</WorkspaceGuard>
    </WorkspaceProvider>
  )
}