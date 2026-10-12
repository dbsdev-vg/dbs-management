'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { createClient } from '@/utils/supabase/client'
import { TransactionsMobile } from './TransactionsMobile'
import { TransactionsDesktop } from './TransactionsDesktop'
import { AddTransactionModal } from '@/components/ui/AddTransactionModal'
import { EditTransactionModal } from '@/components/ui/EditTransactionModal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Transaction = {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'income' | 'expense'
  transfer_id: string | null
  category_id: string
  caixa_id: string
  payment_method_id: string | null
  categories?: { name: string } | null
  caixas?: { name: string } | null
  payment_methods?: { name: string } | null
}

export type DropdownOption = { id: string; name: string }

export type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export type CategoryInsight = {
  name: string
  thisMonth: number
  lastMonth: number
  change: number | null // % change, null if no last month data
}

export type GroupedTransactions = {
  date: string
  transactions: Transaction[]
}

export type Summary = {
  income: number
  expenses: number
  count: number
}

export type TransactionsProps = {
  grouped: GroupedTransactions[]
  transactions: Transaction[]
  loading: boolean
  insights: CategoryInsight[]
  summary: Summary
  categories: DropdownOption[]
  caixas: DropdownOption[]
  paymentMethods: DropdownOption[]
  selectedMonth: { year: number; month: number }
  onPrevMonth: () => void
  onNextMonth: () => void
  categoryId: string
  caixaId: string
  paymentMethodId: string
  typeFilter: 'all' | 'income' | 'expense'
  search: string
  showTransfers: boolean
  sort: SortOption
  setCategoryId: (v: string) => void
  setCaixaId: (v: string) => void
  setPaymentMethodId: (v: string) => void
  setTypeFilter: (v: 'all' | 'income' | 'expense') => void
  setSearch: (v: string) => void
  setShowTransfers: (v: boolean) => void
  setSort: (v: SortOption) => void
  onFilter: () => void
  onClearFilters: () => void
  onAdd: () => void
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  onExport: () => void
  canWrite: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { start: fmt(start), end: fmt(end) }
}

