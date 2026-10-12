import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { WorkspaceWrapper } from '@/components/WorkspaceWrapper'
import { LayoutClient } from '@/components/LayoutClient'
import { ToastProvider } from '@/contexts/ToastContext'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <WorkspaceWrapper>
      <LayoutClient userEmail={user.email}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LayoutClient>
    </WorkspaceWrapper>
  )
}