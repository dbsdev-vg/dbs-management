'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'

type Props = {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onSuccess: () => void
}

type Category = { id: string; name: string; type: 'income' | 'expense' }
type Caixa = { id: string; name: string; type: 'bank' | 'cash' | 'credit_card' }
type PaymentMethod = { id: string; name: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = new Date().toISOString().split('T')[0]
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0]

function formatDisplay(raw: string) {
  const num = parseFloat(raw)
  if (!raw || isNaN(num)) return 'R$ 0,00'
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddTransactionModal({ isOpen, onClose, workspaceId, onSuccess }: Props) {
  const supabase = createClient()
  const amountRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


  // Form
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [caixaId, setCaixaId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [date, setDate] = useState(TODAY)

  useEffect(() => {
    if (!isOpen || !workspaceId) return
    const fetchData = async () => {
      const [catsRes, caixasRes, pmsRes] = await Promise.all([
        supabase.from('categories').select('id, name, type').eq('workspace_id', workspaceId),
        supabase.from('caixas').select('id, name, type').eq('workspace_id', workspaceId),
        supabase.from('payment_methods').select('id, name').eq('workspace_id', workspaceId),
      ])
      if (catsRes.data) setCategories(catsRes.data)
      if (caixasRes.data) {
        setCaixas(caixasRes.data)
        if (caixasRes.data.length === 1) setCaixaId(caixasRes.data[0].id)
      }
      if (pmsRes.data) setAllPaymentMethods(pmsRes.data)
    }
    fetchData()
    // Focus amount on open
    setTimeout(() => amountRef.current?.focus(), 100)
  }, [isOpen, workspaceId])

  // Filter payment methods when caixa changes
  useEffect(() => {
    const selectedCaixa = caixas.find(c => c.id === caixaId)
    if (!selectedCaixa || !allPaymentMethods.length) {
      setPaymentMethods(allPaymentMethods)
      return
    }
    if (selectedCaixa.type === 'cash') {
      const cashMethods = allPaymentMethods.filter(pm =>
        pm.name.toLowerCase().includes('dinheiro') || pm.name.toLowerCase().includes('cash')
      )
      setPaymentMethods(cashMethods)
      if (cashMethods.length) setPaymentMethodId(cashMethods[0].id)
    } else {
      const nonCash = allPaymentMethods.filter(pm =>
        !pm.name.toLowerCase().includes('dinheiro') && !pm.name.toLowerCase().includes('cash')
      )
      setPaymentMethods(nonCash)
      if (nonCash.length) setPaymentMethodId(nonCash[0].id)
    }
  }, [caixaId, caixas, allPaymentMethods])

  const reset = () => {
    setType('expense')
    setAmount('')
    setDescription('')
    setCategoryId('')
    setCaixaId('')
    setPaymentMethodId('')
    setDate(TODAY)
    setError('')
  }

  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const handleClose = () => { reset(); setDuplicateWarning(false); onClose() }

  const handleSubmit = async (force = false) => {
    setError('')
    setDuplicateWarning(false)
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Informe um valor válido.')
      return
    }
    if (!categoryId) { setError('Selecione uma categoria.'); return }
    if (!caixaId) { setError('Selecione uma conta.'); return }

    // Duplicate detection
    if (!force) {
      const { data: dupes } = await supabase
        .from('transactions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('amount', numericAmount)
        .eq('date', date)
        .eq('category_id', categoryId)
        .limit(1)

      if (dupes && dupes.length > 0) {
        setDuplicateWarning(true)
        return
      }
    }

    setLoading(true)
    const { error: insertError } = await supabase.from('transactions').insert({
      workspace_id: workspaceId,
      caixa_id: caixaId,
      category_id: categoryId,
      payment_method_id: paymentMethodId || null,
      type,
      amount: numericAmount,
      description: description.trim() || null,
      date,
    })
    setLoading(false)

    if (insertError) { setError(insertError.message); return }
    onSuccess()
    handleClose()
  }

  if (!isOpen) return null

  const filteredCategories = categories.filter(c => c.type === type)
  const isExpense = type === 'expense'
  const accentColor = isExpense ? 'red' : 'green'

  const selectClass = 'w-full bg-muted border border-input rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-foreground/40 transition-colors appearance-none'

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogTitle className="sr-only">{isExpense ? 'Nova despesa' : 'Nova receita'}</DialogTitle>

        {/* ---------------------------------------------------------------- */}
        {/* Colored header band                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className={`px-5 pt-5 pb-6 ${isExpense ? 'bg-expense/10' : 'bg-income/10'}`}>
          {/* Top row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex p-1 bg-muted/80 rounded-xl gap-1">
              <button
                onClick={() => { setType('expense'); setCategoryId('') }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isExpense
                    ? 'bg-primary text-white shadow'
                    : 'text-muted-foreground hover:text-foreground/90'
                }`}
              >
                Despesa
              </button>
              <button
                onClick={() => { setType('income'); setCategoryId('') }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  !isExpense
                    ? 'bg-green-600 text-white shadow'
                    : 'text-muted-foreground hover:text-foreground/90'
                }`}
              >
                Receita
              </button>
            </div>
          </div>

          {/* Big amount input */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-widest mb-2">Valor</p>
            <div className="relative inline-flex items-center gap-1">
              <span className={`text-2xl font-light ${isExpense ? 'text-expense' : 'text-income'}`}>
                R$
              </span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className={`bg-transparent text-5xl font-bold w-48 text-center focus:outline-none placeholder:text-muted-foreground/50 ${
                  isExpense ? 'text-expense' : 'text-income'
                }`}
              />
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Body                                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="px-5 pt-4 pb-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Description */}
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full bg-transparent border-b border-input focus:border-foreground/50 pb-2 text-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none transition-colors"
          />

          {/* Category chips */}
          <div>
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Categoria</p>
            {filteredCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">Nenhuma categoria cadastrada para {isExpense ? 'despesas' : 'receitas'}.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      categoryId === cat.id
                        ? isExpense
                          ? 'bg-primary border-primary text-white'
                          : 'bg-green-600 border-income text-white'
                        : 'bg-muted border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground/90'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Caixa chips */}
          <div>
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Conta</p>
            <div className="flex flex-wrap gap-2">
              {caixas.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCaixaId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    caixaId === c.id
                      ? 'bg-accent-foreground border-accent-foreground text-accent'
                      : 'bg-muted border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground/90'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date quick pick */}
          <div>
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Data</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDate(TODAY)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  date === TODAY
                    ? 'bg-accent-foreground border-accent-foreground text-accent'
                    : 'bg-muted border-input text-muted-foreground hover:border-foreground/40'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setDate(YESTERDAY)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  date === YESTERDAY
                    ? 'bg-accent-foreground border-accent-foreground text-accent'
                    : 'bg-muted border-input text-muted-foreground hover:border-foreground/40'
                }`}
              >
                Ontem
              </button>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 bg-muted border border-input rounded-full px-3 py-1.5 text-foreground text-sm focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
          </div>

          {/* Payment method chips — visible when a caixa is selected */}
          {caixaId && paymentMethods.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Método de pagamento</p>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethodId(pm.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      paymentMethodId === pm.id
                        ? 'bg-accent-foreground border-accent-foreground text-accent'
                        : 'bg-muted border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground/90'
                    }`}
                  >
                    {pm.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {caixaId && paymentMethods.length === 0 && (
            <p className="text-xs text-muted-foreground/70">
              Nenhum método compatível com esta conta.
            </p>
          )}

          {error && (
            <p className="text-sm text-expense">{error}</p>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="px-5 pb-6 pt-2 border-t border-border space-y-3">
          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="bg-warning/15 border border-warning/40 rounded-xl p-3">
              <p className="text-sm text-warning/80 font-medium mb-1">Transação duplicada</p>
              <p className="text-xs text-warning/80 mb-3">
                Já existe uma transação com o mesmo valor, data e categoria. Deseja salvar mesmo assim?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmit(true)}
                  className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
                >
                  Salvar mesmo assim
                </button>
                <button
                  onClick={() => setDuplicateWarning(false)}
                  className="flex-1 py-2 rounded-lg border border-input text-foreground/80 text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!duplicateWarning && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all active:scale-[0.98] disabled:opacity-50 ${
                isExpense
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Salvando...' : `Salvar ${isExpense ? 'despesa' : 'receita'}`}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}