'use client'

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'

interface PasswordStrengthBarProps {
    password: string
    showRequirements?: boolean
}

const requirements = [
    { label: 'Mínimo 6 caracteres', test: (p: string) => p.length >= 6 },
    { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export function PasswordStrengthBar({ password, showRequirements = true }: PasswordStrengthBarProps) {
    const strength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: 'transparent' }
        const passed = requirements.filter(r => r.test(password)).length
        if (passed <= 1) return { score: 1, label: 'Débil', color: '#ef4444' }
        if (passed === 2) return { score: 2, label: 'Regular', color: '#f59e0b' }
        if (passed === 3) return { score: 3, label: 'Buena', color: '#eab308' }
        return { score: 4, label: 'Fuerte', color: '#22c55e' }
    }, [password])

    if (!password) return null

    return (
        <div className="space-y-2.5 mt-2">
            {/* Strength bar */}
            <div className="flex items-center gap-3">
                <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-500"
                            style={{
                                background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                            }}
                        />
                    ))}
                </div>
                <span
                    className="text-xs font-medium min-w-[50px] text-right transition-colors duration-300"
                    style={{ color: strength.color }}
                >
                    {strength.label}
                </span>
            </div>

            {/* Requirements checklist */}
            {showRequirements && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {requirements.map((req) => {
                        const passed = req.test(password)
                        return (
                            <div
                                key={req.label}
                                className="flex items-center gap-1.5 transition-all duration-300"
                                style={{ opacity: passed ? 1 : 0.5 }}
                            >
                                {passed ? (
                                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#22c55e' }} />
                                ) : (
                                    <X className="w-3 h-3 flex-shrink-0" style={{ color: '#666' }} />
                                )}
                                <span className="text-[11px]" style={{ color: passed ? '#c8c8c8' : '#666' }}>
                                    {req.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
