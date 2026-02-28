import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIP } from '@/lib/rate-limiter'

const ALLOWED_DOMAINS = ['@uni.edu.pe', '@uni.pe']

function isAllowedDomain(email: string): boolean {
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().trim().endsWith(domain))
}

/**
 * Forgot-password API route with server-side rate limiting.
 * 
 * Limits: 3 requests per 15 minutes per IP to prevent email spam abuse.
 * Always returns success to the client (anti-enumeration).
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIP(request)

        // Server-side rate limiting: 3 requests per 15 minutes per IP
        const limit = await rateLimit(`forgot-password:${ip}`, 3, 15 * 60_000)
        if (!limit.allowed) {
            return NextResponse.json(
                { error: `Demasiados intentos. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.` },
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

        const supabase = await createClient()

        // Send reset email (Supabase handles it)
        // We don't return the error to the client to prevent enumeration
        await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/callback?type=recovery`,
        })

        // Always return success (anti-enumeration)
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
