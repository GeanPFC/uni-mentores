import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Validate redirect path to prevent open redirects
function sanitizeRedirectPath(path: string | null): string {
    if (!path) return '/explore'
    // Only allow paths that start with / and don't contain protocol markers
    if (path.startsWith('/') && !path.startsWith('//') && !path.includes('://')) {
        // Strip any query params that themselves contain URLs
        try {
            const url = new URL(path, 'http://localhost')
            for (const [key, value] of url.searchParams) {
                if (value.includes('://') || value.startsWith('//')) {
                    url.searchParams.delete(key)
                }
            }
            return url.pathname + url.search
        } catch {
            return path.split('?')[0] || '/explore'
        }
    }
    return '/explore'
}

// P2: Validate email domain for UNI-only access
const ALLOWED_DOMAINS = ['@uni.edu.pe', '@uni.pe']
function isAllowedDomain(email: string | undefined): boolean {
    if (!email) return false
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain))
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = sanitizeRedirectPath(searchParams.get('next'))

    const supabase = await createClient()

    // Handle OAuth code exchange
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // P2: Verify the user's email domain after OAuth
            const { data: { user } } = await supabase.auth.getUser()

            if (user?.email && !isAllowedDomain(user.email)) {
                // Domain not allowed — sign out and redirect with error
                await supabase.auth.signOut()
                return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`)
            }

            // If recovery flow, redirect to reset-password page
            if (type === 'recovery') {
                return NextResponse.redirect(`${origin}/reset-password`)
            }
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Handle token-hash based flows (email verification, recovery)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'recovery' | 'email',
        })
        if (!error) {
            // Verify domain for token_hash flows too
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email && !isAllowedDomain(user.email)) {
                await supabase.auth.signOut()
                return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`)
            }

            if (type === 'recovery') {
                return NextResponse.redirect(`${origin}/reset-password`)
            }
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
