'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}

interface ToastContextType {
    toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now().toString()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3500)
    }, [])

    const dismiss = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    const icons: Record<string, string> = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    }

    const colors: Record<string, { bg: string; border: string; icon: string }> = {
        success: {
            bg: 'rgba(34, 197, 94, 0.12)',
            border: 'rgba(34, 197, 94, 0.25)',
            icon: '#22c55e'
        },
        error: {
            bg: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.25)',
            icon: '#f87171'
        },
        info: {
            bg: 'rgba(232, 226, 211, 0.12)',
            border: 'rgba(232, 226, 211, 0.2)',
            icon: '#e8e2d3'
        }
    }

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}

            {/* Toast container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
                {toasts.map((t, i) => (
                    <div
                        key={t.id}
                        className="pointer-events-auto rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl cursor-pointer"
                        onClick={() => dismiss(t.id)}
                        style={{
                            background: 'rgba(36, 36, 36, 0.95)',
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${colors[t.type].border}`,
                            animation: 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                            style={{ background: colors[t.type].bg, color: colors[t.type].icon }}
                        >
                            {icons[t.type]}
                        </div>
                        <p className="text-sm font-medium" style={{ color: '#e8e2d3' }}>
                            {t.message}
                        </p>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes toast-in {
                    0% { transform: translateX(100%) scale(0.9); opacity: 0; }
                    100% { transform: translateX(0) scale(1); opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    )
}
