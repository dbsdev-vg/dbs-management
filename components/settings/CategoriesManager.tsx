'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faTrash, faEdit, faSave, faTimes, faTags,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
  color?: string
}

export function CategoriesManager() {
  const { currentWorkspace } = useWorkspace()
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Create state
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'income' | 'expense'>('expense')
  const [newColor, setNewColor] = useState('#dc2626')
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'income' | 'expense'>('expense')
  const [editColor, setEditColor] = useState('#dc2626')
  const [updating, setUpdating] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState('')

  const fetchCategories = async () => {
    if (!currentWorkspace) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('type', { ascending: true })
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [currentWorkspace])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await supabase.from('categories').insert({
      workspace_id: currentWorkspace!.id,
      name: newName.trim(),
      type: newType,
      color: newColor,
    })
    setNewName('')
    setNewColor('#dc2626')
    await fetchCategories()
    setCreating(false)
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditType(cat.type)
    setEditColor(cat.color || '#dc2626')
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    setUpdating(true)
    await supabase
      .from('categories')
      .update({ name: editName.trim(), type: editType, color: editColor })
      .eq('id', editingId)
    setEditingId(null)
    await fetchCategories()
    setUpdating(false)
  }

  const confirmDelete = (id: string, name: string) => {
    setDeletingId(id)
    setDeletingName(name)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await supabase.from('categories').delete().eq('id', deletingId)
    setDeletingId(null)
    setDeletingName('')
    await fetchCategories()
  }

  if (loading) return <div className="text-muted-foreground py-10 text-center">Carregando categorias...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Categorias</h2>
        <p className="text-sm text-muted-foreground">Organize suas receitas e despesas por categoria.</p>
      </div>

      {/* Add new category card */}
      <div className="bg-muted/50 rounded-xl border border-input p-4">
        <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-primary text-sm" />
          Nova categoria
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Nome (ex: Alimentação, Salário)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as any)}
            className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground sm:w-36"
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-10 h-10 rounded border border-input bg-muted cursor-pointer"
              title="Cor da categoria"
            />
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              <FontAwesomeIcon icon={faSave} className="mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-input">
          <FontAwesomeIcon icon={faTags} className="text-4xl text-muted-foreground/70 mb-3" />
          <p className="text-muted-foreground">Nenhuma categoria cadastrada.</p>
          <p className="text-xs text-muted-foreground/90 mt-1">Adicione sua primeira categoria acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="bg-muted rounded-xl border border-input p-4 hover:border-foreground/30 transition-all"
            >
              {editingId === cat.id ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome"
                    autoFocus
                  />
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value as any)}
                    className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-full h-10 rounded border border-input bg-muted cursor-pointer"
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.color || '#dc2626' }}
                      />
                      <span className="text-foreground font-medium">{cat.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cat.type === 'income'
                          ? 'bg-income/15 text-income/80'
                          : 'bg-expense/15 text-expense/80'
                      }`}>
                        {cat.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-2 text-info hover:bg-info/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => confirmDelete(cat.id, cat.name)}
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
                <h3 className="text-lg font-semibold">Excluir categoria</h3>
              </div>
              <p className="text-foreground/80">
                Tem certeza que deseja excluir a categoria <strong className="text-foreground">"{deletingName}"</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Transações vinculadas a esta categoria ficarão sem categoria.
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