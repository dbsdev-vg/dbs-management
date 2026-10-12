'use client'

import { BillsProps } from '@/app/(protected)/bills/page'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faDownload, faPlus,
  faCheckCircle, faCircle, faTrash, faEdit, faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons'

export function BillsDesktop({
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onPrevMonth}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </Button>
            <span className="text-foreground font-medium min-w-[120px] text-center capitalize">{monthLabel}</span>
            <Button size="sm" variant="secondary" onClick={onNextMonth}>
              <FontAwesomeIcon icon={faChevronRight} />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button onClick={onAdd}><FontAwesomeIcon icon={faPlus} className="mr-1" /> Nova conta</Button>
          )}
          <Button variant="secondary" onClick={onExport}><FontAwesomeIcon icon={faDownload} className="mr-1" /> CSV</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{summary.count}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">A pagar</p>
          <p className="text-2xl font-bold text-expense">R$ {summary.totalUnpaid.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Pago</p>
          <p className="text-2xl font-bold text-income">R$ {summary.totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Vencidas</p>
          <p className="text-2xl font-bold text-warning">R$ {summary.totalOverdue.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-5 gap-3">
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="">Todas categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={caixaId}
            onChange={e => setCaixaId(e.target.value)}
            className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="">Todas contas</option>
            {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={paidFilter}
            onChange={e => setPaidFilter(e.target.value as any)}
            className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="unpaid">Não pagos</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="bg-muted border border-input rounded-lg px-3 py-2 text-foreground"
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
            className="col-span-1"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onFilter}>Filtrar</Button>
          <Button variant="secondary" onClick={onClearFilters}>Limpar</Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-muted-foreground py-10">Carregando contas...</div>
      ) : bills.length === 0 ? (
        <div className="text-center text-muted-foreground/90 py-10">Nenhuma conta para este período.</div>
      ) : (
        <div className="overflow-x-auto bg-background rounded-xl border border-border">
          <table className="w-full min-w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-muted-foreground text-sm">
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status</th>
                {canWrite && <th className="px-4 py-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => {
                const isOverdue = !bill.paid && new Date(bill.due_date) < new Date()
                return (
                  <tr key={bill.id} className="border-b border-border/50 hover:bg-muted/30 transition">
                    <td className="px-4 py-3 text-foreground">{bill.description}</td>
                    <td className="px-4 py-3 text-foreground/80">{bill.categories?.name || '-'}</td>
                    <td className="px-4 py-3 text-foreground/80">{bill.caixas?.name || '-'}</td>
                    <td className="px-4 py-3 text-foreground/80">
                      {bill.due_date}
                      {isOverdue && (
                        <FontAwesomeIcon icon={faExclamationCircle} className="ml-2 text-warning" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      R$ {bill.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canWrite ? (
                        <button
                          onClick={() => onTogglePaid(bill.id, !bill.paid)}
                          className="text-2xl"
                        >
                          {bill.paid ? (
                            <FontAwesomeIcon icon={faCheckCircle} className="text-income" />
                          ) : (
                            <FontAwesomeIcon icon={faCircle} className="text-muted-foreground/90" />
                          )}
                        </button>
                      ) : (
                        <span className="text-2xl">
                          {bill.paid ? (
                            <FontAwesomeIcon icon={faCheckCircle} className="text-income" />
                          ) : (
                            <FontAwesomeIcon icon={faCircle} className="text-muted-foreground/90" />
                          )}
                        </span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-center space-x-2">
                        <button onClick={() => onEdit(bill)} className="text-info hover:text-info/80">
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button onClick={() => onDelete(bill.id)} className="text-expense hover:text-expense/80">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}