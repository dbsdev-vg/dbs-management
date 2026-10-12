'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faArrowRight, faArrowRightArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { Navbar } from '@/components/ui/Navbar'
import { DesktopSidebar } from '@/components/ui/DesktopSidebar'
import { MobileBottomNav } from '@/components/ui/MobileBottomNav'
import { AddTransactionModal } from '@/components/ui/AddTransactionModal'
import { TransferModal } from '@/components/ui/TransferModal'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { NavLink } from '@/types'
import {
  faHome, faList, faFileInvoice, faGear, faUser,
  faCalculator, faUsers, faChartLine, faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons'

export function LayoutClient({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspace()
  const isViewer = currentWorkspace?.role === 'viewer'

  const [showAddModal, setShowAddModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)

  const baseLinks: NavLink[] = [
    { href: '/', label: 'Dashboard', icon: faHome },
    { href: '/transactions', label: 'Transações', icon: faList },
    { href: '/settings', label: 'Configurações', icon: faGear },
    { href: '/profile', label: 'Perfil', icon: faUser },
    { href: '/bills', label: 'Contas', icon: faFileInvoice },
  ]

  const businessOnlyLinks: NavLink[] = [
    { href: '/taxes', label: 'Impostos', icon: faCalculator },
    { href: '/employees', label: 'Funcionários', icon: faUsers },
    { href: '/reports', label: 'Relatórios', icon: faChartLine },
    { href: '/payroll', label: 'Folha', icon: faMoneyBillWave },
  ]

  const navLinks = [
    ...baseLinks,
    ...(currentWorkspace?.type === 'business' ? businessOnlyLinks : []),
  ]

  const openAdd = () => { setFabOpen(false); setShowAddModal(true) }
  const openTransfer = () => { setFabOpen(false); setShowTransferModal(true) }
  const handleReload = () => window.location.reload()

  if (pathname === '/select-workspace') {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Top navbar — desktop gets transfer button injected here             */}
      {/* ------------------------------------------------------------------ */}
      <Navbar
        userEmail={userEmail}
        onTransfer={openTransfer}
        canWrite={!isViewer}
      />

      {/* Desktop */}
      <div className="hidden md:flex flex-1 pt-16">
        <div className="w-64 flex-shrink-0">
          <DesktopSidebar links={navLinks} />
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-1 pt-[calc(4rem+env(safe-area-inset-top))]">
        <main className="flex-1 min-w-0 w-full overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile bottom nav + FAB speed dial                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="md:hidden">
        {/* Speed dial backdrop */}
        {!isViewer && fabOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setFabOpen(false)}
          />
        )}

        {/* Speed dial actions — sit above the FAB */}
        {!isViewer && fabOpen && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
            <button
              onClick={openTransfer}
              className="flex items-center gap-3 bg-muted border border-input text-foreground pl-4 pr-5 py-3 rounded-full shadow-xl text-sm font-medium whitespace-nowrap"
            >
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-xs" />
              </span>
              Transferência
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-3 bg-muted border border-input text-foreground pl-4 pr-5 py-3 rounded-full shadow-xl text-sm font-medium whitespace-nowrap"
            >
              <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faArrowRight} className="text-xs rotate-[-45deg]" />
              </span>
              Nova transação
            </button>
          </div>
        )}

        <MobileBottomNav
          links={navLinks}
          visibleCount={4}
          onAdd={() => setFabOpen(f => !f)}
          fabOpen={fabOpen}
          canWrite={!isViewer}
        />
      </div>

      {/* Modals */}
      {showAddModal && currentWorkspace && (
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          workspaceId={currentWorkspace.id}
          onSuccess={handleReload}
        />
      )}
      {showTransferModal && currentWorkspace && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          workspaceId={currentWorkspace.id}
          onSuccess={handleReload}
        />
      )}
    </div>
  )
}