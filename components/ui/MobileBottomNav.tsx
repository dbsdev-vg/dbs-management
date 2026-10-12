'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisH, faXmark, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { NavLink } from '@/types'

export function MobileBottomNav({ links, visibleCount = 4, onAdd, fabOpen = false, canWrite = true }: { links: NavLink[]; visibleCount?: number; onAdd: () => void; fabOpen?: boolean; canWrite?: boolean }) {
    const pathname = usePathname()
    const [showMoreModal, setShowMoreModal] = useState(false)

    const visibleLinks = links.slice(0, visibleCount)
    const hiddenLinks = links.slice(visibleCount)

    // Split visible links around the center FAB
    const leftLinks = visibleLinks.slice(0, Math.floor(visibleCount / 2))
    const rightLinks = visibleLinks.slice(Math.floor(visibleCount / 2))

    const NavItem = ({ link }: { link: NavLink }) => {
        const isActive = pathname === link.href
        return (
            <Link
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition ${isActive ? 'text-primary' : 'text-muted-foreground/90 hover:text-foreground/80'
                    }`}
            >
                <FontAwesomeIcon icon={link.icon} className="text-xl" />
                <span className="text-[11px] font-medium">{link.label}</span>
            </Link>
        )
    }

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center py-2 px-4 z-20 pb-safe">
                {/* Left links */}
                {leftLinks.map(link => <NavItem key={link.href} link={link} />)}

                {/* Center FAB — static spacer for viewers */}
                {canWrite ? (
                    <button
                        onClick={onAdd}
                        className="relative -top-5 flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary/90 active:bg-primary/80 rounded-full shadow-lg shadow-red-900/50 transition-all active:scale-95"
                        aria-label="Nova transação"
                    >
                        <FontAwesomeIcon
                            icon={fabOpen ? faXmark : faPlus}
                            className={`text-white text-xl transition-transform duration-200 ${fabOpen ? 'rotate-90' : ''}`}
                        />
                    </button>
                ) : (
                    <div className="relative -top-5 w-14 h-14 flex-shrink-0" aria-hidden="true" />
                )}

                {/* Right links */}
                {rightLinks.map(link => <NavItem key={link.href} link={link} />)}

                {/* More */}
                {hiddenLinks.length > 0 && (
                    <button
                        onClick={() => setShowMoreModal(true)}
                        className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition text-muted-foreground/90 hover:text-foreground/80"
                    >
                        <FontAwesomeIcon icon={faEllipsisH} className="text-xl" />
                        <span className="text-[11px] font-medium">Mais</span>
                    </button>
                )}
            </div>

            {/* More modal */}
            {showMoreModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
                    onClick={() => setShowMoreModal(false)}
                >
                    <div
                        className="bg-card rounded-t-2xl w-full max-w-md p-4 pb-8"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-foreground font-medium">Mais opções</h3>
                            <button onClick={() => setShowMoreModal(false)} className="text-muted-foreground">
                                <FontAwesomeIcon icon={faXmark} className="text-xl" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {hiddenLinks.map(link => {
                                const isActive = pathname === link.href
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setShowMoreModal(false)}
                                        className={`flex flex-col items-center gap-1 py-2 rounded-lg transition ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={link.icon} className="text-xl" />
                                        <span className="text-[10px] font-medium">{link.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}