function exportToCSV(transactions: Transaction[], year: number, month: number) {
  const headers = ['Data', 'Descrição', 'Categoria', 'Conta', 'Método', 'Tipo', 'Valor']
  const rows = transactions.map(tx => [
    tx.date,
    tx.description || '',
    (tx.categories as any)?.name || '',
    (tx.caixas as any)?.name || '',
    (tx.payment_methods as any)?.name || '',
    tx.type === 'income' ? 'Receita' : 'Despesa',
    tx.amount.toFixed(2).replace('.', ','),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transacoes-${year}-${String(month + 1).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TransactionsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace()
  const router = useRouter()
  const supabase = createClient()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [insights, setInsights] = useState<CategoryInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Filters
  const [categoryId, setCategoryId] = useState('')
  const [caixaId, setCaixaId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [showTransfers, setShowTransfers] = useState(false)
  const [sort, setSort] = useState<SortOption>('date_desc')

  // Dropdown data
  const [categories, setCategories] = useState<DropdownOption[]>([])
  const [caixas, setCaixas] = useState<DropdownOption[]>([])
  const [paymentMethods, setPaymentMethods] = useState<DropdownOption[]>([])

  useEffect(() => {
    if (!wsLoading && !currentWorkspace) router.push('/select-workspace')
  }, [wsLoading, currentWorkspace, router])

  useEffect(() => {
    if (!currentWorkspace) return
    Promise.all([
      supabase.from('categories').select('id,name').eq('workspace_id', currentWorkspace.id),
      supabase.from('caixas').select('id,name').eq('workspace_id', currentWorkspace.id),
      supabase.from('payment_methods').select('id,name').eq('workspace_id', currentWorkspace.id),
    ]).then(([cats, cxs, pms]) => {
      if (cats.data) setCategories(cats.data)
      if (cxs.data) setCaixas(cxs.data)
      if (pms.data) setPaymentMethods(pms.data)
    })
  }, [currentWorkspace?.id])

  const fetchTransactions = useCallback(async () => {
    if (!currentWorkspace) return
    setLoading(true)

    const { start, end } = getMonthRange(selectedMonth.year, selectedMonth.month)

    // Previous month for insights
    const prevMonth = selectedMonth.month === 0
      ? { year: selectedMonth.year - 1, month: 11 }
      : { year: selectedMonth.year, month: selectedMonth.month - 1 }
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth.year, prevMonth.month)

    let query = supabase
      .from('transactions')
      .select('*, categories(name), caixas(name), payment_methods(name)')
      .eq('workspace_id', currentWorkspace.id)
      .gte('date', start)
      .lte('date', end)

    if (!showTransfers) query = query.is('transfer_id', null)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (caixaId) query = query.eq('caixa_id', caixaId)
    if (paymentMethodId) query = query.eq('payment_method_id', paymentMethodId)
    if (typeFilter !== 'all') query = query.eq('type', typeFilter)
    if (search) query = query.ilike('description', `%${search}%`)

    if (sort === 'date_desc') query = query.order('date', { ascending: false })
    else if (sort === 'date_asc') query = query.order('date', { ascending: true })
    else if (sort === 'amount_desc') query = query.order('amount', { ascending: false })
    else if (sort === 'amount_asc') query = query.order('amount', { ascending: true })

    // Fetch insights (prev month expenses by category, no filters)
    const [{ data: txData }, { data: prevData }] = await Promise.all([
      query,
      supabase
        .from('transactions')
        .select('amount, category_id, categories(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('type', 'expense')
        .is('transfer_id', null)
        .gte('date', prevStart)
        .lte('date', prevEnd),
    ])

    setTransactions((txData ?? []) as unknown as Transaction[])

    // Build insights
    const thisExpenses = (txData ?? []).filter((t: any) => t.type === 'expense' && !t.transfer_id)
    const thisMap = new Map<string, { name: string; total: number }>()
    for (const tx of thisExpenses) {
      const name = (tx.categories as any)?.name ?? 'Sem categoria'
      const existing = thisMap.get(name) ?? { name, total: 0 }
      thisMap.set(name, { ...existing, total: existing.total + tx.amount })
    }

    const prevMap = new Map<string, number>()
    for (const tx of prevData ?? []) {
      const name = (tx.categories as any)?.name ?? 'Sem categoria'
      prevMap.set(name, (prevMap.get(name) ?? 0) + tx.amount)
    }

    const insightsList: CategoryInsight[] = Array.from(thisMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(({ name, total }) => {
        const lastMonth = prevMap.get(name) ?? 0
        const change = lastMonth > 0 ? Math.round(((total - lastMonth) / lastMonth) * 100) : null
        return { name, thisMonth: total, lastMonth, change }
      })

    setInsights(insightsList)
    setLoading(false)
  }, [currentWorkspace?.id, selectedMonth, categoryId, caixaId, paymentMethodId, typeFilter, search, showTransfers, sort])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta transação?')) return
    await supabase.from('transactions').delete().eq('id', id)
    fetchTransactions()
  }

  const handleClearFilters = () => {
    setCategoryId('')
    setCaixaId('')
    setPaymentMethodId('')
    setTypeFilter('all')
    setSearch('')
    setShowTransfers(false)
    setSort('date_desc')
  }

  // Group by date
  const grouped: GroupedTransactions[] = (() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of transactions) {
      if (!map.has(tx.date)) map.set(tx.date, [])
      map.get(tx.date)!.push(tx)
    }
    return Array.from(map.entries()).map(([date, txs]) => ({ date, transactions: txs }))
  })()

  const summary: Summary = {
    income: transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expenses: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    count: transactions.length,
  }

  if (wsLoading || !currentWorkspace) return null

  const sharedProps: TransactionsProps = {
    grouped,
    transactions,
    loading,
    insights,
    summary,
    categories,
    caixas,
    paymentMethods,
    selectedMonth,
    onPrevMonth: () => setSelectedMonth(m => m.month === 0
      ? { year: m.year - 1, month: 11 }
      : { year: m.year, month: m.month - 1 }),
    onNextMonth: () => setSelectedMonth(m => m.month === 11
      ? { year: m.year + 1, month: 0 }
      : { year: m.year, month: m.month + 1 }),
    categoryId, caixaId, paymentMethodId, typeFilter, search, showTransfers, sort,
    setCategoryId, setCaixaId, setPaymentMethodId, setTypeFilter, setSearch, setShowTransfers, setSort,
    onFilter: fetchTransactions,
    onClearFilters: handleClearFilters,
    onAdd: () => setShowAddModal(true),
    onEdit: (tx) => setEditingTx(tx),
    onDelete: handleDelete,
    onExport: () => exportToCSV(transactions, selectedMonth.year, selectedMonth.month),
    canWrite: currentWorkspace.role !== 'viewer',
  }

  return (
    <>
      <div className="md:hidden"><TransactionsMobile {...sharedProps} /></div>
      <div className="hidden md:block"><TransactionsDesktop {...sharedProps} /></div>

      {showAddModal && (
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          workspaceId={currentWorkspace.id}
          onSuccess={fetchTransactions}
        />
      )}
      {editingTx && (
        <EditTransactionModal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          transaction={editingTx}
          onSuccess={fetchTransactions}
        />
      )}
    </>
  )
}