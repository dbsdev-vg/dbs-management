'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faFilter, faXmark,
  faArrowUp, faArrowDown, faArrowRightArrowLeft,
  faPencil, faTrash, faFileExport, faChevronDown,
  faTurnUp, faTurnDown,
} from '@fortawesome/free-solid-svg-icons'
import type { TransactionsProps, Transaction, CategoryInsight, SortOption } from './page'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string) {
  const date = new Date(d + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
}

// ---------------------------------------------------------------------------
// Insights panel
// ---------------------------------------------------------------------------
function InsightsPanel({ insights }: { insights: CategoryInsight[] }) {
  if (insights.length === 0) return null

  const total = insights.reduce((s, i) => s + i.thisMonth, 0)
  const colors = ['bg-expense', 'bg-warning', 'bg-info', 'bg-purple-500', 'bg-emerald-500']

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider mb-4">
        Gastos por categoria
      </h3>
      <div className="space-y-4">
        {insights.map((ins, i) => {
          const pct = total > 0 ? Math.round((ins.thisMonth / total) * 100) : 0
          return (
            <div key={ins.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                  <span className="text-sm text-foreground/80">{ins.name}</span>
                  {/* Trend badge */}
                  {ins.change !== null ? (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ins.change > 0
                        ? 'bg-expense/15 text-expense'
                        : 'bg-income/15 text-income'
                      }`}>
                      {ins.change > 0 ? '↑' : '↓'} {Math.abs(ins.change)}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-muted">
                      sem histórico
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">{fmt(ins.thisMonth)}</span>
                  <span className="text-xs text-muted-foreground/70 ml-2">{pct}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Last month comparison */}
              {ins.lastMonth > 0 && (
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Mês anterior: {fmt(ins.lastMonth)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
// ---------------------------------------------------------------------------
// Filter panel
// ---------------------------------------------------------------------------

function FilterPanel({ props, open }: { props: TransactionsProps; open: boolean }) {
  if (!open) return null

  const {
    categoryId, caixaId, paymentMethodId, typeFilter, showTransfers, sort, search,
    setCategoryId, setCaixaId, setPaymentMethodId, setTypeFilter, setShowTransfers, setSort, setSearch,
    categories, caixas, paymentMethods, onFilter, onClearFilters,
  } = props

  const inputClass = 'w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-expense transition-colors'

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-muted-foreground/90 block mb-1.5">Tipo</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className={inputClass}>
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground/90 block mb-1.5">Categoria</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground/90 block mb-1.5">Conta</label>
          <select value={caixaId} onChange={e => setCaixaId(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground/90 block mb-1.5">Método</label>
          <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {paymentMethods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground/90 block mb-1.5">Ordenar</label>
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className={inputClass}>
            <option value="date_desc">Data ↓</option>
            <option value="date_asc">Data ↑</option>
            <option value="amount_desc">Maior valor</option>
            <option value="amount_asc">Menor valor</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onFilter()}
          className={`flex-1 ${inputClass}`}
        />
        <button
          onClick={() => setShowTransfers(!showTransfers)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${showTransfers
              ? 'bg-info/15 border-info text-info'
              : 'bg-muted border-input text-muted-foreground hover:text-foreground/90'
            }`}
        >
          {showTransfers ? '✓ Transferências' : 'Transferências'}
        </button>
        <button onClick={onFilter} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
          Filtrar
        </button>
        <button onClick={() => { onClearFilters(); onFilter() }} className="px-3 py-2 text-muted-foreground hover:text-foreground border border-input rounded-lg transition-colors">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active chips
// ---------------------------------------------------------------------------

function ActiveChips({ props }: { props: TransactionsProps }) {
  const chips = [
    props.typeFilter !== 'all' && {
      label: props.typeFilter === 'income' ? 'Receitas' : 'Despesas',
      clear: () => { props.setTypeFilter('all'); props.onFilter() },
    },
    props.categoryId && {
      label: props.categories.find(c => c.id === props.categoryId)?.name ?? 'Categoria',
      clear: () => { props.setCategoryId(''); props.onFilter() },
    },
    props.caixaId && {
      label: props.caixas.find(c => c.id === props.caixaId)?.name ?? 'Conta',
      clear: () => { props.setCaixaId(''); props.onFilter() },
    },
    props.paymentMethodId && {
      label: props.paymentMethods.find(p => p.id === props.paymentMethodId)?.name ?? 'Método',
      clear: () => { props.setPaymentMethodId(''); props.onFilter() },
    },
    props.showTransfers && {
      label: 'Com transferências',
      clear: () => { props.setShowTransfers(false); props.onFilter() },
    },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground/90">Filtros:</span>
      {chips.map(chip => (
        <button
          key={chip.label}
          onClick={chip.clear}
          className="flex items-center gap-1.5 bg-muted border border-input rounded-full px-3 py-1 text-xs text-foreground/80 hover:border-foreground/40"
        >
          {chip.label}
          <FontAwesomeIcon icon={faXmark} className="text-[10px] text-muted-foreground/90" />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Transaction row
// ---------------------------------------------------------------------------

function TxRow({ tx, onEdit, onDelete, canWrite = true }: {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  canWrite?: boolean
}) {
  const isIncome = tx.type === 'income'
  const isTransfer = !!tx.transfer_id

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isTransfer ? 'bg-info/15' : isIncome ? 'bg-income/15' : 'bg-expense/15'
        }`}>
        <FontAwesomeIcon
          icon={isTransfer ? faArrowRightArrowLeft : isIncome ? faArrowUp : faArrowDown}
          className={`text-xs ${isTransfer ? 'text-info' : isIncome ? 'text-income' : 'text-expense'}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{tx.description || 'Sem descrição'}</p>
        <p className="text-xs text-muted-foreground/90">
          {(tx.categories as any)?.name ?? '—'}
          {(tx.payment_methods as any)?.name ? ` · ${(tx.payment_methods as any).name}` : ''}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${isTransfer ? 'text-info' : isIncome ? 'text-income' : 'text-expense'
          }`}>
          {isIncome ? '+' : '-'}{fmt(tx.amount)}
        </p>
        <p className="text-xs text-muted-foreground/70">{(tx.caixas as any)?.name ?? ''}</p>
      </div>

      {canWrite && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(tx)} className="text-muted-foreground hover:text-info p-1 transition-colors">
            <FontAwesomeIcon icon={faPencil} className="text-xs" />
          </button>
          <button onClick={() => onDelete(tx.id)} className="text-muted-foreground hover:text-expense p-1 transition-colors">
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ props }: { props: TransactionsProps }) {
  const { typeFilter, categoryId, search, selectedMonth } = props
  const monthName = MONTH_NAMES[selectedMonth.month]

  let message = `Nenhuma transação em ${monthName}`
  if (typeFilter === 'income') message = `Nenhuma receita em ${monthName}`
  if (typeFilter === 'expense') message = `Nenhuma despesa em ${monthName}`
  if (categoryId) {
    const cat = props.categories.find(c => c.id === categoryId)?.name
    if (cat) message = `Nenhuma transação em "${cat}"`
  }
  if (search) message = `Nenhum resultado para "${search}"`

  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">{message}</p>
      {props.canWrite && (
        <button onClick={props.onAdd} className="mt-2 text-sm text-expense">+ Adicionar transação</button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function TransactionsDesktop(props: TransactionsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { grouped, loading, summary, insights, selectedMonth } = props

  const activeFilterCount = [
    props.typeFilter !== 'all', !!props.categoryId, !!props.caixaId,
    !!props.paymentMethodId, props.showTransfers,
  ].filter(Boolean).length

  const isCurrentMonth = selectedMonth.year === new Date().getFullYear() &&
    selectedMonth.month === new Date().getMonth()

  return (
    <div className="p-6 space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <div className="flex items-center gap-1 bg-muted rounded-xl px-2 py-1">
            <button onClick={props.onPrevMonth} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>
            <span className="text-sm font-medium text-foreground px-2 min-w-[140px] text-center">
              {MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}
            </span>
            <button
              onClick={props.onNextMonth}
              disabled={isCurrentMonth}
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={props.onExport} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg px-3 py-2 transition-colors">
            <FontAwesomeIcon icon={faFileExport} className="text-xs" />
            Exportar CSV
          </button>
          <button
            onClick={() => setFiltersOpen(f => !f)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg px-3 py-2 transition-colors"
          >
            <FontAwesomeIcon icon={faFilter} className="text-xs" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`text-xs transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel props={props} open={filtersOpen} />

      {/* Summary + Insights */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-1">Receitas</p>
            <p className="text-lg font-bold text-income">{fmt(summary.income)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-1">Despesas</p>
            <p className="text-lg font-bold text-expense">{fmt(summary.expenses)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-1">Resultado</p>
            <p className={`text-lg font-bold ${summary.income - summary.expenses >= 0 ? 'text-foreground' : 'text-expense'}`}>
              {fmt(summary.income - summary.expenses)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground/90 uppercase tracking-wider mb-1">Transações</p>
            <p className="text-lg font-bold text-foreground/80">{summary.count}</p>
          </div>
        </div>
      )}

      {/* Active chips */}
      <ActiveChips props={props} />

      {/* Insights */}
      {!loading && insights.length > 0 && <InsightsPanel insights={insights} />}

      {/* Grouped list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState props={props} />
        ) : (
          <div>
            {grouped.map(({ date, transactions: txs }) => (
              <div key={date}>
                {/* Date group header */}
                <div className="flex items-center justify-between px-4 py-2 bg-background/50 border-b border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider capitalize">
                    {fmtDate(date)}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {txs.filter(t => t.type === 'expense').length > 0 && (
                      <span className="text-expense/70">
                        -{fmt(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                      </span>
                    )}
                    {txs.filter(t => t.type === 'income').length > 0 && (
                      <span className="text-income/70 ml-3">
                        +{fmt(txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
                      </span>
                    )}
                  </p>
                </div>
                <div className="divide-y divide-border/50">
                  {txs.map(tx => (
                    <TxRow key={tx.id} tx={tx} onEdit={props.onEdit} onDelete={props.onDelete} canWrite={props.canWrite} />
                  ))}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground/90">
              {summary.count} transação{summary.count !== 1 ? 'ões' : ''} em {MONTH_NAMES[selectedMonth.month]}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}