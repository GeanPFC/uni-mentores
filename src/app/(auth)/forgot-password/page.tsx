'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { isUniEmail, getCooldownRemaining, setCooldown } from '@/lib/auth-utils'

export default function ForgotPasswordPage() {
    const { toast } = useToast()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [cooldown, setCooldownState] = useState(0)
    const [error, setError] = useState('')

    useEffect(() => { setMounted(true) }, [])

    // P7: Cooldown timer
    useEffect(() => {
        // Check existing cooldown on mount
        const remaining = getCooldownRemaining()
        if (remaining > 0) setCooldownState(remaining)
    }, [])

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldownState(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldown])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validate UNI domain (trim first for edge cases)
        if (!isUniEmail(email.trim())) {
            setError('Solo se permiten correos @uni.pe o @uni.edu.pe')
            return
        }

        // P7: Check cooldown
        const remaining = getCooldownRemaining()
        if (remaining > 0) {
            setError(`Espera ${remaining} segundos antes de solicitar otro enlace.`)
            setCooldownState(remaining)
            return
        }

        setLoading(true)

        try {
            // Call server-side API route (rate limiting + domain validation + reset)
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al enviar el correo')
            } else {
                setSent(true)
                // Set 60-second cooldown
                setCooldown(60)
                setCooldownState(60)
                toast('¡Revisa tu correo para restablecer tu contraseña!', 'success')
            }
        } catch {
            setError('Error de conexión. Intenta de nuevo.')
        }

        setLoading(false)
    }

    const emailValid = isUniEmail(email)
    const emailTouched = email.length > 5

    return (
        <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative" style={{ background: '#1a1a1a' }}>
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className={`absolute w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${mounted ? 'opacity-15' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle, #e8e2d3 0%, transparent 70%)',
                        top: '20%', right: '-5%',
                        animation: 'float 8s ease-in-out infinite'
                    }}
                />
            </div>

            <div
                className={`w-full max-w-md rounded-[2.5rem] p-8 md:p-10 relative transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{
                    background: 'rgba(36, 36, 36, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div className="text-center mb-8">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{
                            background: 'rgba(232, 226, 211, 0.1)',
                        }}
                    >
                        <Mail className="w-7 h-7" style={{ color: '#e8e2d3' }} />
                    </div>
                    <h1 className="text-3xl font-serif italic" style={{ color: '#e8e2d3' }}>
                        {sent ? '¡Correo enviado!' : 'Recuperar contraseña'}
                    </h1>
                    <p className="mt-3 text-sm" style={{ color: '#999999' }}>
                        {sent
                            ? 'Revisa tu bandeja de entrada y sigue las instrucciones.'
                            : 'Ingresa tu correo institucional y te enviaremos un link para restablecer tu contraseña.'
                        }
                    </p>
                </div>

                {!sent ? (
                    <form onSubmit={handleReset} className="space-y-5">
                        {error && (
                            <div
                                className="p-3 rounded-2xl text-center text-sm"
                                role="alert"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            >
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="forgot-email" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                Correo electrónico
                            </label>
                            <Input
                                id="forgot-email"
                                type="email"
                                placeholder="tu@uni.pe"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-14 rounded-xl"
                                style={{
                                    background: 'rgba(26, 26, 26, 0.8)',
                                    border: emailTouched && !emailValid
                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                        : emailValid
                                            ? '1px solid rgba(34, 197, 94, 0.3)'
                                            : '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffffff'
                                }}
                            />
                            <p className="text-[11px] pl-1" style={{ color: emailTouched && !emailValid ? '#f87171' : '#666' }}>
                                Usa tu correo institucional @uni.pe
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || cooldown > 0}
                            className="w-full h-14 rounded-full font-medium transition-all hover:scale-[1.02]"
                            style={{
                                background: cooldown > 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                color: cooldown > 0 ? '#999' : '#1a1a1a',
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Enviando...
                                </span>
                            ) : cooldown > 0 ? (
                                `Reenviar en ${cooldown}s`
                            ) : (
                                <span className="flex items-center gap-2">
                                    Enviar link
                                    <Send className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-center leading-relaxed" style={{ color: '#666' }}>
                            Si no recibes el correo en 5 minutos, verifica que usaste tu email UNI y revisa tu carpeta de spam.
                        </p>
                        {cooldown > 0 && (
                            <p className="text-xs text-center" style={{ color: '#999' }}>
                                Puedes reenviar en {cooldown}s
                            </p>
                        )}
                        {cooldown === 0 && (
                            <Button
                                type="button"
                                onClick={() => { setSent(false); setError('') }}
                                variant="ghost"
                                className="w-full h-12 rounded-full text-sm"
                                style={{ color: '#e8e2d3', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                Reenviar correo
                            </Button>
                        )}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 text-sm transition-colors hover:underline"
                        style={{ color: '#e8e2d3' }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al login
                    </Link>
                </div>
            </div>


        </div>
    )
}
