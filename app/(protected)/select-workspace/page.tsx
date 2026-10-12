'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUser, faBriefcase, faPlus, faTrash, faPencil,
    faUserPlus, faCrown, faXmark, faCheck, faChevronRight,
    faGear, faEnvelope, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Workspace = {
    id: string
    name: string
    type: 'personal' | 'business'
    role: 'owner' | 'editor' | 'viewer'
}

type Member = {
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    joined_at: string
}

type Invitation = {
    id: string
    email: string
    role: 'editor' | 'viewer'
    expires_at: string
    accepted_at: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<string, string> = {
    owner: 'Proprietário',
    editor: 'Editor',
    viewer: 'Visualizador',
}

const ROLE_BADGE: Record<string, string> = {
    owner: 'bg-expense/15 text-expense/80 border-expense/40',
    editor: 'bg-warning/15 text-warning/80 border-warning/40',
    viewer: 'bg-muted text-muted-foreground border-input',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SelectWorkspacePage() {
    const { workspaces, setCurrentWorkspace, refreshWorkspaces, canCreateWorkspace, getRemainingLimit, plan, planLimits, loading } = useWorkspace()
    const router = useRouter()
    const supabase = createClient()

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // Create state
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState<'personal' | 'business'>('personal')
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')

    // Manage modal state
    const [managing, setManaging] = useState<Workspace | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loadingModal, setLoadingModal] = useState(false)

    // Rename state
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameTo, setRenameTo] = useState('')
    const [renaming, setRenaming] = useState(false)
    const [renameError, setRenameError] = useState('')

    // Invite state
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
    const [inviting, setInviting] = useState(false)
    const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Delete state
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // -------------------------------------------------------------------------
    // Bootstrap
    // -------------------------------------------------------------------------

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id ?? null)
        })
    }, [])

    // -------------------------------------------------------------------------
    // Select
    // -------------------------------------------------------------------------

    const handleSelect = (ws: Workspace) => {
        setCurrentWorkspace(ws)
        router.push('/')
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        setCreateError('')

        const { data: workspaceId, error } = await supabase
            .rpc('create_workspace', { p_name: newName.trim(), p_type: newType })

        if (error || !workspaceId) {
            setCreateError('Não foi possível criar o espaço. Tente novamente.')
            setCreating(false)
            return
        }

        await refreshWorkspaces()
        setNewName('')
        setNewType('personal')
        setShowCreate(false)
        setCreating(false)
    }

    const cancelCreate = () => {
        setShowCreate(false)
        setNewName('')
        setCreateError('')
    }

    // -------------------------------------------------------------------------
    // Manage modal
    // -------------------------------------------------------------------------

    const openManage = useCallback(async (ws: Workspace) => {
        setManaging(ws)
        setRenameTo(ws.name)
        setIsRenaming(false)
        setRenameError('')
        setConfirmDelete(false)
        setInviteEmail('')
        setInviteRole('editor')
        setInviteMessage(null)
        setLoadingModal(true)

        const [{ data: membersData }, { data: invitesData }] = await Promise.all([
            supabase
                .from('user_workspaces')
                .select('*')
                .eq('workspace_id', ws.id),
            supabase
                .from('workspace_invitations')
                .select('*')
                .eq('workspace_id', ws.id)
                .is('accepted_at', null)
                .gt('expires_at', new Date().toISOString()),
        ])

        setMembers(membersData ?? [])
        setInvitations(invitesData ?? [])
        setLoadingModal(false)
    }, [supabase])

    const closeManage = () => {
        setManaging(null)
        setConfirmDelete(false)
    }

    // -------------------------------------------------------------------------
    // Rename
    // -------------------------------------------------------------------------

    const handleRename = async () => {
        if (!managing || !renameTo.trim()) return
        setRenaming(true)
        setRenameError('')

        const { error } = await supabase
            .from('workspaces')
            .update({ name: renameTo.trim(), updated_at: new Date().toISOString() })
            .eq('id', managing.id)

        if (error) {
            setRenameError('Erro ao renomear. Tente novamente.')
        } else {
            const updated = { ...managing, name: renameTo.trim() }
            setManaging(updated)
            setIsRenaming(false)
            await refreshWorkspaces()
        }
        setRenaming(false)
    }

    // -------------------------------------------------------------------------
    // Invite
    // -------------------------------------------------------------------------

    const handleInvite = async () => {
        if (!managing || !inviteEmail.trim()) return
        setInviting(true)
        setInviteMessage(null)

        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) { setInviting(false); return }

        const { error } = await supabase
            .from('workspace_invitations')
            .insert({
                workspace_id: managing.id,
                inviter_id: authData.user.id,
                email: inviteEmail.trim().toLowerCase(),
                role: inviteRole,
                token: crypto.randomUUID(),
            })

        if (error) {
            setInviteMessage({ type: 'error', text: 'Não foi possível enviar o convite. O email pode já ter sido convidado.' })
        } else {
            setInviteMessage({ type: 'success', text: `Convite enviado para ${inviteEmail.trim().toLowerCase()}.` })
            setInviteEmail('')

            // Refresh pending invitations
            const { data } = await supabase
                .from('workspace_invitations')
                .select('*')
                .eq('workspace_id', managing.id)
                .is('accepted_at', null)
                .gt('expires_at', new Date().toISOString())
            setInvitations(data ?? [])
        }
        setInviting(false)
    }

    const handleCancelInvitation = async (id: string) => {
        await supabase.from('workspace_invitations').delete().eq('id', id)
        setInvitations(prev => prev.filter(i => i.id !== id))
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    const handleDelete = async () => {
        if (!managing) return
        setDeleting(true)

        const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', managing.id)

        if (!error) {
            await refreshWorkspaces()
            closeManage()
        }
        setDeleting(false)
    }

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <div className="min-h-screen bg-background px-4 py-12 flex flex-col items-center justify-center">

            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
                    <Logo size="md" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Seus espaços</h1>
                <p className="text-muted-foreground text-sm mt-1">Selecione ou gerencie um espaço de trabalho</p>
            </div>

            <div className="w-full max-w-lg space-y-2">

                {/* Empty state */}
                {workspaces.length === 0 && (
                    <p className="text-center text-muted-foreground/90 py-8 text-sm">
                        Nenhum espaço encontrado. Crie um abaixo para começar.
                    </p>
                )}

                {/* Workspace list */}
                {workspaces.map(ws => (
                    <div
                        key={ws.id}
                        className="group flex items-center gap-4 bg-card border border-border hover:border-input rounded-xl px-4 py-3.5 transition-all"
                    >
                        {/* Type icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ws.type === 'business'
                            ? 'bg-primary/15 text-expense'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            <FontAwesomeIcon icon={ws.type === 'business' ? faBriefcase : faUser} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground truncate">{ws.name}</span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${ROLE_BADGE[ws.role]}`}>
                                    {ROLE_LABEL[ws.role]}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground/90 mt-0.5">
                                {ws.type === 'business' ? 'Negócios' : 'Pessoal'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => openManage(ws)}
                                title="Gerenciar espaço"
                                className="p-2 text-muted-foreground/90 hover:text-foreground/80 hover:bg-muted rounded-lg transition-colors"
                            >
                                <FontAwesomeIcon icon={faGear} className="text-sm" />
                            </button>
                            <button
                                onClick={() => handleSelect(ws)}
                                className="flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted hover:bg-accent px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Acessar
                                <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Create workspace */}
                <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <FontAwesomeIcon icon={faPlus} />
                        </div>
                        <span className="font-medium text-foreground/80">Criar novo espaço</span>
                    </button>

                    {showCreate && (
                        <div className="px-4 pb-5 border-t border-border">
                            <div className="pt-4 space-y-4">
                                <Input
                                    label="Nome do espaço"
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Ex: Empresa X, Família..."
                                />

                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Tipo</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['personal', 'business'] as const).map(type => {
                                            const canCreate = canCreateWorkspace(type)
                                            const remaining = getRemainingLimit(type)
                                            const typeLabel = type === 'business' ? 'Negócios' : 'Pessoal'
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setNewType(type)}
                                                    disabled={!canCreate}
                                                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg border text-sm font-medium transition-all ${newType === type
                                                        ? 'border-primary bg-primary/10 text-expense'
                                                        : 'border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground/80'
                                                        } ${!canCreate && 'opacity-50 cursor-not-allowed'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <FontAwesomeIcon icon={type === 'business' ? faBriefcase : faUser} />
                                                        {typeLabel}
                                                    </div>
                                                    {!canCreate && remaining === 0 && (
                                                        <span className="text-[10px] text-muted-foreground/90">(limite atingido)</span>
                                                    )}
                                                    {canCreate && remaining > 0 && (
                                                        <span className="text-[10px] text-muted-foreground">{remaining} restante</span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {plan && (
                                        <p className="text-xs text-muted-foreground/90 mt-2">
                                            Plano atual: <span className="text-foreground capitalize">{plan}</span>
                                            {planLimits && (
                                                <span className="ml-1">
                                                    (máx. {planLimits.maxPersonal} pessoal, {planLimits.maxBusiness} negócios)
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>

                                {createError && <p className="text-sm text-expense">{createError}</p>}

                                <div className="flex gap-2">
                                    <Button onClick={handleCreate} loading={creating} disabled={!newName.trim() || !canCreateWorkspace(newType)} size="sm">
                                        Criar espaço
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={cancelCreate}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Manage Modal                                                         */}
            {/* ------------------------------------------------------------------ */}
            {managing && (
                <div
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={e => e.target === e.currentTarget && closeManage()}
                >
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${managing.type === 'business' ? 'bg-primary/15 text-expense' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    <FontAwesomeIcon icon={managing.type === 'business' ? faBriefcase : faUser} />
                                </div>

                                {isRenaming ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            value={renameTo}
                                            onChange={e => setRenameTo(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false) }}
                                            className="bg-muted border border-foreground/30 focus:border-expense rounded-lg px-3 py-1.5 text-foreground text-sm w-40 focus:outline-none transition-colors"
                                        />
                                        <button
                                            onClick={handleRename}
                                            disabled={renaming}
                                            className="text-income hover:text-income/80 p-1 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faCheck} />
                                        </button>
                                        <button
                                            onClick={() => { setIsRenaming(false); setRenameTo(managing.name); setRenameError('') }}
                                            className="text-muted-foreground/90 hover:text-foreground/80 p-1 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h2 className="font-semibold text-foreground truncate">{managing.name}</h2>
                                        {managing.role === 'owner' && (
                                            <button
                                                onClick={() => setIsRenaming(true)}
                                                className="flex-shrink-0 text-muted-foreground/90 hover:text-foreground/80 p-1 transition-colors"
                                                title="Renomear"
                                            >
                                                <FontAwesomeIcon icon={faPencil} className="text-xs" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={closeManage}
                                className="flex-shrink-0 text-muted-foreground/90 hover:text-foreground/80 transition-colors p-1 ml-2"
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        {renameError && (
                            <p className="px-5 pt-3 text-sm text-expense">{renameError}</p>
                        )}

                        <div className="p-5 space-y-6">

                            {/* ---- Members ---- */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider mb-3">
                                    Membros
                                </h3>

                                {loadingModal ? (
                                    <p className="text-sm text-muted-foreground/90">Carregando...</p>
                                ) : members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground/90">Nenhum membro encontrado.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {members.map(m => (
                                            <div
                                                key={m.user_id}
                                                className="flex items-center justify-between py-2.5 border-b border-border/70 last:border-0"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    {m.role === 'owner' && (
                                                        <FontAwesomeIcon icon={faCrown} className="text-expense text-xs" />
                                                    )}
                                                    <span className="text-sm text-foreground/80">
                                                        {/* NOTE: Replace with profile name/email once a profiles table exists */}
                                                        {m.user_id === currentUserId
                                                            ? 'Você'
                                                            : `Usuário ...${m.user_id.slice(-8)}`}
                                                    </span>
                                                </div>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${ROLE_BADGE[m.role]}`}>
                                                    {ROLE_LABEL[m.role]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* ---- Invite ---- */}
                            {(managing.role === 'owner' || managing.role === 'editor') && (
                                <section>
                                    <h3 className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider mb-3">
                                        <FontAwesomeIcon icon={faUserPlus} className="mr-1.5" />
                                        Convidar membro
                                    </h3>

                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                placeholder="email@exemplo.com"
                                                value={inviteEmail}
                                                onChange={e => { setInviteEmail(e.target.value); setInviteMessage(null) }}
                                                className="flex-1 min-w-0 bg-muted border border-input focus:border-expense rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground/90 focus:outline-none transition-colors"
                                            />
                                            <select
                                                value={inviteRole}
                                                onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                                                className="flex-shrink-0 bg-muted border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none"
                                            >
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Visualizador</option>
                                            </select>
                                        </div>

                                        <Button
                                            onClick={handleInvite}
                                            loading={inviting}
                                            disabled={!inviteEmail.trim()}
                                            size="sm"
                                            fullWidth
                                        >
                                            <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                                            Enviar convite
                                        </Button>

                                        {inviteMessage && (
                                            <p className={`text-sm ${inviteMessage.type === 'success' ? 'text-income' : 'text-expense'}`}>
                                                {inviteMessage.text}
                                            </p>
                                        )}
                                    </div>

                                    {/* Pending invitations */}
                                    {invitations.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs text-muted-foreground/90 mb-2">Convites pendentes</p>
                                            <div className="space-y-1.5">
                                                {invitations.map(inv => (
                                                    <div
                                                        key={inv.id}
                                                        className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2.5"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-sm text-foreground/80 truncate">{inv.email}</span>
                                                            <span className={`flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded-full border ${ROLE_BADGE[inv.role]}`}>
                                                                {ROLE_LABEL[inv.role]}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleCancelInvitation(inv.id)}
                                                            className="flex-shrink-0 ml-2 text-muted-foreground/90 hover:text-expense transition-colors p-1"
                                                            title="Cancelar convite"
                                                        >
                                                            <FontAwesomeIcon icon={faXmark} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* ---- Danger zone ---- */}
                            {managing.role === 'owner' && (
                                <section className="border-t border-border pt-5">
                                    <h3 className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider mb-3">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1.5 text-primary" />
                                        Zona de perigo
                                    </h3>

                                    {!confirmDelete ? (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            className="flex items-center gap-2 text-sm text-primary hover:text-expense transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                            Excluir espaço
                                        </button>
                                    ) : (
                                        <div className="bg-expense/10 border border-expense/40 rounded-xl p-4 space-y-3">
                                            <p className="text-sm text-expense/90">
                                                Tem certeza? Todos os dados deste espaço serão excluídos permanentemente. Esta ação não pode ser desfeita.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={handleDelete}
                                                    loading={deleting}
                                                    size="sm"
                                                    className="!bg-primary/90 hover:!bg-primary text-white"
                                                >
                                                    Confirmar exclusão
                                                </Button>
                                                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}