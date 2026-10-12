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
  transaction: any
  onSuccess: () => void
}

type Caixa = { id: string; name: string; type: 'bank' | 'cash' | 'credit_card' }
type PaymentMethod = { id: string; name: string }

export function EditTransactionModal({ isOpen, onClose, transaction, onSuccess }: Props) {
  const supabase = createClient()
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([])
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [type, setType] = useState<'income' | 'expense'>(transaction.type)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [description, setDescription] = useState(transaction.description || '')
  const [categoryId, setCategoryId] = useState(transaction.category_id)
  const [caixaId, setCaixaId] = useState(transaction.caixa_id)
  const [paymentMethodId, setPaymentMethodId] = useState(transaction.payment_method_id || '')
  const [date, setDate] = useState(transaction.date)

  // Fetch all necessary data when modal opens
  useEffect(() => {
    if (!isOpen) return
    const fetchData = async () => {
      const [cats, cxs, pms] = await Promise.all([
        supabase.from('categories').select('id,name,type').eq('workspace_id', transaction.workspace_id),
        supabase.from('caixas').select('id,name,type').eq('workspace_id', transaction.workspace_id),
        supabase.from('payment_methods').select('id,name').eq('workspace_id', transaction.workspace_id),
      ])
      if (cats.data) setCategories(cats.data)
      if (cxs.data) setCaixas(cxs.data)
      if (pms.data) setAllPaymentMethods(pms.data)
    }
    fetchData()
  }, [isOpen, transaction.workspace_id, supabase])

  // Filter payment methods when caixaId changes (including initial load)
  useEffect(() => {
    const selectedCaixa = caixas.find(c => c.id === caixaId)
    if (!selectedCaixa || !allPaymentMethods.length) {
      setPaymentMethods([])
      setPaymentMethodId('')
      return
    }

    if (selectedCaixa.type === 'cash') {
      const cashMethods = allPaymentMethods.filter(pm =>
        pm.name.toLowerCase().includes('dinheiro') || pm.name.toLowerCase().includes('cash')
      )
      setPaymentMethods(cashMethods)
      // If current paymentMethodId is not in the filtered list, clear it (or keep if it matches)
      if (!cashMethods.some(pm => pm.id === paymentMethodId)) {
        setPaymentMethodId(cashMethods[0]?.id || '')
      }
    } else if (selectedCaixa.type === 'bank') {
      const nonCash = allPaymentMethods.filter(pm =>
        !pm.name.toLowerCase().includes('dinheiro') && !pm.name.toLowerCase().includes('cash')
      )
      setPaymentMethods(nonCash)
      if (!nonCash.some(pm => pm.id === paymentMethodId)) {
        setPaymentMethodId(nonCash[0]?.id || '')
      }
    } else {
      // credit_card (future) – show all
      setPaymentMethods(allPaymentMethods)
      if (!allPaymentMethods.some(pm => pm.id === paymentMethodId)) {
        setPaymentMethodId('')
      }
    }
  }, [caixaId, caixas, allPaymentMethods])

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

    const selectedCaixa = caixas.find(c => c.id === caixaId)
    const selectedPm = paymentMethods.find(pm => pm.id === paymentMethodId)
    if (selectedCaixa?.type === 'cash' && selectedPm && !selectedPm.name.toLowerCase().includes('dinheiro')) {
      setError('Para caixas do tipo Dinheiro, o método de pagamento deve ser Dinheiro.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        type,
        amount: numericAmount,
        description: description.trim() || null,
        category_id: categoryId,
        caixa_id: caixaId,
        payment_method_id: paymentMethodId || null,
        date,
      })
      .eq('id', transaction.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const filteredCategories = categories.filter(c => c.type === type)

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogTitle className="px-5 py-4 border-b border-border text-lg font-semibold text-foreground">
          Editar transação
        </DialogTitle>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId('') }}
              className={`py-2 rounded-lg font-medium transition ${type === 'expense' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >Despesa</button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId('') }}
              className={`py-2 rounded-lg font-medium transition ${type === 'income' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >Receita</button>
          </div>

          <Input label="Valor (R$)" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          <Input label="Descrição (opcional)" type="text" value={description} onChange={e => setDescription(e.target.value)} />

          {/* Categoria */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Categoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2 bg-muted border border-input rounded text-foreground" required>
              <option value="">Selecione</option>
              {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Caixa (with type indicator) */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Caixa / Conta</label>
            <select value={caixaId} onChange={e => setCaixaId(e.target.value)} className="w-full p-2 bg-muted border border-input rounded text-foreground" required>
              <option value="">Selecione</option>
              {caixas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'cash' ? 'Dinheiro' : c.type === 'credit_card' ? 'Cartão' : 'Banco'})
                </option>
              ))}
            </select>
          </div>

          {/* Método de pagamento (filtered) */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Método de pagamento</label>
            <select
              value={paymentMethodId}
              onChange={e => setPaymentMethodId(e.target.value)}
              className="w-full p-2 bg-muted border border-input rounded text-foreground"
            >
              <option value="">Nenhum</option>
              {paymentMethods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {caixaId && paymentMethods.length === 0 && (
              <p className="text-xs text-expense mt-1">
                Nenhum método de pagamento compatível. Cadastre um método para este tipo de caixa.
              </p>
            )}
          </div>

          <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} required />

          {error && <p className="text-sm text-expense">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={loading} className="flex-1"><FontAwesomeIcon icon={faSave} className="mr-2" /> Salvar</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}