'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FACULTIES } from '@/lib/utils'
import { UNI_FACULTIES_DATA } from '@/lib/uni-courses'
import { ArrowRight, ArrowLeft, User, Mail, MailCheck, Lock, GraduationCap, Sparkles, CheckCircle2, Eye, EyeOff, BookOpen } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { PasswordStrengthBar } from '@/components/ui/password-strength'
import {
    isUniEmail,
    mapAuthError,
    sanitizeName,
    isNameValid as checkNameValid,
    isPasswordAcceptable,
} from '@/lib/auth-utils'

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        faculty: '',
        cycle: '',
    })
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [step, setStep] = useState(1)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward')
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [registrationComplete, setRegistrationComplete] = useState(false)
    const stepsRef = useRef<HTMLDivElement>(null)

    // Validation states
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    useEffect(() => {
        setMounted(true)
    }, [])

    // Field validations
    const isEmailValid = isUniEmail(formData.email)
    const isNameFieldValid = checkNameValid(formData.name)
    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword
    const isPasswordStrong = isPasswordAcceptable(formData.password)

    const handleFieldBlur = (field: string) => {
        setFocusedField(null)
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const animateStep = (newStep: number) => {
        setSlideDirection(newStep > step ? 'forward' : 'back')
        setIsTransitioning(true)
        setError('')
        setTimeout(() => {
            setStep(newStep)
            setIsTransitioning(false)
        }, 250)
    }

    const [resendLoading, setResendLoading] = useState(false)
    const [resendSent, setResendSent] = useState(false)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!acceptTerms) {
            setError('Debes aceptar los términos y condiciones')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        // Aligned with PasswordStrengthBar requirements
        if (!isPasswordAcceptable(formData.password)) {
            setError('La contraseña debe tener al menos 6 caracteres, una mayúscula y un número')
            return
        }

        // Sanitize inputs
        const cleanName = sanitizeName(formData.name)
        if (!checkNameValid(cleanName)) {
            setError('Ingresa tu nombre y apellido (mínimo 2 caracteres por palabra)')
            return
        }

        // Validate faculty against real data
        if (!UNI_FACULTIES_DATA[formData.faculty]) {
            setError('Selecciona una facultad válida')
            return
        }

        // Validate cycle (fix NaN edge case)
        if (formData.cycle) {
            const cycleNum = parseInt(formData.cycle)
            if (isNaN(cycleNum) || cycleNum < 1 || cycleNum > 10) {
                setError('Selecciona un ciclo válido (1-10)')
                return
            }
        }

        // Validate email domain
        if (!isUniEmail(formData.email)) {
            setError('Solo se permiten correos @uni.pe o @uni.edu.pe')
            return
        }

        setLoading(true)

        try {
            // Call server-side API route (rate limiting + validation server-side)
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                    name: cleanName,
                    faculty: formData.faculty,
                    cycle: formData.cycle || null,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al registrarse')
                setLoading(false)
                return
            }

            // Show success regardless (anti-enumeration)
            setRegistrationComplete(true)
            setLoading(false)
        } catch {
            setError('Error de conexión. Intenta de nuevo.')
            setLoading(false)
        }
    }

    const handleGoogleRegister = async () => {
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

    const canProceedStep1 = formData.name && formData.email && formData.faculty && isNameFieldValid && isEmailValid

    // Faculty data with colors
    const facultyEntries = Object.entries(UNI_FACULTIES_DATA)

    return (
        <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative" style={{ background: '#1a1a1a' }}>
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className={`absolute w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-1000 ${mounted ? 'opacity-15' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle, #e8e2d3 0%, transparent 70%)',
                        top: '-15%',
                        left: '-10%',
                        animation: 'float 10s ease-in-out infinite'
                    }}
                />
                <div
                    className={`absolute w-96 h-96 rounded-full blur-3xl transition-all duration-1000 delay-300 ${mounted ? 'opacity-20' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle, #e8e2d3 0%, transparent 70%)',
                        bottom: '-10%',
                        right: '-5%',
                        animation: 'float 8s ease-in-out infinite reverse'
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
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none">
                    <div className="absolute top-6 left-6 w-8 h-[1px]" style={{ background: 'rgba(232,226,211,0.3)' }} />
                    <div className="absolute top-6 left-6 w-[1px] h-8" style={{ background: 'rgba(232,226,211,0.3)' }} />
                </div>
                <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none">
                    <div className="absolute bottom-6 right-6 w-8 h-[1px]" style={{ background: 'rgba(232,226,211,0.3)' }} />
                    <div className="absolute bottom-6 right-6 w-[1px] h-8" style={{ background: 'rgba(232,226,211,0.3)' }} />
                </div>

                {registrationComplete ? (
                    /* ── Email Verification Screen ── */
                    <div className="text-center py-6 space-y-6 animate-in fade-in duration-500">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                            style={{
                                background: 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                boxShadow: '0 10px 30px -5px rgba(232,226,211,0.3)'
                            }}
                        >
                            <MailCheck className="w-10 h-10" style={{ color: '#1a1a1a' }} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif italic" style={{ color: '#e8e2d3' }}>
                                ¡Revisa tu correo!
                            </h2>
                            <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#999' }}>
                                Te enviamos un enlace de verificación a
                            </p>
                            <p className="text-sm font-semibold" style={{ color: '#e8e2d3' }}>
                                {formData.email}
                            </p>
                            <p className="text-xs leading-relaxed max-w-xs mx-auto pt-2" style={{ color: '#666' }}>
                                Confirma tu correo para completar el registro e iniciar sesión.
                            </p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Link
                                href="/login"
                                className="block w-full h-13 rounded-full font-medium flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                    color: '#1a1a1a',
                                    boxShadow: '0 10px 30px -5px rgba(232,226,211,0.2)'
                                }}
                            >
                                Ir a iniciar sesión
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <p className="text-xs" style={{ color: '#666' }}>
                                ¿No recibiste el correo? Revisa tu carpeta de spam
                            </p>
                            <button
                                type="button"
                                disabled={resendLoading || resendSent}
                                onClick={async () => {
                                    setResendLoading(true)
                                    const { error } = await supabase.auth.resend({
                                        type: 'signup',
                                        email: formData.email.toLowerCase().trim(),
                                    })
                                    setResendLoading(false)
                                    if (!error) setResendSent(true)
                                }}
                                className="text-xs underline transition-colors"
                                style={{ color: resendSent ? '#22c55e' : '#e8e2d3' }}
                            >
                                {resendLoading ? 'Enviando...' : resendSent ? '¡Correo reenviado!' : 'Reenviar correo de verificación'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Registration Form ── */
                    <>

                        {/* Progress */}
                        <div className={`flex justify-center gap-2 mb-6 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} role="navigation" aria-label="Progreso de registro">
                            {[1, 2].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1 rounded-full transition-all duration-500 ${step >= s ? 'w-10' : 'w-4'}`}
                                    style={{ background: step >= s ? '#e8e2d3' : 'rgba(255,255,255,0.1)' }}
                                    role="progressbar"
                                    aria-label={`Paso ${s} de 2`}
                                    aria-valuenow={step >= s ? 100 : 0}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            ))}
                        </div>

                        {/* Header */}
                        <div className={`text-center mb-6 transition-all duration-700 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 relative"
                                style={{
                                    background: 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)',
                                    boxShadow: '0 10px 30px -5px rgba(232,226,211,0.3)'
                                }}
                            >
                                <span className="font-bold text-3xl" style={{ color: '#1a1a1a' }}>U</span>
                                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 animate-pulse" style={{ color: '#e8e2d3' }} />
                            </div>
                            <h1 className="text-3xl font-serif italic" style={{ color: '#e8e2d3' }}>
                                {step === 1 ? 'Crear cuenta' : 'Seguridad'}
                            </h1>
                            <p className="mt-2 text-sm" style={{ color: '#999999' }}>
                                {step === 1 ? 'Únete a la comunidad UNI Mentores' : 'Configura tu contraseña'}
                            </p>
                        </div>

                        {/* Google OAuth (Step 1 only) */}
                        {step === 1 && (
                            <>
                                <div className={`mb-4 transition-all duration-500 delay-250 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                    <button
                                        type="button"
                                        onClick={handleGoogleRegister}
                                        disabled={googleLoading}
                                        className="w-full h-13 rounded-full font-medium flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                        style={{
                                            background: 'rgba(255,255,255,0.07)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            color: '#e8e2d3',
                                        }}
                                        aria-label="Registrarse con Google"
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
                                        Registrarse con Google
                                    </button>
                                </div>

                                <div className={`flex items-center gap-4 mb-4 transition-all duration-500 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.1)' }} />
                                    <span className="text-xs" style={{ color: '#666' }}>o con tu correo</span>
                                    <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.1)' }} />
                                </div>
                            </>
                        )}

                        {/* Form */}
                        <form onSubmit={handleRegister} className="overflow-hidden" aria-label="Formulario de registro">
                            {error && (
                                <div
                                    className="p-3 rounded-2xl text-center text-sm animate-shake mb-4"
                                    role="alert"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    {error}
                                </div>
                            )}

                            {/* Steps container with animation */}
                            <div ref={stepsRef} className="relative">
                                {/* Step 1: Basic Info */}
                                <div
                                    className="transition-all duration-300 ease-out"
                                    style={{
                                        display: step === 1 ? 'block' : 'none',
                                        opacity: isTransitioning ? 0 : 1,
                                        transform: isTransitioning
                                            ? slideDirection === 'forward' ? 'translateX(-30px)' : 'translateX(30px)'
                                            : 'translateX(0)',
                                    }}
                                >
                                    <div className="space-y-4">
                                        {/* Name */}
                                        <div className={`space-y-2 transition-all duration-500 delay-300 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                                            <label htmlFor="reg-name" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                                Nombre completo
                                            </label>
                                            <div className="relative">
                                                <User
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                                    style={{ color: focusedField === 'name' ? '#e8e2d3' : '#999999' }}
                                                />
                                                <Input
                                                    id="reg-name"
                                                    type="text"
                                                    placeholder="Nombre y apellido"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    onFocus={() => setFocusedField('name')}
                                                    onBlur={() => handleFieldBlur('name')}
                                                    required
                                                    aria-describedby="name-hint"
                                                    className="h-13 pl-11 rounded-xl transition-all duration-300 focus:scale-[1.01]"
                                                    style={{
                                                        background: 'rgba(26, 26, 26, 0.8)',
                                                        border: touched.name && !isNameFieldValid
                                                            ? '1px solid rgba(239, 68, 68, 0.4)'
                                                            : touched.name && isNameFieldValid
                                                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                                                : focusedField === 'name'
                                                                    ? '1px solid rgba(232,226,211,0.3)'
                                                                    : '1px solid rgba(255,255,255,0.1)',
                                                        color: '#ffffff'
                                                    }}
                                                />
                                            </div>
                                            {touched.name && !isNameFieldValid ? (
                                                <p id="name-hint" className="text-[11px] pl-1" style={{ color: '#f87171' }}>
                                                    Ingresa nombre y apellido (mínimo 2 caracteres c/u)
                                                </p>
                                            ) : (
                                                <p id="name-hint" className="text-[11px] pl-1" style={{ color: '#666' }}>
                                                    Nombre completo con al menos 2 palabras
                                                </p>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div className={`space-y-2 transition-all duration-500 delay-400 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                                            <label htmlFor="reg-email" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                                Correo institucional
                                            </label>
                                            <div className="relative">
                                                <Mail
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                                    style={{ color: focusedField === 'email' ? '#e8e2d3' : '#999999' }}
                                                />
                                                <Input
                                                    id="reg-email"
                                                    type="email"
                                                    placeholder="tu@uni.pe"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    onFocus={() => setFocusedField('email')}
                                                    onBlur={() => handleFieldBlur('email')}
                                                    required
                                                    aria-describedby="reg-email-hint"
                                                    className="h-13 pl-11 rounded-xl transition-all duration-300 focus:scale-[1.01]"
                                                    style={{
                                                        background: 'rgba(26, 26, 26, 0.8)',
                                                        border: touched.email && !isEmailValid
                                                            ? '1px solid rgba(239, 68, 68, 0.4)'
                                                            : isEmailValid
                                                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                                                : focusedField === 'email'
                                                                    ? '1px solid rgba(232,226,211,0.3)'
                                                                    : '1px solid rgba(255,255,255,0.1)',
                                                        color: '#ffffff'
                                                    }}
                                                />
                                                {isEmailValid && (
                                                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: '#22c55e' }} />
                                                )}
                                            </div>
                                            <p id="reg-email-hint" className="text-[11px] pl-1" style={{ color: touched.email && !isEmailValid ? '#f87171' : '#666' }}>
                                                Usa tu correo institucional @uni.pe
                                            </p>
                                        </div>

                                        {/* Faculty selector with colors */}
                                        <div className={`space-y-2 transition-all duration-500 delay-500 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                                            <label htmlFor="reg-faculty" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                                Facultad
                                            </label>
                                            <div className="relative">
                                                <GraduationCap
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                                    style={{ color: focusedField === 'faculty' ? '#e8e2d3' : '#999999' }}
                                                />
                                                {/* Color indicator */}
                                                {formData.faculty && UNI_FACULTIES_DATA[formData.faculty] && (
                                                    <div
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10"
                                                        style={{ background: UNI_FACULTIES_DATA[formData.faculty].color }}
                                                    />
                                                )}
                                                <select
                                                    id="reg-faculty"
                                                    value={formData.faculty}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, faculty: e.target.value }))}
                                                    onFocus={() => setFocusedField('faculty')}
                                                    onBlur={() => handleFieldBlur('faculty')}
                                                    required
                                                    className="w-full h-13 pl-11 pr-10 rounded-xl appearance-none cursor-pointer transition-all duration-300"
                                                    style={{
                                                        background: 'rgba(26, 26, 26, 0.8)',
                                                        border: focusedField === 'faculty' ? '1px solid rgba(232,226,211,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                                        color: formData.faculty ? '#ffffff' : '#999999'
                                                    }}
                                                >
                                                    <option value="" style={{ background: '#1a1a1a' }}>Selecciona tu facultad</option>
                                                    {facultyEntries.map(([code, info]) => (
                                                        <option key={code} value={code} style={{ background: '#1a1a1a' }}>
                                                            {code} — {info.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Cycle */}
                                        <div className={`space-y-2 transition-all duration-500 delay-[550ms] ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                                            <label htmlFor="reg-cycle" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                                Ciclo <span className="text-xs font-normal" style={{ color: '#666' }}>(opcional)</span>
                                            </label>
                                            <div className="relative">
                                                <BookOpen
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                                    style={{ color: focusedField === 'cycle' ? '#e8e2d3' : '#999999' }}
                                                />
                                                <select
                                                    id="reg-cycle"
                                                    value={formData.cycle}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, cycle: e.target.value }))}
                                                    onFocus={() => setFocusedField('cycle')}
                                                    onBlur={() => handleFieldBlur('cycle')}
                                                    className="w-full h-13 pl-11 pr-4 rounded-xl appearance-none cursor-pointer transition-all duration-300"
                                                    style={{
                                                        background: 'rgba(26, 26, 26, 0.8)',
                                                        border: focusedField === 'cycle' ? '1px solid rgba(232,226,211,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                                        color: formData.cycle ? '#ffffff' : '#999999'
                                                    }}
                                                >
                                                    <option value="" style={{ background: '#1a1a1a' }}>Selecciona tu ciclo</option>
                                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(c => (
                                                        <option key={c} value={String(c)} style={{ background: '#1a1a1a' }}>
                                                            {c}° Ciclo
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Continue Button */}
                                        <div className="pt-2">
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setTouched({ name: true, email: true, faculty: true })
                                                    if (canProceedStep1) {
                                                        animateStep(2)
                                                    }
                                                }}
                                                disabled={!canProceedStep1}
                                                className="w-full h-13 rounded-full font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] group"
                                                style={{
                                                    background: canProceedStep1 ? 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)' : 'rgba(255,255,255,0.1)',
                                                    color: canProceedStep1 ? '#1a1a1a' : '#999999',
                                                    boxShadow: canProceedStep1 ? '0 10px 30px -5px rgba(232,226,211,0.2)' : 'none'
                                                }}
                                            >
                                                Continuar
                                                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Password */}
                                <div
                                    className="transition-all duration-300 ease-out"
                                    style={{
                                        display: step === 2 ? 'block' : 'none',
                                        opacity: isTransitioning ? 0 : 1,
                                        transform: isTransitioning
                                            ? slideDirection === 'forward' ? 'translateX(30px)' : 'translateX(-30px)'
                                            : 'translateX(0)',
                                    }}
                                >
                                    <div className="space-y-4">
                                        {/* Password */}
                                        <div className="space-y-2">
                                            <label htmlFor="reg-password" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                                Contraseña
                                            </label>
                                            <div className="relative">
                                                <Lock
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                                    style={{ color: focusedField === 'password' ? '#e8e2d3' : '#999999' }}
                                                />
                                                <Input
                                                    id="reg-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Crea una contraseña segura"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                    onFocus={() => setFocusedField('password')}
                                                    onBlur={() => handleFieldBlur('password')}
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
                                            <PasswordStrengthBar password={formData.password} />
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="space-y-2">
                                            <label htmlFor="reg-confirm" className="text-sm font-medium block" style={{ color: '#c8c8c8' }}>
                                                Confirmar contraseña
                                            </label>
                                            <div className="relative">
                                                <Lock
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10"
                                                    style={{ color: focusedField === 'confirmPassword' ? '#e8e2d3' : '#999999' }}
                                                />
                                                <Input
                                                    id="reg-confirm"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Repite tu contraseña"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                    onFocus={() => setFocusedField('confirmPassword')}
                                                    onBlur={() => handleFieldBlur('confirmPassword')}
                                                    required
                                                    className="h-13 pl-11 pr-12 rounded-xl transition-all duration-300 focus:scale-[1.01]"
                                                    style={{
                                                        background: 'rgba(26, 26, 26, 0.8)',
                                                        border: passwordsMatch
                                                            ? '1px solid rgba(34, 197, 94, 0.3)'
                                                            : touched.confirmPassword && formData.confirmPassword && !passwordsMatch
                                                                ? '1px solid rgba(239, 68, 68, 0.4)'
                                                                : focusedField === 'confirmPassword'
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
                                                    <CheckCircle2
                                                        className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 z-10"
                                                        style={{ color: '#22c55e' }}
                                                    />
                                                )}
                                            </div>
                                            {touched.confirmPassword && formData.confirmPassword && !passwordsMatch && (
                                                <p className="text-[11px] pl-1" style={{ color: '#f87171' }}>
                                                    Las contraseñas no coinciden
                                                </p>
                                            )}
                                        </div>

                                        {/* Terms & Conditions */}
                                        <div className="flex items-start gap-3 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setAcceptTerms(!acceptTerms)}
                                                className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-all duration-200"
                                                style={{
                                                    background: acceptTerms ? '#e8e2d3' : 'transparent',
                                                    border: acceptTerms ? 'none' : '2px solid rgba(255,255,255,0.2)',
                                                }}
                                                role="checkbox"
                                                aria-checked={acceptTerms}
                                                aria-label="Aceptar términos y condiciones"
                                            >
                                                {acceptTerms && (
                                                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#1a1a1a' }} />
                                                )}
                                            </button>
                                            <p className="text-xs leading-relaxed" style={{ color: '#999' }}>
                                                Acepto los{' '}
                                                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#e8e2d3' }}>
                                                    Términos y Condiciones
                                                </a>{' '}
                                                y la{' '}
                                                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#e8e2d3' }}>
                                                    Política de Privacidad
                                                </a>
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                type="button"
                                                onClick={() => animateStep(1)}
                                                variant="ghost"
                                                className="flex-1 h-13 rounded-full font-medium transition-all duration-300 group"
                                                style={{ color: '#c8c8c8', border: '1px solid rgba(255,255,255,0.1)' }}
                                            >
                                                <ArrowLeft className="mr-1 w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                                Atrás
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={loading || !passwordsMatch || !isPasswordStrong || !acceptTerms}
                                                className="flex-[2] h-13 rounded-full font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] group"
                                                style={{
                                                    background: passwordsMatch && isPasswordStrong && acceptTerms
                                                        ? 'linear-gradient(135deg, #e8e2d3 0%, #d4cec0 100%)'
                                                        : 'rgba(255,255,255,0.1)',
                                                    color: passwordsMatch && isPasswordStrong && acceptTerms ? '#1a1a1a' : '#999999',
                                                    boxShadow: passwordsMatch && isPasswordStrong && acceptTerms ? '0 10px 30px -5px rgba(232,226,211,0.2)' : 'none'
                                                }}
                                            >
                                                {loading ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        Creando...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        Crear cuenta
                                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className={`mt-6 text-center transition-all duration-500 delay-600 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                            <p style={{ color: '#999999' }}>
                                ¿Ya tienes cuenta?{' '}
                                <Link
                                    href="/login"
                                    className="font-medium transition-all duration-300 hover:underline relative group"
                                    style={{ color: '#e8e2d3' }}
                                >
                                    Inicia sesión
                                </Link>
                            </p>
                        </div>
                    </>
                )}


            </div>
        </div>
    )
}
