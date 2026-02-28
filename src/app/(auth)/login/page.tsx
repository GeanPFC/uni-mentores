'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ArrowRight, Mail, Lock, Sparkles, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import {
    isUniEmail,
    mapAuthError,
    checkLoginRateLimit,
    recordFailedLogin,
    clearLoginAttempts,
} from '@/lib/auth-utils'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [lockoutSeconds, setLockoutSeconds] = useState(0)

    // Lockout countdown timer
    useEffect(() => {
        if (lockoutSeconds <= 0) return
        const timer = setInterval(() => {
            setLockoutSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setError('')
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [lockoutSeconds])

    useEffect(() => {
        setMounted(true)
        // Check existing lockout on mount
        const { blocked, remainingSeconds } = checkLoginRateLimit()
        if (blocked) {
            setLockoutSeconds(remainingSeconds)
            setError(`Demasiados intentos fallidos. Espera ${remainingSeconds}s.`)
        }
        // Handle OAuth callback errors with specific messages
        const params = new URLSearchParams(window.location.search)
        const callbackError = params.get('error')
        if (callbackError === 'domain_not_allowed') {
            setError('Solo se permiten cuentas de Google con dominio @uni.pe o @uni.edu.pe')
        } else if (callbackError === 'token_expired') {
            setError('El enlace ha expirado. Solicita uno nuevo.')
        } else if (callbackError === 'email_not_confirmed') {
            setError('Confirma tu correo antes de iniciar sesión.')
        } else if (callbackError === 'auth_callback_error') {
            setError('Error al iniciar sesión con Google. Intenta de nuevo.')
        }
    }, [])

    const emailTouched = email.length > 5
    const emailValid = isUniEmail(email)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Client-side rate limit check (UX layer)
        const rateCheck = checkLoginRateLimit()
        if (rateCheck.blocked) {
            setLockoutSeconds(rateCheck.remainingSeconds)
            setError(`Demasiados intentos fallidos. Espera ${rateCheck.remainingSeconds}s.`)
            return
        }

        // Client-side domain validation (UX layer)
        if (!isUniEmail(email)) {
            setError('Solo se permiten correos @uni.pe o @uni.edu.pe')
            return
        }

        setLoading(true)

        try {
            // Step 1: Pre-validate via API route (server-side rate limiting + domain check)
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al iniciar sesión')
                const result = recordFailedLogin()
                if (result.blocked) {
                    setLockoutSeconds(result.remainingSeconds)
                    setError(`Demasiados intentos fallidos. Espera ${result.remainingSeconds}s.`)
                }
                setLoading(false)
                return
            }

            // Step 2: Sign in on the CLIENT so @supabase/ssr sets session cookies correctly
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password,
            })

            if (signInError) {
                setError(mapAuthError(signInError.message))
                const result = recordFailedLogin()
                if (result.blocked) {
                    setLockoutSeconds(result.remainingSeconds)
                    setError(`Demasiados intentos fallidos. Espera ${result.remainingSeconds}s.`)
                }
                setLoading(false)
                return
            }

            clearLoginAttempts()
            toast('¡Bienvenido de vuelta!', 'success')
            router.push('/explore')
            router.refresh()
        } catch {
            setError('Error de conexión. Intenta de nuevo.')
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        // Timeout: reset loading after 30s if OAuth popup doesn't complete
        const timeout = setTimeout(() => {
            setGoogleLoading(false)
        }, 30_000)

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/callback`,
                queryParams: {
                    hd: 'uni.pe',
                },
            },
        })
        if (error) {
            clearTimeout(timeout)
            setError(mapAuthError(error.message))
            setGoogleLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative" style={{ background: '#1a1a1a' }}>
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className={`absolute w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${mounted ? 'opacity-20' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle, #e8e2d3 0%, transparent 70%)',
                        top: '-10%',
                        right: '-10%',
                        animation: 'float 8s ease-in-out infinite'
                    }}
                />
                <div
                    className={`absolute w-80 h-80 rounded-full blur-3xl transition-all duration-1000 delay-300 ${mounted ? 'opacity-15' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle, #e8e2d3 0%, transparent 70%)',
                        bottom: '-5%',
                        left: '-5%',
                        animation: 'float 10s ease-in-out infinite reverse'
                    }}
                />
                <div
                    className={`absolute w-64 h-64 rounded-full blur-2xl transition-all duration-1000 delay-500 ${mounted ? 'opacity-10' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
                        top: '50%',
                        left: '20%',
                        animation: 'float 12s ease-in-out infinite'
                    }}
                />
                <div
                    className={`absolute inset-0 transition-opacity duration-1000 ${mounted ? 'opacity-5' : 'opacity-0'}`}
                    style={{
                        backgroundImage: 'linear-gradient(rgba(232,226,211,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(232,226,211,0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            {/* Main Card */}
            <div
                className={`w-full max-w-md rounded-[2.5rem] p-8 md:p-10 relative transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{
                    background: 'rgba(36, 36, 36, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Decorative Corner Elements */}
                <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none">
                    <div className="absolute top-6 left-6 w-8 h-[1px]" style={{ background: 'rgba(232,226,211,0.3)' }} />
                    <div className="absolute top-6 left-6 w-[1px] h-8" style={{ background: 'rgba(232,226,211,0.3)' }} />
                </div>
                <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none">
                    <div className="absolute bottom-6 right-6 w-8 h-[1px]" style={{ background: 'rgba(232,226,211,0.3)' }} />
                    <div className="absolute bottom-6 right-6 w-[1px] h-8" style={{ background: 'rgba(232,226,211,0.3)' }} />
                </div>

                {/* Header */}
                <div className={`text-center mb-8 transition-all duration-700 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 relative group"
                        style={{
                            background: 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                            boxShadow: '0 10px 30px -5px rgba(232,226,211,0.3)'
                        }}
                    >
                        <span className="font-bold text-3xl" style={{ color: '#1a1a1a' }}>U</span>
                        <Sparkles
                            className="absolute -top-1 -right-1 w-4 h-4 animate-pulse"
                            style={{ color: '#e8e2d3' }}
                        />
                    </div>
                    <h1 className="text-4xl font-serif italic" style={{ color: '#e8e2d3' }}>
                        Bienvenido
                    </h1>
                    <p className="mt-3 text-base" style={{ color: '#999999' }}>
                        Inicia sesión en UNI Mentores
                    </p>
                </div>

                {/* Google OAuth Button */}
                <div className={`mb-5 transition-all duration-500 delay-250 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                        className="w-full h-13 rounded-full font-medium flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                        style={{
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#e8e2d3',
                        }}
                        aria-label="Iniciar sesión con Google"
                    >
                        {googleLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continuar con Google
                    </button>
                </div>

                {/* Divider */}
                <div className={`flex items-center gap-4 mb-5 transition-all duration-500 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <span className="text-xs" style={{ color: '#666' }}>o con tu correo</span>
                    <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.1)' }} />
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5" aria-label="Formulario de inicio de sesión">
                    {error && (
                        <div
                            className="p-4 rounded-2xl text-center text-sm animate-shake flex items-center justify-center gap-2"
                            role="alert"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                            {lockoutSeconds > 0 && <ShieldAlert className="w-4 h-4 flex-shrink-0" />}
                            {error}
                        </div>
                    )}

                    {/* Email */}
                    <div className={`space-y-2 transition-all duration-500 delay-350 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                        <label htmlFor="login-email" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                            Correo electrónico
                        </label>
                        <div className="relative group">
                            <div
                                className={`absolute inset-0 rounded-xl transition-all duration-300 ${focusedField === 'email' ? 'opacity-100' : 'opacity-0'}`}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(232,226,211,0.1) 0%, transparent 100%)',
                                    transform: 'scale(1.02)'
                                }}
                            />
                            <Mail
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                style={{ color: focusedField === 'email' ? '#e8e2d3' : '#999999' }}
                            />
                            <Input
                                id="login-email"
                                type="email"
                                placeholder="tu@uni.pe"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                required
                                aria-describedby="email-hint"
                                className="h-14 pl-11 rounded-xl relative z-10 transition-all duration-300 focus:scale-[1.01]"
                                style={{
                                    background: 'rgba(26, 26, 26, 0.8)',
                                    border: emailTouched && !emailValid
                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                        : emailValid
                                            ? '1px solid rgba(34, 197, 94, 0.3)'
                                            : focusedField === 'email'
                                                ? '1px solid rgba(232,226,211,0.3)'
                                                : '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                        <p id="email-hint" className="text-[11px] pl-1 transition-all duration-300" style={{ color: emailTouched && !emailValid ? '#f87171' : '#666' }}>
                            Usa tu correo institucional @uni.pe
                        </p>
                    </div>

                    {/* Password */}
                    <div className={`space-y-2 transition-all duration-500 delay-400 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                        <label htmlFor="login-password" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                            Contraseña
                        </label>
                        <div className="relative group">
                            <div
                                className={`absolute inset-0 rounded-xl transition-all duration-300 ${focusedField === 'password' ? 'opacity-100' : 'opacity-0'}`}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(232,226,211,0.1) 0%, transparent 100%)',
                                    transform: 'scale(1.02)'
                                }}
                            />
                            <Lock
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                style={{ color: focusedField === 'password' ? '#e8e2d3' : '#999999' }}
                            />
                            <Input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                required
                                className="h-14 pl-11 pr-12 rounded-xl relative z-10 transition-all duration-300 focus:scale-[1.01]"
                                style={{
                                    background: 'rgba(26, 26, 26, 0.8)',
                                    border: focusedField === 'password' ? '1px solid rgba(232,226,211,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffffff'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-1 rounded-lg transition-colors hover:bg-white/5"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" style={{ color: '#999' }} />
                                ) : (
                                    <Eye className="w-4 h-4" style={{ color: '#999' }} />
                                )}
                            </button>
                        </div>
                        <div className="flex justify-end mt-1">
                            <Link
                                href="/forgot-password"
                                className="text-xs transition-colors hover:underline"
                                style={{ color: '#999999' }}
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    <div className={`pt-2 transition-all duration-500 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <Button
                            type="submit"
                            disabled={loading || lockoutSeconds > 0}
                            className="w-full h-14 rounded-full font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] group"
                            style={{
                                background: 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                color: '#1a1a1a',
                                boxShadow: '0 10px 30px -5px rgba(232,226,211,0.2)'
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Iniciando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Iniciar sesión
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            )}
                        </Button>
                    </div>
                </form>

                {/* Footer */}
                <div className={`mt-8 text-center transition-all duration-500 delay-600 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <p style={{ color: '#999999' }}>
                        ¿No tienes cuenta?{' '}
                        <Link
                            href="/register"
                            className="font-medium transition-all duration-300 hover:underline hover:text-white relative group"
                            style={{ color: '#e8e2d3' }}
                        >
                            Regístrate
                            <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-current transition-all duration-300 group-hover:w-full" />
                        </Link>
                    </p>
                </div>
            </div>

            {/* CSS Keyframes */}

        </div>
    )
}
