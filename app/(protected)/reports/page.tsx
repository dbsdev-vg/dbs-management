'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { createClient } from '@/utils/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Area,
} from 'recharts'
import { format, addDays, isAfter, isSameDay, startOfDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  category_id: string
  date: string
  categories?: { name: string }
}

type Bill = {
  id: string
  amount: number
  due_date: string
  paid: boolean
  description: string
}

type ExpectedIncome = {
  id: string
  date: string
  amount: number
  description: string
}

export default function ReportsPage() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([])

  // P&L filters
  const [startDate, setStartDate] = useState(format(addDays(new Date(), -30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [profitLossData, setProfitLossData] = useState<{ category: string; income: number; expense: number }[]>([])

  // Cash flow forecast
  const [forecastDays, setForecastDays] = useState(60)
  const [forecast, setForecast] = useState<{ date: string; balance: number }[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)

  // New expected income form
  const [newIncomeDate, setNewIncomeDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newIncomeAmount, setNewIncomeAmount] = useState('')
  const [newIncomeDesc, setNewIncomeDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    if (!wsLoading && currentWorkspace?.type !== 'business') {
      router.replace('/')
    }
  }, [wsLoading, currentWorkspace, router])

  const fetchData = async () => {
    if (!currentWorkspace) return
    setLoading(true)

    // Fetch transactions for P&L (date range)
    const { data: txData } = await supabase
      .from('transactions')
      .select('id, type, amount, category_id, date')
      .eq('workspace_id', currentWorkspace.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    setTransactions(txData || [])

    // Fetch bills (unpaid and future)
    const { data: billsData } = await supabase
      .from('bills')
      .select('id, amount, due_date, paid, description')
      .eq('workspace_id', currentWorkspace.id)
      .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
      .order('due_date', { ascending: true })
    setBills(billsData || [])

    // Fetch expected incomes (from a new table: `forecast_incomes`)
    const { data: incData } = await supabase
      .from('forecast_incomes')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .order('date', { ascending: true })
    setExpectedIncomes(incData || [])

    // Compute current balance (all transactions before today)
    const { data: allTx } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('workspace_id', currentWorkspace.id)
      .lt('date', format(new Date(), 'yyyy-MM-dd'))
    let balance = 0
    allTx?.forEach(tx => {
      if (tx.type === 'income') balance += tx.amount
      else balance -= tx.amount
    })
    setCurrentBalance(balance)

    setLoading(false)
  }

  useEffect(() => {
    if (currentWorkspace) fetchData()
  }, [currentWorkspace, startDate, endDate])

  // Update P&L when transactions change
  useEffect(() => {
    // Group by category (need category names – we'll fetch categories separately or use a map)
    // For simplicity, we'll fetch categories here. But to keep clean, we'll do a separate query inside fetchData? Better: fetch categories once.
    const buildProfitLoss = async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('workspace_id', currentWorkspace?.id)
      const catMap = new Map(cats?.map(c => [c.id, c.name]) || [])

      const agg = new Map<string, { income: number; expense: number }>()
      transactions.forEach(tx => {
        const catName = catMap.get(tx.category_id) || 'Sem categoria'
        if (!agg.has(catName)) agg.set(catName, { income: 0, expense: 0 })
        const entry = agg.get(catName)!
        if (tx.type === 'income') entry.income += tx.amount
        else entry.expense += tx.amount
      })
      const result = Array.from(agg.entries()).map(([category, values]) => ({
        category,
        income: values.income,
        expense: values.expense,
      }))
      setProfitLossData(result)
    }
    if (transactions.length) buildProfitLoss()
  }, [transactions, currentWorkspace])

  // Update cash flow forecast
  useEffect(() => {
    // Start with current balance
    let balance = currentBalance
    const forecastMap = new Map<string, number>()
    const today = startOfDay(new Date())

    // Add expected incomes
    expectedIncomes.forEach(inc => {
      const day = inc.date
      const incAmount = inc.amount
      forecastMap.set(day, (forecastMap.get(day) || 0) + incAmount)
    })

    // Add bill expenses (future, unpaid)
    bills.forEach(bill => {
      const day = bill.due_date
      if (!bill.paid && isAfter(parseISO(day), today)) {
        forecastMap.set(day, (forecastMap.get(day) || 0) - bill.amount)
      }
    })

    // Sort days and build cumulative balance
    const sortedDays = Array.from(forecastMap.keys()).sort()
    const forecastArray: { date: string; balance: number }[] = []
    let runningBalance = balance
    for (let i = 0; i <= forecastDays; i++) {
      const date = format(addDays(today, i), 'yyyy-MM-dd')
      const delta = forecastMap.get(date) || 0
      runningBalance += delta
      forecastArray.push({ date, balance: runningBalance })
    }
    setForecast(forecastArray)
  }, [currentBalance, expectedIncomes, bills, forecastDays])

  const addExpectedIncome = async () => {
    if (!newIncomeAmount || !currentWorkspace) return
    setAddLoading(true)
    const amount = parseFloat(newIncomeAmount)
    if (isNaN(amount) || amount <= 0) return
    await supabase.from('forecast_incomes').insert({
      workspace_id: currentWorkspace.id,
      date: newIncomeDate,
      amount,
      description: newIncomeDesc || 'Previsão de recebimento',
    })
    setNewIncomeAmount('')
    setNewIncomeDesc('')
    fetchData()
    setAddLoading(false)
  }

  if (wsLoading || loading) {
    return <div className="text-foreground p-6">Carregando...</div>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>

      {/* P&L Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <h2 className="text-lg font-semibold text-foreground">Demonstração de Resultados (DRE)</h2>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-muted border border-input rounded px-3 py-1 text-foreground"
            />
            <span className="text-muted-foreground self-center">a</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-muted border border-input rounded px-3 py-1 text-foreground"
            />
          </div>
        </div>

        {profitLossData.length === 0 ? (
          <p className="text-muted-foreground/90">Nenhuma transação no período.</p>
        ) : (
          <>
            <div className="h-80 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitLossData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="category" stroke="#a1a1aa" />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#27272a', borderColor: '#3f3f46' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#22c55e" />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-input">
                  <tr className="text-muted-foreground">
                    <th className="text-left py-2">Categoria</th>
                    <th className="text-right py-2">Receitas (R$)</th>
                    <th className="text-right py-2">Despesas (R$)</th>
                    <th className="text-right py-2">Resultado (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {profitLossData.map(row => {
                    const result = row.income - row.expense
                    return (
                      <tr key={row.category} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{row.category}</td>
                        <td className="py-2 text-right text-income">{row.income.toFixed(2)}</td>
                        <td className="py-2 text-right text-expense">{row.expense.toFixed(2)}</td>
                        <td className={`py-2 text-right font-medium ${result >= 0 ? 'text-income' : 'text-expense'}`}>
                          {result.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Cash Flow Forecast Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <h2 className="text-lg font-semibold text-foreground">Projeção de Fluxo de Caixa (próximos {forecastDays} dias)</h2>
          <select
            value={forecastDays}
            onChange={e => setForecastDays(Number(e.target.value))}
            className="bg-muted border border-input rounded px-3 py-1 text-foreground"
          >
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>

        

        <div className="text-sm text-muted-foreground mb-4">
          Saldo atual: <span className="text-foreground font-medium">R$ {currentBalance.toFixed(2)}</span>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-foreground font-medium mb-3">Adicionar previsão de recebimento (fora contas a receber)</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={newIncomeDate}
              onChange={e => setNewIncomeDate(e.target.value)}
              className="bg-muted border border-input rounded px-3 py-2 text-foreground"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor (R$)"
              value={newIncomeAmount}
              onChange={e => setNewIncomeAmount(e.target.value)}
              className="bg-muted border border-input rounded px-3 py-2 text-foreground w-32"
            />
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={newIncomeDesc}
              onChange={e => setNewIncomeDesc(e.target.value)}
              className="bg-muted border border-input rounded px-3 py-2 text-foreground flex-1"
            />
            <button
              onClick={addExpectedIncome}
              disabled={addLoading || !newIncomeAmount}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded transition"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}