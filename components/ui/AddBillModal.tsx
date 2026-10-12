'use client'

import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBarcode, faRotate, faTableCells, faFileInvoice,
  faChevronDown, faChevronUp,
} from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { useToast } from '@/contexts/ToastContext'


type Props = {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onSuccess: () => void
  categories: { id: string; name: string }[]
  caixas: { id: string; name: string }[]
}

type BillType = 'regular' | 'boleto' | 'parcelado' | 'recorrente'

const BILL_TYPES: { value: BillType; label: string; icon: any; desc: string }[] = [
  { value: 'regular', label: 'Regular', icon: faFileInvoice, desc: 'Conta única' },
  { value: 'boleto', label: 'Boleto', icon: faBarcode, desc: 'Com código de barras' },
  { value: 'parcelado', label: 'Parcelado', icon: faTableCells, desc: 'Dividido em parcelas' },
  { value: 'recorrente', label: 'Recorrente', icon: faRotate, desc: 'Repete todo mês' },
]

const INSTALLMENT_PRESETS = [2, 3, 6, 12, 24, 48]

function localDateStr(offsetMonths = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetMonths)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addMonths(dateStr: string, months: number) {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1 + months, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AddBillModal({ isOpen, onClose, workspaceId, onSuccess, categories, caixas }: Props) {
  const supabase = createClient()
  const amountRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  // Form
  const [billType, setBillType] = useState<BillType>('regular')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(localDateStr())
  const [categoryId, setCategoryId] = useState('')
  const [caixaId, setCaixaId] = useState('')
  const [barcode, setBarcode] = useState('')

  // Installments
  const [installments, setInstallments] = useState(12)
  const [customInstallments, setCustomInstallments] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Recorrente
  const [recurringMonths, setRecurringMonths] = useState(12)

  useEffect(() => {
    if (isOpen) setTimeout(() => amountRef.current?.focus(), 100)
  }, [isOpen])

  const reset = () => {
    setBillType('regular')
    setDescription('')
    setAmount('')
    setDueDate(localDateStr())
    setCategoryId('')
    setCaixaId('')
    setBarcode('')
    setInstallments(12)
    setCustomInstallments('')
    setShowCustom(false)
    setRecurringMonths(12)
    setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const numericAmount = parseFloat(amount)
  const effectiveInstallments = showCustom ? parseInt(customInstallments) || 1 : installments

  const handleSubmit = async () => {
    setError('')
    if (!description.trim()) { setError('Informe uma descrição.'); return }
    if (isNaN(numericAmount) || numericAmount <= 0) { setError('Informe um valor válido.'); return }
    if (billType === 'parcelado' && effectiveInstallments < 2) {
      setError('Número de parcelas inválido.'); return
    }
    if (!description.trim()) {
      toast.addToast('Informe uma descrição.', 'error')
      return
    }

    setLoading(true)

    try {
      if (billType === 'regular' || billType === 'boleto') {
        const { error: err } = await supabase.from('bills').insert({
          workspace_id: workspaceId,
          description: description.trim(),
          amount: numericAmount,
          due_date: dueDate,
          paid: false,
          category_id: categoryId || null,
          caixa_id: caixaId || null,
          bill_type: billType,
          barcode: barcode.trim() || null,
        })
        if (err) throw err

      } else if (billType === 'parcelado') {
        const groupId = crypto.randomUUID()
        const rows = Array.from({ length: effectiveInstallments }, (_, i) => ({
          workspace_id: workspaceId,
          description: `${description.trim()} (${i + 1}/${effectiveInstallments})`,
          amount: numericAmount,
          due_date: addMonths(dueDate, i),
          paid: false,
          category_id: categoryId || null,
          caixa_id: caixaId || null,
          bill_type: 'parcelado',
          installment_group_id: groupId,
          installment_number: i + 1,
          installment_total: effectiveInstallments,
          // Only first installment gets the barcode — rest added later
          barcode: i === 0 && barcode.trim() ? barcode.trim() : null,
        }))
        const { error: err } = await supabase.from('bills').insert(rows)
        if (err) throw err

      } else if (billType === 'recorrente') {
        const groupId = crypto.randomUUID()
        const rows = Array.from({ length: recurringMonths }, (_, i) => ({
          workspace_id: workspaceId,
          description: description.trim(),
          amount: numericAmount,
          due_date: addMonths(dueDate, i),
          paid: false,
          category_id: categoryId || null,
          caixa_id: caixaId || null,
          bill_type: 'recorrente',
          installment_group_id: groupId,
          installment_number: i + 1,
          installment_total: recurringMonths,
        }))
        const { error: err } = await supabase.from('bills').insert(rows)
        if (err) throw err
      }

      onSuccess()

      toast.addToast('Conta criada com sucesso!', 'success')
      handleClose()
    } catch (err: any) {
      toast.addToast(err.message ?? 'Erro ao salvar.', 'error')
      setError(err.message ?? 'Erro ao salvar.')
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active
      ? 'bg-accent-foreground border-accent-foreground text-accent'
      : 'bg-muted border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground/90'
    }`

  const totalAmount = billType === 'parcelado'
    ? numericAmount * effectiveInstallments
    : billType === 'recorrente'
      ? numericAmount * recurringMonths
      : numericAmount

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogTitle className="sr-only">Nova conta</DialogTitle>

        {/* Header band */}
        <div className="bg-muted/60 px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-semibold text-foreground/80 bg-muted border border-input px-3 py-1 rounded-full">
              Nova conta
            </span>
          </div>

          {/* Amount */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-widest mb-2">
              {billType === 'parcelado' ? 'Valor por parcela' : 'Valor'}
            </p>
            <div className="inline-flex items-center gap-1">
              <span className="text-2xl font-light text-muted-foreground">R$</span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="bg-transparent text-5xl font-bold w-48 text-center text-foreground focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            {/* Total preview for installments */}
            {(billType === 'parcelado' || billType === 'recorrente') && !isNaN(numericAmount) && numericAmount > 0 && (
              <p className="text-xs text-muted-foreground/90 mt-1">
                Total:{' '}
                <span className="text-foreground/80 font-medium">
                  {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-5 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* Description */}
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição da conta..."
            className="w-full bg-transparent border-b border-input focus:border-foreground/50 pb-2 text-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none transition-colors"
          />

          {/* Bill type */}
          <div>
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {BILL_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setBillType(t.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${billType === t.value
                    ? 'bg-primary/15 border-primary text-foreground'
                    : 'bg-muted border-input text-muted-foreground hover:border-foreground/30'
                    }`}
                >
                  <FontAwesomeIcon icon={t.icon} className={`text-sm ${billType === t.value ? 'text-expense' : 'text-muted-foreground/70'}`} />
                  <div>
                    <p className="text-sm font-medium leading-none">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Barcode — boleto or parcelado */}
          {(billType === 'boleto' || billType === 'parcelado') && (
            <div>
              <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">
                Código de barras {billType === 'parcelado' ? '(1ª parcela)' : '(opcional)'}
              </p>
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="000.00000 00000.000000 00000.000000 0 00000000000000"
                className="w-full bg-muted border border-input rounded-xl px-3 py-2.5 text-foreground text-xs focus:outline-none focus:border-foreground/40 font-mono"
              />
              {billType === 'parcelado' && (
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Os códigos das demais parcelas podem ser adicionados na lista de contas conforme você receber cada boleto.
                </p>
              )}
            </div>
          )}

          {/* Installments — parcelado */}
          {billType === 'parcelado' && (
            <div>
              <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Número de parcelas</p>
              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_PRESETS.map(n => (
                  <button
                    key={n}
                    onClick={() => { setInstallments(n); setShowCustom(false) }}
                    className={chipClass(!showCustom && installments === n)}
                  >
                    {n}x
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className={chipClass(showCustom)}
                >
                  Outro
                </button>
              </div>
              {showCustom && (
                <input
                  type="number"
                  min="2"
                  max="360"
                  value={customInstallments}
                  onChange={e => setCustomInstallments(e.target.value)}
                  placeholder="Qtd de parcelas"
                  className="mt-2 w-full bg-muted border border-input rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-foreground/40"
                />
              )}
              {!isNaN(numericAmount) && numericAmount > 0 && (
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {effectiveInstallments}x de{' '}
                  <span className="text-muted-foreground">{numericAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </p>
              )}
            </div>
          )}

          {/* Recurring months */}
          {billType === 'recorrente' && (
            <div>
              <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Criar para quantos meses</p>
              <div className="flex flex-wrap gap-2">
                {[3, 6, 12, 24].map(n => (
                  <button
                    key={n}
                    onClick={() => setRecurringMonths(n)}
                    className={chipClass(recurringMonths === n)}
                  >
                    {n} meses
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                Serão criadas {recurringMonths} contas mensais a partir da data de vencimento.
              </p>
            </div>
          )}

          {/* Category chips */}
          {categories.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Categoria (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)} className={chipClass(categoryId === c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Caixa chips */}
          {caixas.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Conta (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {caixas.map(c => (
                  <button key={c.id} onClick={() => setCaixaId(c.id === caixaId ? '' : c.id)} className={chipClass(caixaId === c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due date */}
          <div>
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">
              {billType === 'parcelado' ? 'Vencimento da 1ª parcela' : billType === 'recorrente' ? 'Primeiro vencimento' : 'Data de vencimento'}
            </p>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-muted border border-input rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-foreground/40"
            />
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-xl font-semibold text-white text-base bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading
              ? 'Salvando...'
              : billType === 'parcelado'
                ? `Criar ${effectiveInstallments} parcelas`
                : billType === 'recorrente'
                  ? `Criar ${recurringMonths} meses`
                  : 'Salvar conta'
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}