'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faTrash, faEdit, faSave, faTimes, faCreditCard,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'

type PaymentMethod = {
  id: string
  name: string
}

export function PaymentMethodsManager() {
  const { currentWorkspace } = useWorkspace()
  const supabase = createClient()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  // Create state
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [updating, setUpdating] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState('')

  const fetchMethods = async () => {
    if (!currentWorkspace) return
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('name')
    setMethods(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMethods()
  }, [currentWorkspace])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await supabase.from('payment_methods').insert({
      workspace_id: currentWorkspace!.id,
      name: newName.trim(),
    })
    setNewName('')
    await fetchMethods()
    setCreating(false)
  }

  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id)
    setEditName(method.name)
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    setUpdating(true)
    await supabase
      .from('payment_methods')
      .update({ name: editName.trim() })
      .eq('id', editingId)
    setEditingId(null)
    await fetchMethods()
    setUpdating(false)
  }

  const confirmDelete = (id: string, name: string) => {
    setDeletingId(id)
    setDeletingName(name)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await supabase.from('payment_methods').delete().eq('id', deletingId)
    setDeletingId(null)
    setDeletingName('')
    await fetchMethods()
  }

  if (loading) return <div className="text-muted-foreground py-10 text-center">Carregando métodos...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Métodos de pagamento</h2>
        <p className="text-sm text-muted-foreground">Formas de pagamento usadas nas transações (dinheiro, cartão, Pix, etc.).</p>
      </div>

      {/* Add new method card */}
      <div className="bg-muted/50 rounded-xl border border-input p-4">
        <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-primary text-sm" />
          Novo método
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Ex: Dinheiro, Cartão de crédito, Pix, Boleto"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
            <FontAwesomeIcon icon={faSave} className="mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Methods list */}
      {methods.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-input">
          <FontAwesomeIcon icon={faCreditCard} className="text-4xl text-muted-foreground/70 mb-3" />
          <p className="text-muted-foreground">Nenhum método de pagamento cadastrado.</p>
          <p className="text-xs text-muted-foreground/90 mt-1">Adicione seu primeiro método acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {methods.map(method => (
            <div
              key={method.id}
              className="bg-muted rounded-xl border border-input p-4 hover:border-foreground/30 transition-all"
            >
              {editingId === method.id ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome do método"
                    autoFocus
                  />
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCreditCard} className="text-muted-foreground/90" />
                    <span className="text-foreground font-medium">{method.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(method)}
                      className="p-2 text-info hover:bg-info/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => confirmDelete(method.id, method.name)}
                      className="p-2 text-expense hover:bg-expense/10 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-card rounded-xl max-w-md w-full border border-input shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
                <h3 className="text-lg font-semibold">Excluir método de pagamento</h3>
              </div>
              <p className="text-foreground/80">
                Tem certeza que deseja excluir <strong className="text-foreground">"{deletingName}"</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Transações vinculadas a este método ficarão sem método de pagamento.
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