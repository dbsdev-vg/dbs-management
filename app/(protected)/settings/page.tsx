'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CaixasManager } from '@/components/settings/CaixasManager'
import { CategoriesManager } from '@/components/settings/CategoriesManager'
import { PaymentMethodsManager } from '@/components/settings/PaymentMethodsManager'
import { WorkspaceManager } from '@/components/settings/WorkspaceManager'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBuilding, faTags, faCreditCard, faCog, faDownload,
    faPalette, faStar, faTrash, faPencil, faSave, faTimes,
    faMoon, faSun,
} from '@fortawesome/free-solid-svg-icons'
import Papa from 'papaparse'

type Tab = 'caixas' | 'categorias' | 'metodos' | 'workspace' | 'exportar' | 'aparencia' | 'assinatura'

export default function SettingsPage() {
    const { currentWorkspace, refreshWorkspaces, plan, planLimits } = useWorkspace()
    const router = useRouter()
    const supabase = createClient()

    const [activeTab, setActiveTab] = useState<Tab>('caixas')
    const [isRenaming, setIsRenaming] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState(currentWorkspace?.name || '')
    const [renamingLoading, setRenamingLoading] = useState(false)
    const [deletingWorkspace, setDeletingWorkspace] = useState(false)

    const { theme, toggle: toggleTheme } = useTheme()
    const isDarkMode = theme === 'dark'

    // Export functions
    const exportTable = async (tableName: string, fileName: string) => {
        if (!currentWorkspace) return
        const { data } = await supabase
            .from(tableName)
            .select('*')
            .eq('workspace_id', currentWorkspace.id)
        if (!data) return
        const csv = Papa.unparse(data)
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileName}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const writeManagerTabs: Tab[] = ['caixas', 'categorias', 'metodos']
    const isViewer = currentWorkspace?.role === 'viewer'

    const allTabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'caixas', label: 'Contas', icon: faBuilding },
        { id: 'categorias', label: 'Categorias', icon: faTags },
        { id: 'metodos', label: 'Métodos de pagamento', icon: faCreditCard },
        { id: 'workspace', label: 'Espaço', icon: faCog },
        { id: 'exportar', label: 'Exportar', icon: faDownload },
        { id: 'aparencia', label: 'Aparência', icon: faPalette },
        { id: 'assinatura', label: 'Assinatura', icon: faStar },
    ]

    // Viewers can't manage writes — hide those tabs and fall back to a read-only tab
    const tabs = isViewer ? allTabs.filter(t => !writeManagerTabs.includes(t.id)) : allTabs
    const effectiveTab: Tab = isViewer && writeManagerTabs.includes(activeTab) ? 'workspace' : activeTab

    if (!currentWorkspace) return null

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

            {/* Tabs */}
            <div className="border-b border-border overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition ${effectiveTab === tab.id
                                    ? 'bg-muted text-primary border-b-2 border-expense'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} className="text-sm" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="bg-card/50 rounded-xl border border-border p-6">
                {/* Caixas */}
                {effectiveTab === 'caixas' && <CaixasManager />}

                {/* Categorias */}
                {effectiveTab === 'categorias' && <CategoriesManager />}

                {/* Métodos de pagamento */}
                {effectiveTab === 'metodos' && <PaymentMethodsManager />}

                {/* Workspace settings */}

                {effectiveTab === 'workspace' && <WorkspaceManager />}

                {/* Export data */}
                {effectiveTab === 'exportar' && (
                    <div className="space-y-4">
                        <p className="text-muted-foreground">Exporte seus dados em formato CSV (compatível com Excel, Google Sheets).</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button onClick={() => exportTable('transactions', `transacoes_${currentWorkspace.name}`)} fullWidth>
                                Exportar transações
                            </Button>
                            <Button onClick={() => exportTable('bills', `contas_${currentWorkspace.name}`)} fullWidth>
                                Exportar contas a pagar
                            </Button>
                            <Button onClick={() => exportTable('caixas', `caixas_${currentWorkspace.name}`)} fullWidth>
                                Exportar caixas
                            </Button>
                            <Button onClick={() => exportTable('categories', `categorias_${currentWorkspace.name}`)} fullWidth>
                                Exportar categorias
                            </Button>
                            <Button onClick={() => exportTable('payment_methods', `metodos_pagamento_${currentWorkspace.name}`)} fullWidth>
                                Exportar métodos de pagamento
                            </Button>
                        </div>
                    </div>
                )}

                {/* Appearance */}
                {effectiveTab === 'aparencia' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-foreground font-medium">Tema escuro</h2>
                                <p className="text-sm text-muted-foreground">Alternar entre modo escuro e claro.</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="w-12 h-6 rounded-full bg-accent flex items-center transition-colors relative"
                            >
                                <div className={`w-5 h-5 rounded-full bg-foreground absolute transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                <FontAwesomeIcon icon={isDarkMode ? faMoon : faSun} className={`absolute text-xs ${isDarkMode ? 'left-1.5 text-foreground/70' : 'right-1.5 text-warning'}`} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Subscription */}
                {effectiveTab === 'assinatura' && (
                    <div className="space-y-4">
                        <div className="bg-muted rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">Plano atual</p>
                            <p className="text-2xl font-bold text-foreground capitalize">{plan || 'personal'}</p>
                            {planLimits && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Limites: {planLimits.maxPersonal} espaço(s) pessoal, {planLimits.maxBusiness} espaço(s) negócios
                                </p>
                            )}
                        </div>
                        <Button variant="primary" fullWidth>
                            Gerenciar assinatura
                        </Button>
                        <p className="text-xs text-muted-foreground/90 text-center">Em breve: upgrade de plano, histórico de pagamentos, fatura.</p>
                    </div>
                )}
            </div>
        </div>
    )
}