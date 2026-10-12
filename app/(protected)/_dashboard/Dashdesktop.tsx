'use client'

import { DashProps } from '@/app/(protected)/page'
import {
  Skeleton, StatCard, CaixaCard, BillsAlert,
  CategoryBreakdownCard, RecentTransactions, TaxEstimateCard,
  fmt, currentMonthLabel,
} from '@/app/(protected)/shared/shared'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons'

// ---------------------------------------------------------------------------
// Personal desktop
// ---------------------------------------------------------------------------

function PersonalDesktop({ 
  data, 
  selectedMonth, 
  onPrevMonth, 
  onNextMonth 
}: { 
  data: NonNullable<DashProps['data']>
  selectedMonth: DashProps['selectedMonth']
  onPrevMonth: DashProps['onPrevMonth']
  onNextMonth: DashProps['onNextMonth']
}) {
  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button onClick={onPrevMonth} className="p-2 rounded-lg bg-muted hover:bg-accent text-foreground">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="text-foreground font-medium min-w-[120px] text-center capitalize">
            {new Date(selectedMonth.year, selectedMonth.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={onNextMonth} className="p-2 rounded-lg bg-muted hover:bg-accent text-foreground">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Receitas do mês"
          value={fmt(data.monthlyIncome)}
          positive
          sub="entradas no período"
        />
        <StatCard
          label="Despesas do mês"
          value={fmt(data.monthlyExpenses)}
          sub="saídas no período"
        />
        <StatCard
          label="Saldo do período"
          value={fmt(data.netThisMonth)}
          neutral={data.netThisMonth === 0}
          positive={data.netThisMonth > 0}
          sub={`saldo total: ${fmt(data.totalBalance)}`}
        />
      </div>

      {/* Caixas */}
      <div>
        <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-3">Contas</p>
        <div className="grid grid-cols-4 gap-3">
          {data.caixas.map(c => <CaixaCard key={c.id} caixa={c} />)}
          {data.caixas.length === 0 && (
            <p className="text-sm text-muted-foreground/70 col-span-4">Nenhuma conta criada ainda.</p>
          )}
        </div>
      </div>

      {/* Mid row: bills + categories */}
      <div className="grid grid-cols-2 gap-4">
        <BillsAlert overdue={data.overdueBills} upcoming={data.upcomingBills}  nextMonthTotal={data.nextMonthTotal} onRefresh={() => window.location.reload()}/>
        <CategoryBreakdownCard categories={data.categoryBreakdown} />
      </div>

      {/* Recent transactions */}
      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Business desktop
// ---------------------------------------------------------------------------

function BusinessDesktop({ 
  data, 
  selectedMonth, 
  onPrevMonth, 
  onNextMonth 
}: { 
  data: NonNullable<DashProps['data']>
  selectedMonth: DashProps['selectedMonth']
  onPrevMonth: DashProps['onPrevMonth']
  onNextMonth: DashProps['onNextMonth']
}) {
  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Empresarial</h1>
          <p className="text-sm text-muted-foreground/90 mt-0.5 capitalize">
            {new Date(selectedMonth.year, selectedMonth.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrevMonth} className="p-2 rounded-lg bg-muted hover:bg-accent text-foreground">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button onClick={onNextMonth} className="p-2 rounded-lg bg-muted hover:bg-accent text-foreground">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      {/* Business summary — 4 stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Receita"
          value={fmt(data.monthlyIncome)}
          positive
          sub="faturamento bruto"
        />
        <StatCard
          label="Custos"
          value={fmt(data.monthlyExpenses)}
          sub="despesas operacionais"
        />
        <StatCard
          label="Lucro líquido"
          value={fmt(data.netThisMonth)}
          neutral={data.netThisMonth === 0}
          positive={data.netThisMonth > 0}
          sub="receita − custos"
        />
        <StatCard
          label="Margem bruta"
          value={`${data.grossMargin}%`}
          neutral={data.grossMargin === 0}
          positive={data.grossMargin > 0}
          sub="rentabilidade do período"
        />
      </div>

      {/* Tax + bills + payroll stub */}
      <div className="grid grid-cols-3 gap-4">
        <TaxEstimateCard revenue={data.monthlyIncome} estimate={data.taxEstimate} />
        <BillsAlert overdue={data.overdueBills} upcoming={data.upcomingBills}  nextMonthTotal={data.nextMonthTotal} onRefresh={() => window.location.reload()}/>
        <div className="bg-card border border-dashed border-input rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted-foreground/90 font-medium">Folha de pagamento</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Disponível em breve</p>
        </div>
      </div>

      {/* Caixas */}
      <div>
        <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-3">Contas</p>
        <div className="grid grid-cols-4 gap-3">
          {data.caixas.map(c => <CaixaCard key={c.id} caixa={c} />)}
          {data.caixas.length === 0 && (
            <p className="text-sm text-muted-foreground/70 col-span-4">Nenhuma conta criada ainda.</p>
          )}
        </div>
      </div>

      {/* Categories + recent transactions */}
      <div className="grid grid-cols-2 gap-4">
        <CategoryBreakdownCard categories={data.categoryBreakdown} />
        <RecentTransactions transactions={data.recentTransactions} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DesktopSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function DashDesktop({ 
  data, 
  loading, 
  workspaceType,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
}: DashProps) {
  return (
    <div className="p-6">
      {loading || !data
        ? <DesktopSkeleton />
        : workspaceType === 'business'
          ? <BusinessDesktop 
              data={data} 
              selectedMonth={selectedMonth} 
              onPrevMonth={onPrevMonth} 
              onNextMonth={onNextMonth} 
            />
          : <PersonalDesktop 
              data={data} 
              selectedMonth={selectedMonth} 
              onPrevMonth={onPrevMonth} 
              onNextMonth={onNextMonth} 
            />
      }
    </div>
  )
}