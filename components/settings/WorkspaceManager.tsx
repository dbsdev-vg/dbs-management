'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser, faTrash, faEnvelope, faXmark, faPencil, faSave, faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'

type Member = {
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  joined_at: string
  full_name?: string | null
  email?: string | null
}

type Invitation = {
  id: string
  email: string
  role: 'editor' | 'viewer'
  expires_at: string
}

export function WorkspaceManager() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!currentWorkspace) return
    const fetchData = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      setCurrentUserId(userData.user?.id || null)

      // 1. Get members from user_workspaces
      const { data: membersData } = await supabase
        .from('user_workspaces')
        .select('user_id, role, joined_at')
        .eq('workspace_id', currentWorkspace.id)

      if (membersData && membersData.length) {
        // 2. Get profiles for these users
        const userIds = membersData.map(m => m.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

        const profileMap = new Map()
        profilesData?.forEach(p => profileMap.set(p.id, p))

        // 3. Merge
        const merged: Member[] = membersData.map(m => ({
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          full_name: profileMap.get(m.user_id)?.full_name,
          email: profileMap.get(m.user_id)?.email,
        }))
        setMembers(merged)
      } else {
        setMembers([])
      }

      // Fetch pending invitations
      const { data: invitesData } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
      setInvitations(invitesData || [])
      setLoading(false)
    }
    fetchData()
  }, [currentWorkspace])

  const currentUserRole = members.find(m => m.user_id === currentUserId)?.role

  const changeRole = async (userId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    if (currentUserRole !== 'owner') return
    await supabase
      .from('user_workspaces')
      .update({ role: newRole })
      .eq('workspace_id', currentWorkspace!.id)
      .eq('user_id', userId)
    // Refresh members (re-fetch)
    const { data: membersData } = await supabase
      .from('user_workspaces')
      .select('user_id, role, joined_at')
      .eq('workspace_id', currentWorkspace!.id)
    if (membersData) {
      const userIds = membersData.map(m => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      const profileMap = new Map()
      profilesData?.forEach(p => profileMap.set(p.id, p))
      const merged = membersData.map(m => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: profileMap.get(m.user_id)?.full_name,
        email: profileMap.get(m.user_id)?.email,
      }))
      setMembers(merged)
    }
  }

  const removeMember = async (userId: string) => {
    if (currentUserRole !== 'owner' || userId === currentUserId) return
    if (!confirm('Remover este membro do workspace?')) return
    await supabase
      .from('user_workspaces')
      .delete()
      .eq('workspace_id', currentWorkspace!.id)
      .eq('user_id', userId)
    // Refresh
    const { data: membersData } = await supabase
      .from('user_workspaces')
      .select('user_id, role, joined_at')
      .eq('workspace_id', currentWorkspace!.id)
    if (membersData) {
      const userIds = membersData.map(m => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      const profileMap = new Map()
      profilesData?.forEach(p => profileMap.set(p.id, p))
      const merged = membersData.map(m => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: profileMap.get(m.user_id)?.full_name,
        email: profileMap.get(m.user_id)?.email,
      }))
      setMembers(merged)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || inviting) return
    setInviting(true)
    setInviteMessage(null)
    const { error } = await supabase.from('workspace_invitations').insert({
      workspace_id: currentWorkspace!.id,
      inviter_id: currentUserId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      token: crypto.randomUUID(),
    })
    if (error) {
      setInviteMessage({ type: 'error', text: 'Erro ao enviar convite. Email já convidado ou inválido.' })
    } else {
      setInviteMessage({ type: 'success', text: `Convite enviado para ${inviteEmail.trim()}.` })
      setInviteEmail('')
      const { data: invitesData } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
      setInvitations(invitesData || [])
    }
    setInviting(false)
  }

  const cancelInvitation = async (id: string) => {
    await supabase.from('workspace_invitations').delete().eq('id', id)
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  const handleRename = async () => {
    if (!newWorkspaceName.trim() || !currentWorkspace) return
    setRenaming(true)
    await supabase
      .from('workspaces')
      .update({ name: newWorkspaceName.trim() })
      .eq('id', currentWorkspace.id)
    await refreshWorkspaces()
    setIsRenaming(false)
    setRenaming(false)
  }

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return
    setDeleting(true)
    await supabase.from('workspaces').delete().eq('id', currentWorkspace.id)
    await refreshWorkspaces()
    window.location.href = '/select-workspace'
  }

  if (loading) return <div className="text-muted-foreground py-10 text-center">Carregando informações do espaço...</div>

  return (
    <div className="space-y-8">
      {/* Workspace name */}
      <div>
        <h3 className="text-foreground font-medium mb-3">Nome do espaço</h3>
        {isRenaming ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Input value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} className="flex-1" autoFocus />
            <div className="flex gap-2">
              <Button onClick={handleRename} loading={renaming} size="sm"><FontAwesomeIcon icon={faSave} className="mr-1" /> Salvar</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsRenaming(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-foreground/80">{currentWorkspace?.name}</span>
            <Button size="sm" onClick={() => { setNewWorkspaceName(currentWorkspace?.name || ''); setIsRenaming(true); }}>
              <FontAwesomeIcon icon={faPencil} /> Renomear
            </Button>
          </div>
        )}
      </div>

      {/* Members section */}
      <div className="border-t border-border pt-6">
        <h3 className="text-foreground font-medium mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faUser} /> Membros ({members.length})</h3>
        <div className="space-y-2">
          {members.map(m => {
            const displayName = m.full_name || m.email || m.user_id.slice(0, 8)
            return (
              <div key={m.user_id} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                <div>
                  <p className="text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{m.role === 'owner' ? 'Proprietário' : m.role === 'editor' ? 'Editor' : 'Visualizador'}</p>
                </div>
                {currentUserRole === 'owner' && m.user_id !== currentUserId && (
                  <div className="flex gap-2">
                    <select value={m.role} onChange={e => changeRole(m.user_id, e.target.value as any)} className="bg-muted border border-input rounded px-2 py-1 text-sm text-foreground">
                      <option value="owner">Proprietário</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                    <button onClick={() => removeMember(m.user_id)} className="text-expense hover:text-expense/80 p-1"><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                )}
                {m.user_id === currentUserId && <span className="text-xs bg-accent text-foreground/80 px-2 py-1 rounded">Você</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite section */}
      {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
        <div className="border-t border-border pt-6">
          <h3 className="text-foreground font-medium mb-3">Convidar novo membro</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="email@exemplo.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="flex-1" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')} className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground">
              <option value="editor">Editor</option>
              <option value="viewer">Visualizador</option>
            </select>
            <Button onClick={handleInvite} loading={inviting}><FontAwesomeIcon icon={faEnvelope} className="mr-1" /> Enviar convite</Button>
          </div>
          {inviteMessage && <p className={`text-sm mt-2 ${inviteMessage.type === 'success' ? 'text-income' : 'text-expense'}`}>{inviteMessage.text}</p>}
        </div>
      )}

      {/* Pending invitations (owner only) */}
      {currentUserRole === 'owner' && invitations.length > 0 && (
        <div className="border-t border-border pt-6">
          <h3 className="text-foreground font-medium mb-3">Convites pendentes</h3>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                <div><p className="text-foreground">{inv.email}</p><p className="text-xs text-muted-foreground">Papel: {inv.role === 'editor' ? 'Editor' : 'Visualizador'} · Expira em {new Date(inv.expires_at).toLocaleDateString()}</p></div>
                <button onClick={() => cancelInvitation(inv.id)} className="text-expense hover:text-expense/80 p-1"><FontAwesomeIcon icon={faXmark} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {currentUserRole === 'owner' && (
        <div className="border-t border-expense/40 pt-6">
          <h3 className="text-primary font-medium mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faExclamationTriangle} /> Zona de perigo</h3>
          {!confirmDelete ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}><FontAwesomeIcon icon={faTrash} /> Excluir espaço</Button>
          ) : (
            <div className="bg-expense/10 border border-expense/40 rounded-xl p-4 space-y-3">
              <p className="text-sm text-expense/90">Tem certeza? Todos os dados deste espaço serão excluídos permanentemente. Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleDeleteWorkspace} loading={deleting}>Confirmar exclusão</Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}