'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { AddTransactionModal } from '@/components/ui/AddTransactionModal'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRightArrowLeft, faPlus, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'

export function Navbar({ userEmail, onTransfer, canWrite = true }: { userEmail?: string; onTransfer?: () => void; canWrite?: boolean }) {
    const router = useRouter()
    const supabase = createClient()
    const { currentWorkspace } = useWorkspace()
    const [showAddModal, setShowAddModal] = useState(false)
    const pathname = usePathname()

    const refreshData = () => window.location.reload()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (pathname === '/select-workspace') return null
    return (
        <>
            <div className="bg-card border-b border-border px-4 py-2 fixed top-0 left-0 right-0 z-20">
                <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link href="/" className="flex items-center flex-shrink-0">
                            <Logo size="sm" />
                        </Link>
                        {currentWorkspace && (
                            <Link
                                href="/select-workspace"
                                className="flex items-center gap-1 text-foreground/80 text-sm border border-input rounded-md px-2 py-1 bg-muted hover:bg-accent transition-colors max-w-[100px] sm:max-w-[200px]"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-xs flex-shrink-0" />
                                <span className="truncate">{currentWorkspace.name}</span>
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {canWrite && (
                            <button
                                onClick={onTransfer}
                                className="flex items-center gap-1.5 border border-input text-foreground/80 text-sm rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                            >
                                <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-xs" />
                                <span className="hidden sm:inline">Transferir</span>
                            </button>
                        )}
                        {canWrite && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-md px-2 py-1 transition-colors"
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                <span className="hidden sm:inline">Transação</span>
                            </button>
                        )}
                        <ThemeToggle />
                        <span className="text-sm text-muted-foreground hidden sm:inline">{userEmail}</span>
                        <Button variant="secondary" size="sm" onClick={handleLogout} className="px-2 py-1 text-sm">
                            <FontAwesomeIcon icon={faRightFromBracket} className="sm:mr-2" />
                            <span className="hidden sm:inline">Sair</span>
                        </Button>
                    </div>
                </div>
            </div>

            {showAddModal && currentWorkspace && (
                <AddTransactionModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    workspaceId={currentWorkspace.id}
                    onSuccess={refreshData}
                />
            )}
        </>
    )
}