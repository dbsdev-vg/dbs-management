'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { createClient } from '@/utils/supabase/client'
import { BillsMobile } from './BillsMobile'
import { BillsDesktop } from './BillsDesktop'
import { AddBillModal } from '@/components/ui/AddBillModal'
import { EditBillModal } from '@/components/ui/EditBillModal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Bill = {
  id: string
  description: string
  amount: number
  due_date: string
  paid: boolean
  category_id: string | null
  caixa_id: string | null
  categories?: { name: string } | null
  caixas?: { name: string } | null
}

export type DropdownOption = { id: string; name: string }

export type SortOption = 'due_desc' | 'due_asc' | 'amount_desc' | 'amount_asc'

export type Summary = {
  totalUnpaid: number
  totalPaid: number
  totalOverdue: number
  count: number
}

export type BillsProps = {
  bills: Bill[]
  loading: boolean
  summary: Summary
  categories: DropdownOption[]
  caixas: DropdownOption[]
  selectedMonth: { year: number; month: number }
  onPrevMonth: () => void
  onNextMonth: () => void
  categoryId: string
  caixaId: string
  paidFilter: 'all' | 'paid' | 'unpaid'
  search: string
  sort: SortOption
  setCategoryId: (v: string) => void
  setCaixaId: (v: string) => void
  setPaidFilter: (v: 'all' | 'paid' | 'unpaid') => void
  setSearch: (v: string) => void
  setSort: (v: SortOption) => void
  onFilter: () => void
  onClearFilters: () => void
  onAdd: () => void
  onEdit: (bill: Bill) => void
  onDelete: (id: string) => void
  onTogglePaid: (id: string, paid: boolean) => void
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

function exportToCSV(bills: Bill[], year: number, month: number) {
  const headers = ['Descrição', 'Valor', 'Vencimento', 'Status']
  const rows = bills.map(b => [
    b.description,
    b.amount.toFixed(2).replace('.', ','),
    b.due_date,
    b.paid ? 'Pago' : 'Pendente',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contas-${year}-${String(month + 1).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BillsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace()
  const router = useRouter()
  const supabase = createClient()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)

  // Filters
  const [categoryId, setCategoryId] = useState('')
  const [caixaId, setCaixaId] = useState('')
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('due_asc')

  // Dropdown data
  const [categories, setCategories] = useState<DropdownOption[]>([])
  const [caixas, setCaixas] = useState<DropdownOption[]>([])

  useEffect(() => {
    if (!wsLoading && !currentWorkspace) router.push('/select-workspace')
  }, [wsLoading, currentWorkspace, router])

  useEffect(() => {
    if (!currentWorkspace) return
    Promise.all([
      supabase.from('categories').select('id,name').eq('workspace_id', currentWorkspace.id),
      supabase.from('caixas').select('id,name').eq('workspace_id', currentWorkspace.id),
    ]).then(([cats, cxs]) => {
      if (cats.data) setCategories(cats.data)
      if (cxs.data) setCaixas(cxs.data)
    })
  }, [currentWorkspace?.id])

  const fetchBills = useCallback(async () => {
    if (!currentWorkspace) return
    setLoading(true)

    const { start, end } = getMonthRange(selectedMonth.year, selectedMonth.month)

    let query = supabase
      .from('bills')
      .select('*, categories(name), caixas(name)')
      .eq('workspace_id', currentWorkspace.id)
      .gte('due_date', start)
      .lte('due_date', end)

    if (categoryId) query = query.eq('category_id', categoryId)
    if (caixaId) query = query.eq('caixa_id', caixaId)
    if (paidFilter === 'paid') query = query.eq('paid', true)
    else if (paidFilter === 'unpaid') query = query.eq('paid', false)
    if (search) query = query.ilike('description', `%${search}%`)

    if (sort === 'due_desc') query = query.order('due_date', { ascending: false })
    else if (sort === 'due_asc') query = query.order('due_date', { ascending: true })
    else if (sort === 'amount_desc') query = query.order('amount', { ascending: false })
    else if (sort === 'amount_asc') query = query.order('amount', { ascending: true })

    const { data, error } = await query
    if (!error) setBills(data as unknown as Bill[])

    setLoading(false)
  }, [currentWorkspace?.id, selectedMonth, categoryId, caixaId, paidFilter, search, sort])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conta?')) return
    await supabase.from('bills').delete().eq('id', id)
    fetchBills()
  }

  const handleTogglePaid = async (id: string, paid: boolean) => {
    await supabase.from('bills').update({ paid }).eq('id', id)
    fetchBills()
  }

  const handleClearFilters = () => {
    setCategoryId('')
    setCaixaId('')
    setPaidFilter('all')
    setSearch('')
    setSort('due_asc')
  }

  // Summary
  const summary: Summary = {
    totalUnpaid: bills.filter(b => !b.paid).reduce((s, b) => s + b.amount, 0),
    totalPaid: bills.filter(b => b.paid).reduce((s, b) => s + b.amount, 0),
    totalOverdue: bills.filter(b => !b.paid && new Date(b.due_date) < new Date()).reduce((s, b) => s + b.amount, 0),
    count: bills.length,
  }

  if (wsLoading || !currentWorkspace) return null

  const sharedProps: BillsProps = {
    bills,
    loading,
    summary,
    categories,
    caixas,
    selectedMonth,
    onPrevMonth: () => setSelectedMonth(m => m.month === 0
      ? { year: m.year - 1, month: 11 }
      : { year: m.year, month: m.month - 1 }),
    onNextMonth: () => setSelectedMonth(m => m.month === 11
      ? { year: m.year + 1, month: 0 }
      : { year: m.year, month: m.month + 1 }),
    categoryId, caixaId, paidFilter, search, sort,
    setCategoryId, setCaixaId, setPaidFilter, setSearch, setSort,
    onFilter: fetchBills,
    onClearFilters: handleClearFilters,
    onAdd: () => setShowAddModal(true),
    onEdit: (bill) => setEditingBill(bill),
    onDelete: handleDelete,
    onTogglePaid: handleTogglePaid,
    onExport: () => exportToCSV(bills, selectedMonth.year, selectedMonth.month),
    canWrite: currentWorkspace.role !== 'viewer',
  }

  return (
    <>
      <div className="md:hidden"><BillsMobile {...sharedProps} /></div>
      <div className="hidden md:block"><BillsDesktop {...sharedProps} /></div>

      {showAddModal && (
        <AddBillModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          workspaceId={currentWorkspace.id}
          onSuccess={fetchBills}
          categories={categories}
          caixas={caixas}
        />
      )}
      {editingBill && (
        <EditBillModal
          isOpen={!!editingBill}
          onClose={() => setEditingBill(null)}
          bill={editingBill}
          onSuccess={fetchBills}
          categories={categories}
          caixas={caixas}
        />
      )}
    </>
  )
}