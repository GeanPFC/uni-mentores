import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // HIDDEN FOR DEPLOYMENT: Redirect /home and /chat to /explore
    const hiddenPaths = ['/home', '/chat']
    const isHidden = hiddenPaths.some(path => request.nextUrl.pathname.startsWith(path))
    if (isHidden) {
        const url = request.nextUrl.clone()
        url.pathname = '/explore'
        return NextResponse.redirect(url)
    }

    // Protected routes (pages)
    const protectedPaths = ['/explore', '/profile', '/sessions', '/create', '/admin']
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    // Protected API routes (exclude auth API which must be public)
    const isProtectedApi = request.nextUrl.pathname.startsWith('/api/') &&
        !request.nextUrl.pathname.startsWith('/api/auth/')

    if ((isProtected || isProtectedApi) && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Admin-only route protection
    if (request.nextUrl.pathname.startsWith('/admin') && user) {
        const adminCheck = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll() },
                    setAll() { },
                },
            }
        )
        const { data: profile } = await adminCheck.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/home'
            return NextResponse.redirect(url)
        }
    }

    // Check if email is confirmed for protected routes
    if ((isProtected || isProtectedApi) && user && !user.email_confirmed_at) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'email_not_confirmed')
        return NextResponse.redirect(url)
    }

    // Redirect logged in users from auth pages — BUT only if email is confirmed
    // (unconfirmed users should be able to access auth pages to see the confirmation prompt)
    const authPaths = ['/login', '/register', '/forgot-password']
    const isAuthPage = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isAuthPage && user && user.email_confirmed_at) {
        const url = request.nextUrl.clone()
        url.pathname = '/explore'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
