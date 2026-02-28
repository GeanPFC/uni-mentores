'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/ui/notification-bell'
import type { Profile } from '@/types'

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data && !error) {
                setProfile(data)
            } else {
                // Fallback: create minimal profile from auth user so navbar works
                console.warn('Profile fetch failed:', error?.message)
                setProfile({
                    id: user.id,
                    name: user.email?.split('@')[0] || 'Usuario',
                    email: user.email || '',
                    faculty: '',
                    cycle: null,
                    avatar_url: null,
                    bio: null,
                    role: 'user',
                    mentor_status: 'none',
                    whatsapp: null,
                    is_active: true,
                    last_seen: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as Profile)
            }
            setLoading(false)

            // Fetch unread message count
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .neq('sender_id', user.id)
                .in('conversation_id',
                    (await supabase
                        .from('conversation_participants')
                        .select('conversation_id')
                        .eq('user_id', user.id)
                    ).data?.map(p => p.conversation_id) || []
                )

            setUnreadCount(count || 0)
        }

        getProfile()
    }, [supabase])

    // Subscribe to new messages for unread count
    useEffect(() => {
        if (!profile) return

        const channel = supabase
            .channel('unread-count')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                if (payload.new.sender_id !== profile.id) {
                    setUnreadCount(prev => prev + 1)
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [profile, supabase])

    // Reset unread count when visiting chat
    useEffect(() => {
        if (pathname === '/chat') {
            setUnreadCount(0)
        }
    }, [pathname])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const isActive = (path: string) => pathname === path

    const navLinkStyle = (path: string) => ({
        color: isActive(path) ? '#e8e2d3' : '#999999',
        background: isActive(path) ? 'rgba(232, 226, 211, 0.1)' : 'transparent',
    })

    const mobileIconStyle = (path: string) => ({
        color: isActive(path) ? '#e8e2d3' : '#999999',
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#e8e2d3]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen" style={{ background: '#1a1a1a' }}>
            {/* Header - Lovable Editorial Pill Navigation */}
            <header className="sticky top-0 z-50 py-3 sm:py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16 rounded-full px-6"
                        style={{
                            background: 'rgba(36, 36, 36, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                        {/* Logo - Cream/Beige style */}
                        <Link href="/home" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: '#e8e2d3' }}>
                                <span className="font-bold text-lg" style={{ color: '#1a1a1a' }}>U</span>
                            </div>
                            <span className="text-lg sm:text-xl font-semibold" style={{ color: '#e8e2d3' }}>
                                UNI Mentores
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {/* HIDDEN FOR DEPLOYMENT - Home not ready yet
                            <Link href="/home"
                                className="text-sm font-medium rounded-full px-4 py-2 transition-all"
                                style={navLinkStyle('/home')}
                            >
                                Inicio
                            </Link>
                            */}
                            <Link href="/explore"
                                className="text-sm font-medium rounded-full px-4 py-2 transition-all"
                                style={navLinkStyle('/explore')}
                            >
                                Explorar
                            </Link>
                            <Link href="/create"
                                className="text-sm font-medium rounded-full px-4 py-2 transition-all"
                                style={navLinkStyle('/create')}
                            >
                                Publicar
                            </Link>
                            {/* HIDDEN FOR DEPLOYMENT - Chat not ready yet
                            <Link href="/chat"
                                className="relative text-sm font-medium rounded-full px-4 py-2 transition-all"
                                style={navLinkStyle('/chat')}
                            >
                                Chat
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                                        style={{ background: '#ef4444', color: '#ffffff' }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                            */}

                            {profile?.role === 'admin' && (
                                <Link href="/admin"
                                    className="text-sm font-medium rounded-full px-4 py-2 transition-all"
                                    style={navLinkStyle('/admin')}
                                >
                                    🛡️ Admin
                                </Link>
                            )}

                        </nav>

                        <div className="flex items-center gap-3 flex-shrink-0">
                            {profile ? (
                                <div className="flex items-center gap-2">
                                    <NotificationBell />
                                    <Link href="/profile">
                                        <Avatar className={`h-9 w-9 cursor-pointer ring-2 hover:ring-white/30 transition-all duration-300 ${isActive('/profile') ? 'ring-[#e8e2d3]/50' : 'ring-white/10'}`}>
                                            <AvatarImage src={profile.avatar_url || undefined} />
                                            <AvatarFallback style={{ background: '#e8e2d3', color: '#1a1a1a' }}>
                                                {profile.name?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <Button
                                        onClick={handleLogout}
                                        variant="ghost"
                                        size="sm"
                                        className="text-[#999999] hover:text-white hover:bg-white/10 rounded-full"
                                    >
                                        Salir
                                    </Button>
                                </div>
                            ) : (
                                <Link href="/login">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full px-6"
                                        style={{
                                            borderColor: '#e8e2d3',
                                            color: '#e8e2d3',
                                            background: 'transparent'
                                        }}
                                    >
                                        Iniciar sesión
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
                <div className="flex items-center justify-around h-14 rounded-full px-4"
                    style={{
                        background: 'rgba(36, 36, 36, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                    {/* HIDDEN FOR DEPLOYMENT - Home not ready yet
                    <Link href="/home" className="flex flex-col items-center transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={mobileIconStyle('/home')}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {isActive('/home') && <div className="w-1 h-1 rounded-full mt-1" style={{ background: '#e8e2d3' }} />}
                    </Link>
                    */}
                    <Link href="/explore" className="flex flex-col items-center transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={mobileIconStyle('/explore')}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {isActive('/explore') && <div className="w-1 h-1 rounded-full mt-1" style={{ background: '#e8e2d3' }} />}
                    </Link>
                    <Link href="/create" className="flex flex-col items-center transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={mobileIconStyle('/create')}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {isActive('/create') && <div className="w-1 h-1 rounded-full mt-1" style={{ background: '#e8e2d3' }} />}
                    </Link>
                    {/* HIDDEN FOR DEPLOYMENT - Chat not ready yet
                    <Link href="/chat" className="relative flex flex-col items-center transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={mobileIconStyle('/chat')}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5"
                                style={{ background: '#ef4444', color: '#ffffff' }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                        {isActive('/chat') && <div className="w-1 h-1 rounded-full mt-1" style={{ background: '#e8e2d3' }} />}
                    </Link>
                    */}
                    <Link href="/profile" className="flex flex-col items-center transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={mobileIconStyle('/profile')}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {isActive('/profile') && <div className="w-1 h-1 rounded-full mt-1" style={{ background: '#e8e2d3' }} />}
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
                {children}
            </main>
        </div>
    )
}
