'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye, faEyeSlash, faArrowUp, faArrowDown,
  faWallet, faChevronRight, faScaleBalanced,
  faChevronLeft, faChevronRight as faChevronRight2,
} from '@fortawesome/free-solid-svg-icons'
import type { DashProps, RecentTransaction, CategoryBreakdown, Caixa } from '../page'
import { Skeleton, BillsAlert, getCategoryName } from '@/app/(protected)/shared/shared'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, hidden = false) {
  if (hidden) return 'R$ ••••••'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtShort(n: number, hidden = false) {
  if (hidden) return '••••'
  if (Math.abs(n) >= 1000) {
    return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k'
  }
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ---------------------------------------------------------------------------
// Hero — total balance + month summary + month navigation
// ---------------------------------------------------------------------------

function Hero({
  totalBalance, monthlyIncome, monthlyExpenses, netThisMonth, hidden, onToggle, workspaceType, grossMargin,
  selectedMonth, onPrevMonth, onNextMonth,
}: {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netThisMonth: number
  hidden: boolean
  onToggle: () => void
  workspaceType: 'personal' | 'business'
  grossMargin: number
  selectedMonth: { year: number; month: number }
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  return (
    <div className="w-full overflow-hidden bg-gradient-to-b from-muted to-background px-5 pt-5 pb-8">
      {/* Month + toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={onPrevMonth} aria-label="Mês anterior" className="text-muted-foreground/90 hover:text-foreground/80 p-1">
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>
          <span className="text-xs text-muted-foreground/90 uppercase tracking-widest">
            {new Date(selectedMonth.year, selectedMonth.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={onNextMonth} aria-label="Próximo mês" className="text-muted-foreground/90 hover:text-foreground/80 p-1">
            <FontAwesomeIcon icon={faChevronRight2} className="text-xs" />
          </button>
        </div>
        <button onClick={onToggle} aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'} className="text-muted-foreground/90 hover:text-foreground/80 transition-colors p-1">
          <FontAwesomeIcon icon={hidden ? faEyeSlash : faEye} />
        </button>
      </div>

      {/* Main balance */}
      <div className="text-center mb-6">
        <p className="text-xs text-muted-foreground/90 uppercase tracking-widest mb-2">Saldo total</p>
        <p className={`text-3xl font-bold tracking-tight truncate ${totalBalance < 0 ? 'text-expense' : 'text-foreground'}`}>
          {fmt(totalBalance, hidden)}
        </p>
      </div>

      {/* Income / Expense pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="flex items-center gap-2 bg-income/10 border border-income/20 rounded-full px-3 py-2">
          <FontAwesomeIcon icon={faArrowUp} className="text-income text-xs" />
          <div>
            <p className="text-[10px] text-income/70 leading-none mb-0.5">Receitas</p>
            <p className="text-sm font-semibold text-income leading-none">
              {fmtShort(monthlyIncome, hidden)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-expense/10 border border-expense/20 rounded-full px-3 py-2">
          <FontAwesomeIcon icon={faArrowDown} className="text-expense text-xs" />
          <div>
            <p className="text-[10px] text-expense/70 leading-none mb-0.5">Despesas</p>
            <p className="text-sm font-semibold text-expense leading-none">
              {fmtShort(monthlyExpenses, hidden)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-accent/40 border border-input rounded-full px-3 py-2">
          <FontAwesomeIcon icon={faScaleBalanced} className="text-muted-foreground text-xs" />
          <div>
            <p className="text-[10px] text-muted-foreground/90 leading-none mb-0.5">Saldo do período</p>
            <p className={`text-sm font-semibold leading-none ${netThisMonth > 0 ? 'text-income' : netThisMonth < 0 ? 'text-expense' : 'text-foreground'}`}>
              {fmtShort(netThisMonth, hidden)}
            </p>
          </div>
        </div>

        {workspaceType === 'business' && (
          <div className="flex items-center gap-2 bg-accent/40 border border-input rounded-full px-3 py-2">
            <div>
              <p className="text-[10px] text-muted-foreground/90 leading-none mb-0.5">Margem</p>
              <p className={`text-sm font-semibold leading-none ${grossMargin >= 0 ? 'text-foreground' : 'text-expense'}`}>
                {grossMargin}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Account strip
// ---------------------------------------------------------------------------

function AccountStrip({ caixas, hidden }: { caixas: Caixa[]; hidden: boolean }) {
  if (caixas.length === 0) return null

  return (
    <div className="px-4 -mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {caixas.map(c => (
          <div
            key={c.id}
            className="flex-shrink-0 bg-card border border-border rounded-2xl px-4 py-3 min-w-[140px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faWallet} className="text-muted-foreground/90 text-xs" />
              <span className="text-xs text-muted-foreground truncate">{c.name}</span>
            </div>
            <p className={`text-base font-bold ${c.current_balance < 0 ? 'text-expense' : 'text-foreground'}`}>
              {hidden ? '••••' : c.current_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function Categories({ categories }: { categories: CategoryBreakdown[] }) {
  if (categories.length === 0) return null

  const colors = ['bg-expense', 'bg-warning', 'bg-info', 'bg-purple-500', 'bg-emerald-500']

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Gastos por categoria</h2>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {categories.map((cat, i) => (
          <div key={cat.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                <span className="text-sm text-foreground/80">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/90">{cat.percentage}%</span>
                <span className="text-sm font-medium text-foreground w-20 text-right">
                  {fmt(cat.total)}
                </span>
              </div>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                style={{ width: `${cat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Recent transactions
// ---------------------------------------------------------------------------

function RecentTx({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <section className="px-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
        <Link href="/transactions" className="text-xs text-expense flex items-center gap-1">
          Ver todas <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground/90">Nenhuma transação ainda.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-income/15' : 'bg-expense/15'
                }`}>
                <FontAwesomeIcon
                  icon={tx.type === 'income' ? faArrowUp : faArrowDown}
                  className={`text-xs ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">
                  {tx.description || 'Sem descrição'}
                </p>
                <p className="text-xs text-muted-foreground/90 mt-0.5">
                  {fmtDate(tx.date)}
                  {getCategoryName(tx.categories) !== 'Sem categoria' ? ` · ${getCategoryName(tx.categories)}` : ''}
                </p>
              </div>
              <p className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-income' : 'text-expense'
                }`}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Business extra: tax + payroll stubs
// ---------------------------------------------------------------------------

function BusinessExtras({ taxEstimate, revenue }: { taxEstimate: number; revenue: number }) {
  return (
    <section className="px-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground/90 uppercase tracking-wider mb-1">Impostos est.</p>
          <p className="text-base font-bold text-warning">{fmt(taxEstimate)}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">15% s/ {fmt(revenue)}</p>
        </div>
        <div className="bg-card border border-dashed border-input rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground/90 font-medium">Folha de pagamento</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Em breve</p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MobileSkeleton() {
  return (
    <div>
      <div className="bg-muted h-52 w-full" />
      <div className="px-4 -mt-4 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-20 w-36 flex-shrink-0 rounded-2xl" />
          <Skeleton className="h-20 w-36 flex-shrink-0 rounded-2xl" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function DashMobile({
  data,
  loading,
  workspaceType,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
}: DashProps) {
  const [hidden, setHidden] = useState(false)

  if (loading || !data) return <MobileSkeleton />

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background space-y-4">
      <Hero
        totalBalance={data.totalBalance}
        monthlyIncome={data.monthlyIncome}
        monthlyExpenses={data.monthlyExpenses}
        netThisMonth={data.netThisMonth}
        hidden={hidden}
        onToggle={() => setHidden(h => !h)}
        workspaceType={workspaceType}
        grossMargin={data.grossMargin}
        selectedMonth={selectedMonth}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />

      <AccountStrip caixas={data.caixas} hidden={hidden} />

      {workspaceType === 'business' && (
        <BusinessExtras taxEstimate={data.taxEstimate} revenue={data.monthlyIncome} />
      )}

      {(data.overdueBills.length > 0 || data.upcomingBills.length > 0 || data.nextMonthTotal > 0) && (
        <div className="px-4">
          <BillsAlert overdue={data.overdueBills} upcoming={data.upcomingBills} nextMonthTotal={data.nextMonthTotal} onRefresh={() => window.location.reload()} />
        </div>
      )}

      <Categories categories={data.categoryBreakdown} />

      <RecentTx transactions={data.recentTransactions} />
    </div>
  )
}