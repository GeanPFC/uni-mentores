import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIP } from '@/lib/rate-limiter'

const ALLOWED_DOMAINS = ['@uni.edu.pe', '@uni.pe']

function isAllowedDomain(email: string): boolean {
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().trim().endsWith(domain))
}

function sanitizeName(name: string): string {
    return name
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{M}\s'-]/gu, '')
        .trim()
        .substring(0, 100)
}

function isNameValid(name: string): boolean {
    const sanitized = sanitizeName(name)
    const words = sanitized.split(/\s+/).filter(w => w.length >= 2)
    return words.length >= 2
}

// Valid faculty codes
const VALID_FACULTIES = ['FAUA', 'FC', 'FIA', 'FIEECS', 'FIEE', 'FIG', 'FIGMM', 'FIM', 'FIP', 'FIQT', 'FIC']

export async function POST(request: Request) {
    try {
        const ip = getClientIP(request)

        // Server-side rate limiting: 3 registrations per hour per IP
        const limit = await rateLimit(`register:${ip}`, 3, 3600_000)
        if (!limit.allowed) {
            return NextResponse.json(
                { error: `Demasiados intentos de registro. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.` },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { email, password, name, faculty, cycle } = body

        if (!email || !password || !name || !faculty) {
            return NextResponse.json(
                { error: 'Todos los campos obligatorios son requeridos' },
                { status: 400 }
            )
        }

        // Server-side domain validation
        if (!isAllowedDomain(email)) {
            return NextResponse.json(
                { error: 'Solo se permiten correos @uni.pe o @uni.edu.pe' },
                { status: 403 }
            )
        }

        // Server-side name validation
        const cleanName = sanitizeName(name)
        if (!isNameValid(cleanName)) {
            return NextResponse.json(
                { error: 'Ingresa nombre y apellido válidos (mínimo 2 palabras)' },
                { status: 400 }
            )
        }

        // Server-side faculty validation
        if (!VALID_FACULTIES.includes(faculty)) {
            return NextResponse.json(
                { error: 'Facultad no válida' },
                { status: 400 }
            )
        }

        // Server-side cycle validation
        if (cycle !== null && cycle !== undefined && cycle !== '') {
            const cycleNum = parseInt(cycle)
            if (isNaN(cycleNum) || cycleNum < 1 || cycleNum > 10) {
                return NextResponse.json(
                    { error: 'Ciclo debe ser entre 1 y 10' },
                    { status: 400 }
                )
            }
        }

        // Password strength check server-side (must match client-side isPasswordAcceptable)
        const hasMinLength = password.length >= 6
        const hasUppercase = /[A-Z]/.test(password)
        const hasNumber = /[0-9]/.test(password)
        if (!hasMinLength || !hasUppercase || !hasNumber) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres, una mayúscula y un número' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password,
            options: {
                data: {
                    name: cleanName,
                    faculty,
                    cycle: cycle || null,
                }
            }
        })

        if (signUpError) {
            const errorMap: Record<string, string> = {
                'User already registered': 'Este correo ya está registrado',
                'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
                'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
                'Signup requires a valid password': 'Ingresa una contraseña válida',
            }
            const message = errorMap[signUpError.message] || 'Ocurrió un error inesperado. Intenta de nuevo.'

            return NextResponse.json(
                { error: message },
                { status: 400 }
            )
        }

        // Always return success (anti-enumeration: never reveal if email exists)
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
