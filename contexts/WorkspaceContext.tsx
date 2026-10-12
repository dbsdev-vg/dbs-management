'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Workspace = {
  id: string
  name: string
  type: 'personal' | 'business'
  role: 'owner' | 'editor' | 'viewer'
}

type PlanLimits = {
  maxPersonal: number
  maxBusiness: number
}

type WorkspaceContextType = {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  loading: boolean
  plan: string | null
  planLimits: PlanLimits | null
  canCreateWorkspace: (type: 'personal' | 'business') => boolean
  getRemainingLimit: (type: 'personal' | 'business') => number
  setCurrentWorkspace: (workspace: Workspace) => void
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string | null>(null)
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const supabase = createClient()

  const fetchWorkspacesAndPlan = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }

    // 1. Fetch user's plan from profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userData.user.id)
      .single()
    const userPlan = profileData?.plan || null
    setPlan(userPlan)

    // 2. Fetch plan limits from plans table
    if (userPlan) {
      const { data: limitsData } = await supabase
        .from('plans')
        .select('max_personal_workspaces, max_business_workspaces')
        .eq('id', userPlan)
        .single()
      if (limitsData) {
        setPlanLimits({
          maxPersonal: limitsData.max_personal_workspaces,
          maxBusiness: limitsData.max_business_workspaces,
        })
      } else {
        setPlanLimits(null)
      }
    } else {
      setPlanLimits(null)
    }

    // 3. Fetch user's workspaces
    const { data, error } = await supabase
      .from('user_workspaces')
      .select(`
        workspace_id,
        role,
        workspaces:workspace_id ( name, type )
      `)
      .eq('user_id', userData.user.id)

    if (error || !data) {
      setLoading(false)
      return
    }

    const mapped: Workspace[] = data.map((item: any) => ({
      id: item.workspace_id,
      name: item.workspaces.name,
      type: item.workspaces.type,
      role: item.role,
    }))

    setWorkspaces(mapped)

    const storedId = localStorage.getItem('currentWorkspaceId')
    const stored = mapped.find(w => w.id === storedId)
    if (stored) setCurrentWorkspace(stored)
    else if (mapped.length === 1) setCurrentWorkspace(mapped[0])

    setLoading(false)
  }

  useEffect(() => {
    fetchWorkspacesAndPlan()
  }, [])

  const setWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace)
    localStorage.setItem('currentWorkspaceId', workspace.id)
  }

  // Helper functions using planLimits (from DB)
  const canCreateWorkspace = (type: 'personal' | 'business') => {
    if (!planLimits) return false
    const count = workspaces.filter(w => w.type === type).length
    if (type === 'personal') return count < planLimits.maxPersonal
    return count < planLimits.maxBusiness
  }

  const getRemainingLimit = (type: 'personal' | 'business') => {
    if (!planLimits) return 0
    const count = workspaces.filter(w => w.type === type).length
    if (type === 'personal') return Math.max(0, planLimits.maxPersonal - count)
    return Math.max(0, planLimits.maxBusiness - count)
  }

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        loading,
        plan,
        planLimits,
        canCreateWorkspace,
        getRemainingLimit,
        setCurrentWorkspace: setWorkspace,
        refreshWorkspaces: fetchWorkspacesAndPlan,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return context
}