'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faTrash, faEdit, faSave, faTimes, faWallet, faBuilding,
  faExclamationTriangle, faUniversity, faMoneyBill, faCreditCard,
} from '@fortawesome/free-solid-svg-icons'

type Caixa = {
  id: string
  name: string
  initial_balance: number
  current_balance: number
  type: 'bank' | 'cash' | 'credit_card'
  created_at: string
}

export function CaixasManager() {
  const { currentWorkspace } = useWorkspace()
  const supabase = createClient()
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState('')
  const [newType, setNewType] = useState<'bank' | 'cash'>('bank')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState('')
  const [editType, setEditType] = useState<'bank' | 'cash' | 'credit_card'>('bank')
  const [updating, setUpdating] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState('')

  const fetchCaixas = async () => {
    if (!currentWorkspace) return
    const { data } = await supabase
      .from('caixas')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: true })
    setCaixas(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCaixas()
  }, [currentWorkspace])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const amount = parseFloat(newBalance) || 0
    await supabase.from('caixas').insert({
      workspace_id: currentWorkspace!.id,
      name: newName.trim(),
      initial_balance: amount,
      current_balance: amount,
      type: newType,
    })
    setNewName('')
    setNewBalance('')
    setNewType('bank')
    await fetchCaixas()
    setCreating(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    setUpdating(true)
    const amount = parseFloat(editBalance) || 0
    await supabase
      .from('caixas')
      .update({ name: editName.trim(), initial_balance: amount, type: editType })
      .eq('id', editingId)
    setEditingId(null)
    await fetchCaixas()
    setUpdating(false)
  }

  const confirmDelete = (id: string, name: string) => {
    setDeletingId(id)
    setDeletingName(name)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await supabase.from('caixas').delete().eq('id', deletingId)
    setDeletingId(null)
    setDeletingName('')
    await fetchCaixas()
  }

  const startEdit = (caixa: Caixa) => {
    setEditingId(caixa.id)
    setEditName(caixa.name)
    setEditBalance(caixa.initial_balance?.toString() || '0')
    setEditType(caixa.type)
  }

  if (loading) return <div className="text-muted-foreground py-10 text-center">Carregando contas...</div>

  const totalBalance = caixas.reduce((sum, c) => sum + (c.current_balance || 0), 0)

  const getTypeIcon = (type: string) => {
    if (type === 'bank') return faUniversity
    if (type === 'cash') return faMoneyBill
    return faCreditCard
  }

  const getTypeLabel = (type: string) => {
    if (type === 'bank') return 'Banco'
    if (type === 'cash') return 'Dinheiro'
    return 'Cartão de crédito'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contas / Caixas</h2>
          <p className="text-sm text-muted-foreground">Gerencie contas bancárias, dinheiro em espécie e cartões de crédito.</p>
        </div>
        <div className="bg-muted/50 rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">Saldo total atual</span>
          <p className="text-xl font-bold text-foreground">R$ {totalBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-xl border border-input p-4">
        <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-primary text-sm" />
          Nova conta
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Nome (ex: Inter, Dinheiro, Nubank)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Saldo inicial (R$)"
            type="number"
            step="0.01"
            value={newBalance}
            onChange={e => setNewBalance(e.target.value)}
            className="sm:w-32"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as 'bank' | 'cash')}
            className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground sm:w-36"
          >
            <option value="bank">Banco</option>
            <option value="cash">Dinheiro</option>
          </select>
          <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
            <FontAwesomeIcon icon={faSave} className="mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {caixas.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-input">
          <FontAwesomeIcon icon={faWallet} className="text-4xl text-muted-foreground/70 mb-3" />
          <p className="text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
          <p className="text-xs text-muted-foreground/90 mt-1">Adicione sua primeira conta acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {caixas.map(caixa => (
            <div key={caixa.id} className="bg-muted rounded-xl border border-input p-4 hover:border-foreground/30 transition-all">
              {editingId === caixa.id ? (
                <div className="space-y-3">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" autoFocus />
                  <Input type="number" step="0.01" value={editBalance} onChange={e => setEditBalance(e.target.value)} placeholder="Saldo inicial" />
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value as any)}
                    className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
                  >
                    <option value="bank">Banco</option>
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartão de crédito (futuro)</option>
                  </select>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={handleUpdate} loading={updating}>
                      <FontAwesomeIcon icon={faSave} className="mr-1" /> Salvar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={getTypeIcon(caixa.type)} className="text-muted-foreground/90" />
                      <span className="text-foreground font-medium">{caixa.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground/80">
                        {getTypeLabel(caixa.type)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Saldo atual</span>
                      <p className="text-lg font-semibold text-income">
                        R$ {caixa.current_balance?.toFixed(2) || '0,00'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(caixa)} className="p-2 text-info hover:bg-info/10 rounded-lg transition-colors" title="Editar">
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button onClick={() => confirmDelete(caixa.id, caixa.name)} className="p-2 text-expense hover:bg-expense/10 rounded-lg transition-colors" title="Excluir">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete modal (same as before) */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-card rounded-xl max-w-md w-full border border-input shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
                <h3 className="text-lg font-semibold">Excluir conta</h3>
              </div>
              <p className="text-foreground/80">
                Tem certeza que deseja excluir a conta <strong className="text-foreground">"{deletingName}"</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Todas as transações vinculadas a esta conta ficarão sem conta associada.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancelar</Button>
                <Button variant="danger" onClick={handleDelete}>Excluir</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}