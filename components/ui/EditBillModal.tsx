'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Props = {
  isOpen: boolean
  onClose: () => void
  bill: any
  onSuccess: () => void
  categories: { id: string; name: string }[]
  caixas: { id: string; name: string }[]
}

export function EditBillModal({ isOpen, onClose, bill, onSuccess, categories, caixas }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [description, setDescription] = useState(bill.description)
  const [amount, setAmount] = useState(bill.amount.toString())
  const [dueDate, setDueDate] = useState(bill.due_date)
  const [categoryId, setCategoryId] = useState(bill.category_id || '')
  const [caixaId, setCaixaId] = useState(bill.caixa_id || '')

  // Reset when bill changes
  useEffect(() => {
    if (bill) {
      setDescription(bill.description)
      setAmount(bill.amount.toString())
      setDueDate(bill.due_date)
      setCategoryId(bill.category_id || '')
      setCaixaId(bill.caixa_id || '')
    }
  }, [bill])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Valor inválido')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('bills')
      .update({
        description: description.trim(),
        amount: numericAmount,
        due_date: dueDate,
        category_id: categoryId || null,
        caixa_id: caixaId || null,
      })
      .eq('id', bill.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogTitle className="px-5 py-4 border-b border-border text-lg font-semibold text-foreground">
          Editar conta
        </DialogTitle>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input
            label="Descrição"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
          <Input
            label="Data de vencimento"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Categoria (opcional)</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-2 bg-muted border border-input rounded text-foreground"
            >
              <option value="">Nenhuma</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Conta (opcional)</label>
            <select
              value={caixaId}
              onChange={e => setCaixaId(e.target.value)}
              className="w-full p-2 bg-muted border border-input rounded text-foreground"
            >
              <option value="">Nenhuma</option>
              {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              <FontAwesomeIcon icon={faSave} className="mr-2" /> Salvar
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}