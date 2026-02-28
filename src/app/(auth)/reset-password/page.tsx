'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PasswordStrengthBar } from '@/components/ui/password-strength'
import { mapAuthError, isPasswordAcceptable } from '@/lib/auth-utils'

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [sessionValid, setSessionValid] = useState<boolean | null>(null)

    useEffect(() => {
        setMounted(true)

        // P3: Verify there's an active session (from the recovery token)
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setSessionValid(false)
            } else {
                setSessionValid(true)
            }
        }
        checkSession()
    }, [])

    const passwordsMatch = password && confirmPassword && password === confirmPassword
    const isPasswordStrong = isPasswordAcceptable(password)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        // P6: Aligned with PasswordStrengthBar
        if (!isPasswordAcceptable(password)) {
            setError('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número')
            return
        }

        setLoading(true)

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        })

        if (updateError) {
            // P11: Map to Spanish
            setError(mapAuthError(updateError.message))
            setLoading(false)
            return
        }

        setSuccess(true)
        toast('¡Contraseña actualizada correctamente!', 'success')
        setTimeout(() => {
            router.push('/explore')
            router.refresh()
        }, 2000)
    }

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
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none">
                    <div className="absolute top-6 left-6 w-8 h-[1px]" style={{ background: 'rgba(232,226,211,0.3)' }} />
                    <div className="absolute top-6 left-6 w-[1px] h-8" style={{ background: 'rgba(232,226,211,0.3)' }} />
                </div>
                <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none">
                    <div className="absolute bottom-6 right-6 w-8 h-[1px]" style={{ background: 'rgba(232,226,211,0.3)' }} />
                    <div className="absolute bottom-6 right-6 w-[1px] h-8" style={{ background: 'rgba(232,226,211,0.3)' }} />
                </div>

                {/* P3: No session → show expired message */}
                {sessionValid === false ? (
                    <div className="text-center py-6 space-y-6">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                        >
                            <AlertTriangle className="w-7 h-7" style={{ color: '#f87171' }} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif italic" style={{ color: '#e8e2d3' }}>
                                Enlace expirado
                            </h2>
                            <p className="text-sm" style={{ color: '#999' }}>
                                Este enlace de recuperación ha expirado o es inválido.
                                Solicita uno nuevo.
                            </p>
                        </div>
                        <Link
                            href="/forgot-password"
                            className="block w-full h-13 rounded-full font-medium flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                color: '#1a1a1a',
                            }}
                        >
                            Solicitar nuevo enlace
                        </Link>
                    </div>
                ) : sessionValid === null ? (
                    /* Loading session check */
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#e8e2d3', borderTopColor: 'transparent' }} />
                    </div>
                ) : (
                    /* Valid session → show form */
                    <>
                        <div className="text-center mb-8">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{
                                    background: success
                                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                        : 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                    boxShadow: '0 10px 30px -5px rgba(232,226,211,0.3)'
                                }}
                            >
                                {success ? (
                                    <CheckCircle2 className="w-8 h-8" style={{ color: '#fff' }} />
                                ) : (
                                    <KeyRound className="w-7 h-7" style={{ color: '#1a1a1a' }} />
                                )}
                            </div>
                            <h1 className="text-3xl font-serif italic" style={{ color: '#e8e2d3' }}>
                                {success ? '¡Listo!' : 'Nueva contraseña'}
                            </h1>
                            <p className="mt-3 text-sm" style={{ color: '#999999' }}>
                                {success
                                    ? 'Tu contraseña ha sido actualizada correctamente. Redirigiendo...'
                                    : 'Ingresa tu nueva contraseña para restablecer tu cuenta.'}
                            </p>
                        </div>

                        {!success && (
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

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label htmlFor="new-password" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                        Nueva contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                            style={{ color: focusedField === 'password' ? '#e8e2d3' : '#999999' }}
                                        />
                                        <Input
                                            id="new-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Ingresa tu nueva contraseña"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            className="h-13 pl-11 pr-12 rounded-xl transition-all duration-300 focus:scale-[1.01]"
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
                                    <PasswordStrengthBar password={password} />
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label htmlFor="confirm-password" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                        Confirmar contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                            style={{ color: focusedField === 'confirm' ? '#e8e2d3' : '#999999' }}
                                        />
                                        <Input
                                            id="confirm-password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Repite tu nueva contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onFocus={() => setFocusedField('confirm')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            className="h-13 pl-11 pr-12 rounded-xl transition-all duration-300 focus:scale-[1.01]"
                                            style={{
                                                background: 'rgba(26, 26, 26, 0.8)',
                                                border: passwordsMatch
                                                    ? '1px solid rgba(34, 197, 94, 0.3)'
                                                    : confirmPassword && !passwordsMatch
                                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                                        : focusedField === 'confirm'
                                                            ? '1px solid rgba(232,226,211,0.3)'
                                                            : '1px solid rgba(255,255,255,0.1)',
                                                color: '#ffffff'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-1 rounded-lg transition-colors hover:bg-white/5"
                                            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-4 h-4" style={{ color: '#999' }} />
                                            ) : (
                                                <Eye className="w-4 h-4" style={{ color: '#999' }} />
                                            )}
                                        </button>
                                        {passwordsMatch && (
                                            <CheckCircle2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: '#22c55e' }} />
                                        )}
                                    </div>
                                    {confirmPassword && !passwordsMatch && (
                                        <p className="text-[11px] pl-1" style={{ color: '#f87171' }}>
                                            Las contraseñas no coinciden
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || !passwordsMatch || !isPasswordStrong}
                                    className="w-full h-13 rounded-full font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                    style={{
                                        background: passwordsMatch && isPasswordStrong
                                            ? 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)'
                                            : 'rgba(255,255,255,0.1)',
                                        color: passwordsMatch && isPasswordStrong ? '#1a1a1a' : '#999999',
                                        boxShadow: passwordsMatch && isPasswordStrong ? '0 10px 30px -5px rgba(232,226,211,0.2)' : 'none'
                                    }}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Actualizando...
                                        </span>
                                    ) : (
                                        'Restablecer contraseña'
                                    )}
                                </Button>
                            </form>
                        )}

                        <div className="mt-8 text-center">
                            <Link
                                href="/login"
                                className="text-sm transition-colors hover:underline"
                                style={{ color: '#e8e2d3' }}
                            >
                                Volver al login
                            </Link>
                        </div>
                    </>
                )}
            </div>


        </div>
    )
}
