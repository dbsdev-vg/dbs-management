import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowUp, faArrowDown, faTriangleExclamation,
    faClock, faWallet, faChevronDown, faChevronUp,
    faCheck, faCalendarDays,
} from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/utils/supabase/client'
import type { DashboardData, CategoryBreakdown, RecentTransaction, Caixa } from '../page'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fmt(amount: number) {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short',
    })
}

export function currentMonthLabel() {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// PostgREST returns embedded resources as arrays ([{ name }]) — but be
// defensive about a plain object too, so this works regardless of shape.
export function getCategoryName(categories: unknown): string {
    if (!categories) return 'Sem categoria'
    if (Array.isArray(categories)) return (categories[0] as any)?.name ?? 'Sem categoria'
    return (categories as any).name ?? 'Sem categoria'
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-muted/60 rounded-xl animate-pulse ${className}`} />
}

// ---------------------------------------------------------------------------
// Summary stat card
// ---------------------------------------------------------------------------

export function StatCard({
    label, value, sub, positive, neutral,
}: {
    label: string
    value: string
    sub?: string
    positive?: boolean
    neutral?: boolean
}) {
    const valueColor = neutral ? 'text-foreground' : positive ? 'text-income' : 'text-expense'
    return (
        <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Caixa card
// ---------------------------------------------------------------------------

export function CaixaCard({ caixa }: { caixa: Caixa }) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faWallet} className="text-muted-foreground text-xs" />
                </div>
                <p className="text-sm text-muted-foreground font-medium truncate">{caixa.name}</p>
            </div>
            <p className={`text-lg font-bold ${caixa.current_balance >= 0 ? 'text-foreground' : 'text-expense'}`}>
                {fmt(caixa.current_balance)}
            </p>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Bills alert
// ---------------------------------------------------------------------------

type Bill = { id: string; description: string; amount: number; due_date: string; paid: boolean }

function localToday() {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseLocal(dateStr: string) {
    const [y, m, day] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, day)
}

function daysUntil(dateStr: string) {
    const diff = parseLocal(dateStr).getTime() - localToday().getTime()
    return Math.round(diff / (1000 * 60 * 60 * 24))
}

function fmtDueDate(dateStr: string): { label: string; urgent: boolean; overdue: boolean } {
    const days = daysUntil(dateStr)
    if (days < 0) return { label: `Venceu h\u00e1 ${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''}`, urgent: true, overdue: true }
    if (days === 0) return { label: 'Vence hoje', urgent: true, overdue: false }
    if (days === 1) return { label: 'Vence amanh\u00e3', urgent: true, overdue: false }
    if (days <= 7) return { label: `Vence em ${days} dias`, urgent: true, overdue: false }
    const date = parseLocal(dateStr)
    return {
        label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        urgent: false,
        overdue: false,
    }
}

function BillRow({ bill, onPaid }: { bill: Bill; onPaid: (id: string) => void }) {
    const [marking, setMarking] = useState(false)
    const supabase = createClient()
    const due = fmtDueDate(bill.due_date)

    const handleMark = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setMarking(true)
        await supabase.from('bills').update({ paid: true }).eq('id', bill.id)
        onPaid(bill.id)
        setMarking(false)
    }

    return (
        <div className="group flex items-center gap-3 py-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                due.overdue ? 'bg-expense/15' : due.urgent ? 'bg-warning/15' : 'bg-muted'
            }`}>
                <FontAwesomeIcon
                    icon={due.overdue ? faTriangleExclamation : due.urgent ? faClock : faCalendarDays}
                    className={`text-xs ${due.overdue ? 'text-expense' : due.urgent ? 'text-warning' : 'text-muted-foreground/90'}`}
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">{bill.description}</p>
                <p className={`text-xs mt-0.5 ${
                    due.overdue ? 'text-expense' : due.urgent ? 'text-warning' : 'text-muted-foreground/90'
                }`}>
                    {due.label}
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-semibold ${
                    due.overdue ? 'text-expense' : due.urgent ? 'text-warning/80' : 'text-foreground'
                }`}>
                    {fmt(bill.amount)}
                </span>
                <button
                    onClick={handleMark}
                    disabled={marking}
                    title="Marcar como paga"
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-input text-muted-foreground/70 hover:border-income hover:text-income hover:bg-income/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                >
                    {marking
                        ? <span className="w-3 h-3 border border-foreground/40 border-t-transparent rounded-full animate-spin" />
                        : <FontAwesomeIcon icon={faCheck} className="text-xs" />
                    }
                </button>
            </div>
        </div>
    )
}

type BillGroup = { label: string; icon: any; iconColor: string; bills: Bill[] }

export function BillsAlert({
  overdue,
  upcoming,
  nextMonthTotal,
  onRefresh,
}: {
  overdue: Bill[]
  upcoming: Bill[]
  nextMonthTotal: number
  onRefresh?: () => void
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const vis = (bills: Bill[]) => bills.filter(b => !dismissed.has(b.id))
  const visOverdue = vis(overdue)
  const visUpcoming = vis(upcoming)
  const totalCount = visOverdue.length + visUpcoming.length

  if (totalCount === 0 && nextMonthTotal === 0) return null

  const totalAmount = [...visOverdue, ...visUpcoming]
    .reduce((s, b) => s + b.amount, 0)

  const handlePaid = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    onRefresh?.()
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Contas do mês
            {totalCount > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground/90">({totalCount})</span>
            )}
          </h3>
          {totalAmount > 0 && (
            <p className="text-xs text-expense mt-0.5">{fmt(totalAmount)} em aberto</p>
          )}
        </div>
        <Link href="/bills" className="text-xs text-expense hover:text-expense/80 transition-colors">
          Ver todas
        </Link>
      </div>

      {/* Overdue */}
      {visOverdue.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-2 py-2 border-b border-border/40">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs text-expense" />
            <span className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider">
              Vencidas
            </span>
            <span className="text-xs text-foreground/60 ml-auto">
              {fmt(visOverdue.reduce((s, b) => s + b.amount, 0))}
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {visOverdue.map(bill => <BillRow key={bill.id} bill={bill} onPaid={handlePaid} />)}
          </div>
        </div>
      )}

      {/* Upcoming this month */}
      {visUpcoming.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-2 py-2 border-b border-border/40">
            <FontAwesomeIcon icon={faClock} className="text-xs text-warning" />
            <span className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider">
              A vencer este mês
            </span>
            <span className="text-xs text-foreground/60 ml-auto">
              {fmt(visUpcoming.reduce((s, b) => s + b.amount, 0))}
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {visUpcoming.map(bill => <BillRow key={bill.id} bill={bill} onPaid={handlePaid} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <p className="text-sm text-muted-foreground/70 px-4 py-4 text-center">
          Nenhuma conta pendente este mês.
        </p>
      )}

      {/* Next month summary */}
      {nextMonthTotal > 0 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground/90">Próximo mês</span>
          <span className="text-xs font-semibold text-muted-foreground">{fmt(nextMonthTotal)} pendente</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Category breakdown
// ---------------------------------------------------------------------------

export function CategoryBreakdownCard({ categories }: { categories: CategoryBreakdown[] }) {
    if (categories.length === 0) return null

    const colors = ['bg-expense', 'bg-warning', 'bg-info', 'bg-purple-500', 'bg-emerald-500']

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Gastos por categoria</h3>
                <p className="text-xs text-muted-foreground/90 mt-0.5">{currentMonthLabel()}</p>
            </div>
            <div className="px-4 py-3 space-y-3">
                {categories.map((cat, i) => (
                    <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                                <span className="text-sm text-foreground/80 truncate">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-muted-foreground/90">{cat.percentage}%</span>
                                <span className="text-sm text-foreground font-medium">{fmt(cat.total)}</span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${colors[i % colors.length]}`}
                                style={{ width: `${cat.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Recent transactions
// ---------------------------------------------------------------------------

export function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Últimas transações</h3>
                <Link href="/transactions" className="text-xs text-expense hover:text-expense/80">
                    Ver todas
                </Link>
            </div>

            {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground/90 px-4 py-6 text-center">
                    Nenhuma transação ainda.
                </p>
            ) : (
                <div className="divide-y divide-border/60">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === 'income' ? 'bg-income/15' : 'bg-expense/15'
                            }`}>
                                <FontAwesomeIcon
                                    icon={tx.type === 'income' ? faArrowUp : faArrowDown}
                                    className={`text-xs ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground truncate">
                                    {tx.description || 'Sem descrição'}
                                </p>
                                <p className="text-xs text-muted-foreground/90">
                                    {fmtDate(tx.date)}
                                    {getCategoryName(tx.categories) !== 'Sem categoria' ? ` · ${getCategoryName(tx.categories)}` : ''}
                                </p>
                            </div>
                            <p className={`text-sm font-semibold flex-shrink-0 ${
                                tx.type === 'income' ? 'text-income' : 'text-expense'
                            }`}>
                                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Business-only: Tax estimate card
// ---------------------------------------------------------------------------

export function TaxEstimateCard({ revenue, estimate }: { revenue: number; estimate: number }) {
    return (
        <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-1">Estimativa de imposto</p>
            <p className="text-xl font-bold text-warning">{fmt(estimate)}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">15% sobre {fmt(revenue)}</p>
        </div>
    )
}