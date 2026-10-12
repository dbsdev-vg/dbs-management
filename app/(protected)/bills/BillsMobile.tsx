'use client'

import { BillsProps } from '@/app/(protected)/bills/page'
import { Button } from '@/components/ui/Button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faDownload, faPlus,
  faCheckCircle, faCircle, faTrash, faEdit, faExclamationCircle,
  faFilter,
} from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'

export function BillsMobile({
  bills,
  loading,
  summary,
  categories,
  caixas,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  categoryId,
  caixaId,
  paidFilter,
  search,
  sort,
  setCategoryId,
  setCaixaId,
  setPaidFilter,
  setSearch,
  setSort,
  onFilter,
  onClearFilters,
  onAdd,
  onEdit,
  onDelete,
  onTogglePaid,
  onExport,
  canWrite,
}: BillsProps) {
  const monthLabel = new Date(selectedMonth.year, selectedMonth.month)
    .toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-4 px-4">
      {/* Header with month nav and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onPrevMonth}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </Button>
          <span className="text-foreground font-medium capitalize">{monthLabel}</span>
          <Button size="sm" variant="secondary" onClick={onNextMonth}>
            <FontAwesomeIcon icon={faChevronRight} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            <FontAwesomeIcon icon={faFilter} />
          </Button>
          {canWrite && (
            <Button size="sm" onClick={onAdd}><FontAwesomeIcon icon={faPlus} /></Button>
          )}
          <Button size="sm" variant="secondary" onClick={onExport}><FontAwesomeIcon icon={faDownload} /></Button>
        </div>
      </div>

      {/* Summary cards (grid 2x2) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold text-foreground">{summary.count}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">A pagar</p>
          <p className="text-xl font-bold text-expense">R$ {summary.totalUnpaid.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Pago</p>
          <p className="text-xl font-bold text-income">R$ {summary.totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Vencidas</p>
          <p className="text-xl font-bold text-warning">R$ {summary.totalOverdue.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters (collapsible) */}
      {showFilters && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="">Todas categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={caixaId}
            onChange={e => setCaixaId(e.target.value)}
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="">Todas contas</option>
            {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={paidFilter}
            onChange={e => setPaidFilter(e.target.value as any)}
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="unpaid">Não pagos</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="due_asc">Vencimento (crescente)</option>
            <option value="due_desc">Vencimento (decrescente)</option>
            <option value="amount_asc">Valor (crescente)</option>
            <option value="amount_desc">Valor (decrescente)</option>
          </select>
          <Input
            placeholder="Buscar descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={onFilter} size="sm">Filtrar</Button>
            <Button variant="secondary" onClick={onClearFilters} size="sm">Limpar</Button>
          </div>
        </div>
      )}

      {/* Cards list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-10">Carregando contas...</div>
      ) : bills.length === 0 ? (
        <div className="text-center text-muted-foreground/90 py-10">Nenhuma conta para este período.</div>
      ) : (
        <div className="space-y-3">
          {bills.map(bill => {
            const isOverdue = !bill.paid && new Date(bill.due_date) < new Date()
            return (
              <div key={bill.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{bill.description}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{bill.categories?.name || '-'}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{bill.caixas?.name || '-'}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{bill.due_date}</span>
                      {isOverdue && (
                        <FontAwesomeIcon icon={faExclamationCircle} className="text-warning text-xs" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">R$ {bill.amount.toFixed(2)}</p>
                    {canWrite ? (
                      <button
                        onClick={() => onTogglePaid(bill.id, !bill.paid)}
                        className="text-2xl mt-1"
                      >
                        {bill.paid ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="text-income" />
                        ) : (
                          <FontAwesomeIcon icon={faCircle} className="text-muted-foreground/90" />
                        )}
                      </button>
                    ) : (
                      <span className="text-2xl mt-1 block">
                        {bill.paid ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="text-income" />
                        ) : (
                          <FontAwesomeIcon icon={faCircle} className="text-muted-foreground/90" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex justify-end gap-2 mt-2 border-t border-border pt-2">
                    <button onClick={() => onEdit(bill)} className="text-info text-sm">
                      <FontAwesomeIcon icon={faEdit} className="mr-1" /> Editar
                    </button>
                    <button onClick={() => onDelete(bill.id)} className="text-expense text-sm">
                      <FontAwesomeIcon icon={faTrash} className="mr-1" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}