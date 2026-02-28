'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ModalConfig {
    title: string
    message?: string
    type: 'confirm' | 'prompt' | 'form'
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    inputPlaceholder?: string
    inputLabel?: string
    fields?: { key: string; label: string; placeholder?: string; type?: string; required?: boolean }[]
    onConfirm?: (value?: string | Record<string, string>) => void
    onCancel?: () => void
}

interface ModalContextType {
    showConfirm: (title: string, message: string, onConfirm: () => void, destructive?: boolean) => void
    showPrompt: (title: string, inputLabel: string, placeholder: string, onConfirm: (value: string) => void) => void
    showForm: (title: string, fields: ModalConfig['fields'], onConfirm: (values: Record<string, string>) => void) => void
    closeModal: () => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export function useModal() {
    const ctx = useContext(ModalContext)
    if (!ctx) throw new Error('useModal must be used within ModalProvider')
    return ctx
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalConfig | null>(null)
    const [inputValue, setInputValue] = useState('')
    const [formValues, setFormValues] = useState<Record<string, string>>({})

    const closeModal = useCallback(() => {
        setModal(null)
        setInputValue('')
        setFormValues({})
    }, [])

    const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, destructive = false) => {
        setModal({ title, message, type: 'confirm', onConfirm, destructive })
    }, [])

    const showPrompt = useCallback((title: string, inputLabel: string, placeholder: string, onConfirm: (value: string) => void) => {
        setInputValue('')
        setModal({ title, type: 'prompt', inputLabel, inputPlaceholder: placeholder, onConfirm: (v) => onConfirm(v as string) })
    }, [])

    const showForm = useCallback((title: string, fields: ModalConfig['fields'], onConfirm: (values: Record<string, string>) => void) => {
        setFormValues({})
        setModal({ title, type: 'form', fields, onConfirm: (v) => onConfirm(v as Record<string, string>) })
    }, [])

    const handleConfirm = () => {
        if (modal?.type === 'confirm') {
            modal.onConfirm?.()
        } else if (modal?.type === 'prompt') {
            if (inputValue.trim()) {
                modal.onConfirm?.(inputValue.trim())
            }
            return
        } else if (modal?.type === 'form') {
            modal.onConfirm?.(formValues)
        }
        closeModal()
    }

    const handlePromptConfirm = () => {
        if (inputValue.trim()) {
            modal?.onConfirm?.(inputValue.trim())
            closeModal()
        }
    }

    return (
        <ModalContext.Provider value={{ showConfirm, showPrompt, showForm, closeModal }}>
            {children}

            {modal && (
                <div
                    className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
                    style={{ animation: 'modal-backdrop 0.2s ease' }}
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0"
                        onClick={() => { modal.onCancel?.(); closeModal() }}
                        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
                    />

                    {/* Modal card */}
                    <div
                        className="relative w-full max-w-md rounded-[2rem] p-7 space-y-5"
                        style={{
                            background: 'rgba(36, 36, 36, 0.98)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7)',
                            animation: 'modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        <h2 className="text-xl font-serif italic" style={{ color: '#e8e2d3' }}>
                            {modal.title}
                        </h2>

                        {modal.message && (
                            <p className="text-sm leading-relaxed" style={{ color: '#c8c8c8' }}>
                                {modal.message}
                            </p>
                        )}

                        {/* Prompt input */}
                        {modal.type === 'prompt' && (
                            <div className="space-y-2">
                                {modal.inputLabel && (
                                    <label className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                        {modal.inputLabel}
                                    </label>
                                )}
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={modal.inputPlaceholder}
                                    rows={3}
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-xl resize-none text-sm"
                                    style={{
                                        background: 'rgba(26, 26, 26, 0.8)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: '#ffffff',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        )}

                        {/* Form fields */}
                        {modal.type === 'form' && modal.fields && (
                            <div className="space-y-3">
                                {modal.fields.map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <label className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                            {field.label}
                                        </label>
                                        <input
                                            type={field.type || 'text'}
                                            value={formValues[field.key] || ''}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder}
                                            className="w-full h-12 px-4 rounded-xl text-sm"
                                            style={{
                                                background: 'rgba(26, 26, 26, 0.8)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                color: '#ffffff',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => { modal.onCancel?.(); closeModal() }}
                                className="flex-1 h-12 rounded-full text-sm font-medium transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#c8c8c8',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                {modal.cancelLabel || 'Cancelar'}
                            </button>
                            <button
                                onClick={modal.type === 'prompt' ? handlePromptConfirm : handleConfirm}
                                className="flex-[1.5] h-12 rounded-full text-sm font-medium transition-all hover:scale-[1.02]"
                                style={{
                                    background: modal.destructive
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                    color: modal.destructive ? '#f87171' : '#1a1a1a',
                                    border: modal.destructive ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
                                }}
                            >
                                {modal.confirmLabel || (modal.destructive ? 'Eliminar' : 'Aceptar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes modal-backdrop {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes modal-in {
                    0% { transform: scale(0.92) translateY(10px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>
        </ModalContext.Provider>
    )
}
