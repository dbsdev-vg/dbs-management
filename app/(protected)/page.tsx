'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { createClient } from '@/utils/supabase/client'
import { DashMobile } from './_dashboard/Dashmobile'
import { DashDesktop } from './_dashboard/Dashdesktop'
import { getCategoryName } from '@/app/(protected)/shared/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Caixa = {
  id: string
  name: string
  current_balance: number
}

export type RecentTransaction = {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'income' | 'expense'
  categories?: { name: string }[] | null
  caixas?: { name: string }[] | null
}

export type Bill = {
  id: string
  description: string
  amount: number
  due_date: string
  paid: boolean
}

export type CategoryBreakdown = {
  name: string
  total: number
  percentage: number
}

export type DashboardData = {
  caixas: Caixa[]
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netThisMonth: number
  recentTransactions: RecentTransaction[]
  overdueBills: Bill[]
  upcomingBills: Bill[]
  nextMonthTotal: number
  categoryBreakdown: CategoryBreakdown[]
  // business only
  grossMargin: number
  taxEstimate: number
}

export type DashProps = {
  data: DashboardData | null
  loading: boolean
  workspaceType: 'personal' | 'business'
  selectedMonth: { year: number; month: number }
  onPrevMonth: () => void
  onNextMonth: () => void
}

const TAX_RATE = 0.15

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace()
  const router = useRouter()
  const supabase = createClient()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wsLoading && !currentWorkspace) router.push('/select-workspace')
  }, [wsLoading, currentWorkspace, router])

  useEffect(() => {
    if (currentWorkspace) fetchDashboard(selectedMonth.year, selectedMonth.month)
  }, [currentWorkspace?.id, selectedMonth])

  const fetchDashboard = async (year: number, month: number) => {
    if (!currentWorkspace) return
    setLoading(true)

    const wsId = currentWorkspace.id
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0]
    const nextMonthEnd = new Date(year, month + 2, 0).toISOString().split('T')[0]

    const [
      { data: caixasData },
      { data: monthTxData },
      { data: recentTxData },
      { data: overdueBillsData },
      { data: thisMonthBillsData },
      { data: nextMonthBillsData },
    ] = await Promise.all([
      supabase
        .from('caixas')
        .select('id, name, current_balance')
        .eq('workspace_id', wsId),

      supabase
        .from('transactions')
        .select('type, amount, transfer_id, categories(name)')
        .eq('workspace_id', wsId)
        .gte('date', monthStart)
        .lte('date', monthEnd),

      supabase
        .from('transactions')
        .select('id, date, description, amount, type, categories(name), caixas(name)')
        .eq('workspace_id', wsId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
        .limit(5),

      // Overdue — unpaid bills due before the viewed month
      supabase
        .from('bills')
        .select('id, description, amount, due_date, paid')
        .eq('workspace_id', wsId)
        .eq('paid', false)
        .lt('due_date', monthStart)
        .order('due_date', { ascending: true }),

      // Upcoming — unpaid bills within the viewed month
      supabase
        .from('bills')
        .select('id, description, amount, due_date, paid')
        .eq('workspace_id', wsId)
        .eq('paid', false)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: true }),

      // Next month — only need total, select minimal
      supabase
        .from('bills')
        .select('amount')
        .eq('workspace_id', wsId)
        .eq('paid', false)
        .gt('due_date', monthEnd)
        .lte('due_date', nextMonthEnd),
    ])

    const caixas: Caixa[] = caixasData ?? []
    const totalBalance = caixas.reduce((s, c) => s + c.current_balance, 0)

    const monthTx = monthTxData ?? []
    const realTx = monthTx.filter(t => !t.transfer_id)

    const monthlyIncome = realTx
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const monthlyExpenses = realTx
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const netThisMonth = monthlyIncome - monthlyExpenses

    // category breakdown
    const catMap = new Map<string, number>()
    for (const tx of realTx.filter(t => t.type === 'expense')) {
      const name = getCategoryName(tx.categories)
      catMap.set(name, (catMap.get(name) ?? 0) + tx.amount)
    }

    const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({
        name,
        total,
        percentage: monthlyExpenses > 0
          ? Math.round((total / monthlyExpenses) * 100)
          : 0,
      }))

    const grossMargin = monthlyIncome > 0
      ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
      : 0
    const taxEstimate = monthlyIncome * TAX_RATE

    setData({
      caixas,
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netThisMonth,
      recentTransactions: (recentTxData ?? []) as unknown as RecentTransaction[],
      overdueBills: (overdueBillsData ?? []) as Bill[],
      upcomingBills: (thisMonthBillsData ?? []) as Bill[],
      nextMonthTotal: (nextMonthBillsData ?? []).reduce((s: number, b: any) => s + b.amount, 0),
      categoryBreakdown,
      grossMargin,
      taxEstimate,
    })
    setLoading(false)
  }

  const handlePrevMonth = () => {
    setSelectedMonth(m => m.month === 0
      ? { year: m.year - 1, month: 11 }
      : { year: m.year, month: m.month - 1 })
  }

  const handleNextMonth = () => {
    setSelectedMonth(m => m.month === 11
      ? { year: m.year + 1, month: 0 }
      : { year: m.year, month: m.month + 1 })
  }

  if (wsLoading || !currentWorkspace) return null

  const props: DashProps = {
    data,
    loading,
    workspaceType: currentWorkspace.type as 'personal' | 'business',
    selectedMonth,
    onPrevMonth: handlePrevMonth,
    onNextMonth: handleNextMonth,
  }

  return (
    <>
      <div className="md:hidden">
        <DashMobile {...props} />
      </div>
      <div className="hidden md:block">
        <DashDesktop {...props} />
      </div>
    </>
  )
}