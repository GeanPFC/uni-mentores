import { NextResponse } from 'next/server'
import { rateLimit, getClientIP } from '@/lib/rate-limiter'

const ALLOWED_DOMAINS = ['@uni.edu.pe', '@uni.pe']

function isAllowedDomain(email: string): boolean {
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().trim().endsWith(domain))
}

/**
 * Login pre-validation API route.
 * 
 * This route ONLY handles rate limiting and domain validation.
 * The actual signInWithPassword happens on the CLIENT so that
 * @supabase/ssr correctly sets session cookies in the browser.
 * 
 * Flow: Client → POST /api/auth/login (rate-limit + domain check)
 *       Client ← { allowed: true }
 *       Client → supabase.auth.signInWithPassword() (sets cookies properly)
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIP(request)

        // Server-side rate limiting: 5 attempts per 60 seconds per IP
        const limit = await rateLimit(`login:${ip}`, 5, 60_000)
        if (!limit.allowed) {
            return NextResponse.json(
                { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds} segundos.` },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { email } = body

        if (!email) {
            return NextResponse.json(
                { error: 'Correo es requerido' },
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

        // Pre-validation passed — client should proceed with signInWithPassword
        return NextResponse.json({ allowed: true })
    } catch {
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
