'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'

type Props = {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
    onSuccess: () => void
}

type Caixa = {
    id: string
    name: string
    current_balance: number
}

const now = new Date()
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const YESTERDAY = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

function fmt(amount: number) {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Find or create a "Transferência" category for the given type
async function getOrCreateTransferCategory(
    supabase: ReturnType<typeof createClient>,
    workspaceId: string,
    type: 'income' | 'expense',
    userId: string
) {
    const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', 'Transferência')
        .eq('type', type)
        .single()

    if (existing) return existing.id

    // Auto-create it
    const { data: created, error } = await supabase
        .from('categories')
        .insert({
            workspace_id: workspaceId,
            name: 'Transferência',
            type,
        })
        .select('id')
        .single()

    if (error) console.error('Category create error:', error)
    return created?.id ?? null
}

export function TransferModal({ isOpen, onClose, workspaceId, onSuccess }: Props) {
    const supabase = createClient()

    const [caixas, setCaixas] = useState<Caixa[]>([])
    const [fromId, setFromId] = useState('')
    const [toId, setToId] = useState('')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(TODAY)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isOpen || !workspaceId) return
        supabase
            .from('caixas')
            .select('id, name, current_balance')
            .eq('workspace_id', workspaceId)
            .then(({ data }) => {
                if (data) setCaixas(data)
            })
    }, [isOpen, workspaceId])

    const reset = () => {
        setFromId('')
        setToId('')
        setAmount('')
        setDescription('')
        setDate(TODAY)
        setError('')
    }

    const handleClose = () => { reset(); onClose() }

    const handleSubmit = async () => {
        setError('')
        const numericAmount = parseFloat(amount)

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Informe um valor válido.')
            return
        }
        if (!fromId) { setError('Selecione a conta de origem.'); return }
        if (!toId) { setError('Selecione a conta de destino.'); return }
        if (fromId === toId) { setError('Origem e destino não podem ser iguais.'); return }

        const fromCaixa = caixas.find(c => c.id === fromId)
        if (fromCaixa && fromCaixa.current_balance < numericAmount) {
            setError(`Saldo insuficiente em ${fromCaixa.name}.`)
            return
        }

        setLoading(true)

        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id
        if (!userId) { setError('Usuário não autenticado.'); setLoading(false); return }

        // Get or auto-create transfer categories
        const [expenseCatId, incomeCatId] = await Promise.all([
            getOrCreateTransferCategory(supabase, workspaceId, 'expense', userId),
            getOrCreateTransferCategory(supabase, workspaceId, 'income', userId),
        ])

        if (!expenseCatId || !incomeCatId) {
            setError('Não foi possível criar categoria de transferência.')
            setLoading(false)
            return
        }

        const transferId = crypto.randomUUID()
        const desc = description.trim() || 'Transferência entre contas'

        const { error: insertError } = await supabase.from('transactions').insert([
            {
                workspace_id: workspaceId,
                caixa_id: fromId,
                category_id: expenseCatId,
                type: 'expense',
                amount: numericAmount,
                description: desc,
                date,
                transfer_id: transferId,
            },
            {
                workspace_id: workspaceId,
                caixa_id: toId,
                category_id: incomeCatId,
                type: 'income',
                amount: numericAmount,
                description: desc,
                date,
                transfer_id: transferId,
            },
        ])

        setLoading(false)

        if (insertError) { setError(insertError.message); return }
        onSuccess()
        handleClose()
    }

    if (!isOpen) return null

    const fromCaixa = caixas.find(c => c.id === fromId)
    const toCaixa = caixas.find(c => c.id === toId)
    const numericAmount = parseFloat(amount)
    const balanceAfter = fromCaixa && !isNaN(numericAmount)
        ? fromCaixa.current_balance - numericAmount
        : null

    const chipClass = (selected: boolean) =>
        `px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selected
            ? 'bg-accent-foreground border-accent-foreground text-accent'
            : 'bg-muted border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground/90'
        }`

    return (
        <Dialog open={isOpen} onOpenChange={o => { if (!o) handleClose() }}>
            <DialogContent className="sm:max-w-md p-0 gap-0">
                <DialogTitle className="sr-only">Transferência entre contas</DialogTitle>

                {/* Header */}
                <div className="bg-info/10 px-5 pt-5 pb-6">
                    <div className="flex items-center justify-between mb-5">
                        <span className="text-sm font-semibold text-info/80 bg-info/15 border border-info/40 px-3 py-1 rounded-full">
                            Transferência
                        </span>
                    </div>

                    {/* Amount */}
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground/90 uppercase tracking-widest mb-2">Valor</p>
                        <div className="inline-flex items-center gap-1">
                            <span className="text-2xl font-light text-info">R$</span>
                            <input
                                autoFocus
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0,00"
                                className="bg-transparent text-5xl font-bold w-48 text-center text-info focus:outline-none placeholder:text-muted-foreground/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-5 pt-4 pb-5 space-y-5 max-h-[60vh] overflow-y-auto">

                    {/* From → To visual */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted border border-input rounded-xl p-3 min-w-0">
                            <p className="text-[10px] text-muted-foreground/90 uppercase tracking-wider mb-1">De</p>
                            <p className="text-sm font-semibold text-foreground truncate">
                                {fromCaixa?.name ?? <span className="text-muted-foreground/70">Selecionar</span>}
                            </p>
                            {fromCaixa && (
                                <p className="text-xs text-muted-foreground/90 mt-0.5">{fmt(fromCaixa.current_balance)}</p>
                            )}
                        </div>

                        <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <FontAwesomeIcon icon={faArrowRight} className="text-muted-foreground text-sm" />
                        </div>

                        <div className="flex-1 bg-muted border border-input rounded-xl p-3 min-w-0">
                            <p className="text-[10px] text-muted-foreground/90 uppercase tracking-wider mb-1">Para</p>
                            <p className="text-sm font-semibold text-foreground truncate">
                                {toCaixa?.name ?? <span className="text-muted-foreground/70">Selecionar</span>}
                            </p>
                            {toCaixa && (
                                <p className="text-xs text-muted-foreground/90 mt-0.5">{fmt(toCaixa.current_balance)}</p>
                            )}
                        </div>
                    </div>

                    {/* Balance warning */}
                    {balanceAfter !== null && balanceAfter < 0 && (
                        <p className="text-xs text-expense bg-expense/10 border border-expense/40 rounded-lg px-3 py-2">
                            Saldo insuficiente — ficaria {fmt(balanceAfter)} após a transferência.
                        </p>
                    )}

                    {/* From chips */}
                    <div>
                        <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Origem</p>
                        <div className="flex flex-wrap gap-2">
                            {caixas.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setFromId(c.id); if (toId === c.id) setToId('') }}
                                    className={chipClass(fromId === c.id)}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* To chips */}
                    <div>
                        <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Destino</p>
                        <div className="flex flex-wrap gap-2">
                            {caixas
                                .filter(c => c.id !== fromId)
                                .map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setToId(c.id)}
                                        className={chipClass(toId === c.id)}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            {caixas.filter(c => c.id !== fromId).length === 0 && (
                                <p className="text-xs text-muted-foreground/70">Selecione a origem primeiro.</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Descrição (opcional)"
                        className="w-full bg-transparent border-b border-input focus:border-foreground/50 pb-2 text-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none transition-colors"
                    />

                    {/* Date */}
                    <div>
                        <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-2">Data</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDate(TODAY)}
                                className={chipClass(date === TODAY)}
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => setDate(YESTERDAY)}
                                className={chipClass(date === YESTERDAY)}
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

                    {error && <p className="text-sm text-expense">{error}</p>}
                </div>

                {/* Footer */}
                <div className="px-5 pb-6 pt-2 border-t border-border">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-semibold text-white text-base bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Transferindo...' : 'Confirmar transferência'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}