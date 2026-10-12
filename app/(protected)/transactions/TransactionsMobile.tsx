'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faFilter, faXmark,
  faArrowUp, faArrowDown, faArrowRightArrowLeft,
  faPencil, faTrash, faChevronDown, faFileExport,
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
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

// ---------------------------------------------------------------------------
// Insights strip (collapsible with detailed panel)
// ---------------------------------------------------------------------------

function InsightsStrip({ insights }: { insights: CategoryInsight[] }) {
  if (insights.length === 0) return null
  const [open, setOpen] = useState(false)

  const total = insights.reduce((s, i) => s + i.thisMonth, 0)
  const colors = ['bg-expense', 'bg-warning', 'bg-info', 'bg-purple-500', 'bg-emerald-500']

  return (
    <div className="mx-4 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold text-foreground">Gastos por categoria</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-muted-foreground/90 text-xs transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {insights.map((ins, i) => {
            const pct = total > 0 ? Math.round((ins.thisMonth / total) * 100) : 0
            return (
              <div key={ins.name}>
                {/* Header: category name + trend + amount */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                    <span className="text-sm text-foreground/80">{ins.name}</span>
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
      )}
    </div>
  )
}
// ---------------------------------------------------------------------------
// Transaction card
// ---------------------------------------------------------------------------

function TxCard({ tx, onEdit, onDelete, canWrite = true }: {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  canWrite?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isIncome = tx.type === 'income'
  const isTransfer = !!tx.transfer_id

  return (
    <div className="overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isTransfer ? 'bg-info/15' : isIncome ? 'bg-income/15' : 'bg-expense/15'
          }`}>
          <FontAwesomeIcon
            icon={isTransfer ? faArrowRightArrowLeft : isIncome ? faArrowUp : faArrowDown}
            className={`text-xs ${isTransfer ? 'text-info' : isIncome ? 'text-income' : 'text-expense'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium truncate">
            {tx.description || 'Sem descrição'}
          </p>
          <p className="text-xs text-muted-foreground/90 mt-0.5 truncate">
            {(tx.categories as any)?.name ?? '—'}
            {(tx.caixas as any)?.name ? ` · ${(tx.caixas as any).name}` : ''}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-semibold ${isTransfer ? 'text-info' : isIncome ? 'text-income' : 'text-expense'
            }`}>
            {isIncome ? '+' : '-'}{fmt(tx.amount)}
          </p>
          {isTransfer && (
            <span className="text-[10px] text-info/60">Transferência</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="mx-4 mb-2 bg-muted/50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground/90">
            {(tx.payment_methods as any)?.name ?? 'Sem método'}
          </p>
          {canWrite && (
            <div className="flex items-center gap-4">
              <button onClick={() => onEdit(tx)} className="text-xs text-info flex items-center gap-1">
                <FontAwesomeIcon icon={faPencil} className="text-[10px]" /> Editar
              </button>
              <button onClick={() => onDelete(tx.id)} className="text-xs text-expense flex items-center gap-1">
                <FontAwesomeIcon icon={faTrash} className="text-[10px]" /> Excluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter sheet
// ---------------------------------------------------------------------------

function FilterSheet({ open, onClose, props }: {
  open: boolean
  onClose: () => void
  props: TransactionsProps
}) {
  if (!open) return null

  const {
    categoryId, caixaId, paymentMethodId, typeFilter, showTransfers, sort,
    setCategoryId, setCaixaId, setPaymentMethodId, setTypeFilter, setShowTransfers, setSort,
    categories, caixas, paymentMethods, onFilter, onClearFilters,
  } = props

  const selectClass = 'w-full bg-muted border border-input rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none'

  const apply = () => { onFilter(); onClose() }
  const clear = () => { onClearFilters(); onClose() }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground font-semibold text-lg">Filtros</h2>
          <button onClick={onClose} className="text-muted-foreground p-1">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs text-muted-foreground/90 uppercase tracking-wider block mb-2">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {(['all', 'income', 'expense'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`py-2 rounded-xl text-sm font-medium border transition-colors ${typeFilter === t
                    ? t === 'income' ? 'bg-income/15 border-income text-income'
                      : t === 'expense' ? 'bg-primary/20 border-primary text-expense'
                        : 'bg-accent border-foreground/40 text-foreground'
                    : 'bg-muted border-input text-muted-foreground'
                  }`}>
                {t === 'all' ? 'Todos' : t === 'income' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs text-muted-foreground/90 uppercase tracking-wider block mb-2">Ordenar</label>
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className={selectClass}>
            <option value="date_desc">Data (mais recente)</option>
            <option value="date_asc">Data (mais antiga)</option>
            <option value="amount_desc">Maior valor</option>
            <option value="amount_asc">Menor valor</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-muted-foreground/90 uppercase tracking-wider block mb-2">Categoria</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={selectClass}>
            <option value="">Todas</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Conta */}
        <div>
          <label className="text-xs text-muted-foreground/90 uppercase tracking-wider block mb-2">Conta</label>
          <select value={caixaId} onChange={e => setCaixaId(e.target.value)} className={selectClass}>
            <option value="">Todas</option>
            {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Method */}
        <div>
          <label className="text-xs text-muted-foreground/90 uppercase tracking-wider block mb-2">Método</label>
          <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {paymentMethods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Transfers toggle */}
        <button
          onClick={() => setShowTransfers(!showTransfers)}
          className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors ${showTransfers
              ? 'bg-info/15 border-info text-info'
              : 'bg-muted border-input text-muted-foreground'
            }`}
        >
          {showTransfers ? '✓ Incluindo transferências' : 'Incluir transferências'}
        </button>

        <div className="flex gap-3 pt-1">
          <button onClick={clear} className="flex-1 py-3 rounded-xl border border-input text-foreground/80 text-sm">
            Limpar
          </button>
          <button onClick={apply} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium">
            Aplicar
          </button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------

function ActiveChips({ props }: { props: TransactionsProps }) {
  const chips = [
    props.typeFilter !== 'all' && {
      label: props.typeFilter === 'income' ? 'Receitas' : 'Despesas',
      clear: () => props.setTypeFilter('all'),
    },
    props.categoryId && {
      label: props.categories.find(c => c.id === props.categoryId)?.name ?? 'Categoria',
      clear: () => props.setCategoryId(''),
    },
    props.caixaId && {
      label: props.caixas.find(c => c.id === props.caixaId)?.name ?? 'Conta',
      clear: () => props.setCaixaId(''),
    },
    props.paymentMethodId && {
      label: props.paymentMethods.find(p => p.id === props.paymentMethodId)?.name ?? 'Método',
      clear: () => props.setPaymentMethodId(''),
    },
    props.showTransfers && {
      label: 'Com transferências',
      clear: () => props.setShowTransfers(false),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  if (chips.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
      {chips.map(chip => (
        <button
          key={chip.label}
          onClick={() => { chip.clear(); props.onFilter() }}
          className="flex-shrink-0 flex items-center gap-1.5 bg-muted border border-input rounded-full px-3 py-1 text-xs text-foreground/80"
        >
          {chip.label}
          <FontAwesomeIcon icon={faXmark} className="text-[10px] text-muted-foreground/90" />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ props }: { props: TransactionsProps }) {
  const { typeFilter, categoryId, search } = props
  const monthName = MONTH_NAMES[props.selectedMonth.month]

  let message = `Nenhuma transação em ${monthName}`
  if (typeFilter === 'income') message = `Nenhuma receita em ${monthName}`
  if (typeFilter === 'expense') message = `Nenhuma despesa em ${monthName}`
  if (categoryId) {
    const cat = props.categories.find(c => c.id === categoryId)?.name
    message = cat ? `Nenhuma transação em "${cat}"` : message
  }
  if (search) message = `Nenhum resultado para "${search}"`

  return (
    <div className="mx-4 bg-card border border-border rounded-2xl px-4 py-12 text-center">
      <p className="text-muted-foreground font-medium">{message}</p>
      {props.canWrite && (
        <button onClick={props.onAdd} className="mt-3 text-sm text-expense">
          + Adicionar transação
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function TransactionsMobile(props: TransactionsProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const { grouped, loading, summary, insights, selectedMonth, search, setSearch, onFilter } = props

  const activeFilterCount = [
    props.typeFilter !== 'all',
    !!props.categoryId,
    !!props.caixaId,
    !!props.paymentMethodId,
    props.showTransfers,
  ].filter(Boolean).length

  const isCurrentMonth = selectedMonth.year === new Date().getFullYear() &&
    selectedMonth.month === new Date().getMonth()

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Month nav + actions */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={props.onPrevMonth} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
            {MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}
          </span>
          <button
            onClick={props.onNextMonth}
            disabled={isCurrentMonth}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={props.onExport} className="text-muted-foreground/90 hover:text-foreground/80 p-2" title="Exportar CSV">
            <FontAwesomeIcon icon={faFileExport} />
          </button>
          <button
            onClick={() => setFilterOpen(true)}
            className="relative flex items-center gap-1.5 bg-muted border border-input rounded-xl px-3 py-2 text-sm text-foreground/80"
          >
            <FontAwesomeIcon icon={faFilter} className="text-xs" />
            Filtrar
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onFilter()}
          className="w-full bg-muted border border-input rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/40"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground/90 uppercase tracking-wider mb-1">Receitas</p>
          <p className="text-income font-semibold text-sm">{fmt(summary.income)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground/90 uppercase tracking-wider mb-1">Despesas</p>
          <p className="text-expense font-semibold text-sm">{fmt(summary.expenses)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground/90 uppercase tracking-wider mb-1">Total</p>
          <p className="text-foreground/80 font-semibold text-sm">{summary.count} itens</p>
        </div>
      </div>

      {/* Active chips */}
      <ActiveChips props={props} />

      {/* Insights */}
      {!loading && <div className="mt-3"><InsightsStrip insights={insights} /></div>}

      {/* Transaction list */}
      <div className="mt-4 space-y-4">
        {loading && (
          <div className="px-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && grouped.length === 0 && <EmptyState props={props} />}

        {!loading && grouped.map(({ date, transactions: txs }) => (
          <div key={date}>
            <div className="flex items-center justify-between px-4 mb-1">
              <p className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider">
                {fmtDate(date)}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {txs.filter(t => t.type === 'expense').length > 0 &&
                  '-' + fmt(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl mx-4 divide-y divide-border/60">
              {txs.map(tx => (
                <TxCard key={tx.id} tx={tx} onEdit={props.onEdit} onDelete={props.onDelete} canWrite={props.canWrite} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} props={props} />
    </div>
  )
}