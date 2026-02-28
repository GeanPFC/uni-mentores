'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Heart, MessageCircle, UserPlus, FileText, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import type { NotificationData } from '@/types'

export function NotificationBell() {
    const [notifications, setNotifications] = useState<NotificationData[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Fetch notifications
    const fetchNotifications = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
            .from('notifications')
            .select(`
                id, user_id, actor_id, type, post_id, comment_id, is_read, created_at,
                actor:profiles!notifications_actor_id_fkey(id, name, avatar_url),
                post:posts!notifications_post_id_fkey(course, topic)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = data.map((n: any) => ({
                ...n,
                actor: Array.isArray(n.actor) ? n.actor[0] : n.actor,
                post: Array.isArray(n.post) ? n.post[0] : n.post,
            })) as NotificationData[]
            setNotifications(mapped)
            setUnreadCount(mapped.filter(n => !n.is_read).length)
        }
        setLoading(false)
    }

    // Initial fetch
    useEffect(() => {
        fetchNotifications()
    }, [])

    // Realtime subscription
    useEffect(() => {
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel('notifications-bell')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                }, () => {
                    // Refetch to get joined data
                    fetchNotifications()
                })
                .subscribe()

            return () => { supabase.removeChannel(channel) }
        }

        setupRealtime()
    }, [])

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.is_read)
        if (unread.length === 0) return

        // Optimistic UI update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Try batch update first
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        if (error) {
            console.error('Batch markAllRead failed:', error.message)
            // Fallback: update one by one by ID
            for (const n of unread) {
                const { error: singleErr } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', n.id)
                if (singleErr) {
                    console.error(`markRead failed for ${n.id}:`, singleErr.message)
                }
            }
            // Re-fetch to verify actual state
            await fetchNotifications()
        }
    }

    const getNotifIcon = (type: string) => {
        switch (type) {
            case 'like': return <Heart className="w-3.5 h-3.5 text-red-400" />
            case 'comment': return <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
            case 'follow': return <UserPlus className="w-3.5 h-3.5 text-green-400" />
            case 'new_post': return <FileText className="w-3.5 h-3.5 text-yellow-400" />
            default: return <Bell className="w-3.5 h-3.5" />
        }
    }

    const getNotifText = (n: NotificationData) => {
        const actor = n.actor?.name || 'Alguien'
        const course = n.post?.course || ''
        switch (n.type) {
            case 'like': return <><strong>{actor}</strong> le dio ❤️ a tu oferta{course ? ` de ${course}` : ''}</>
            case 'comment': return <><strong>{actor}</strong> comentó en tu publicación{course ? ` de ${course}` : ''}</>
            case 'follow': return <><strong>{actor}</strong> comenzó a seguirte</>
            case 'new_post': return <><strong>{actor}</strong> publicó una nueva oferta{course ? ` de ${course}` : ''}</>
            default: return <><strong>{actor}</strong> interactuó contigo</>
        }
    }

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'ahora'
        if (mins < 60) return `${mins}m`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d`
        return `${Math.floor(days / 7)}sem`
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
                className="relative p-2 rounded-full transition-all hover:bg-white/5"
                aria-label="Notificaciones"
            >
                <Bell className="w-5 h-5" style={{ color: open ? '#e8e2d3' : '#999' }} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                        style={{ background: '#ef4444', color: '#fff' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-12 w-[340px] max-h-[420px] rounded-2xl overflow-hidden shadow-2xl z-50"
                    style={{
                        background: '#242424',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-sm font-semibold" style={{ color: '#e8e2d3' }}>
                            Notificaciones
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:opacity-80"
                                style={{ color: '#999' }}
                            >
                                <Check className="w-3 h-3" />
                                Marcar todo leído
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto max-h-[360px]">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#e8e2d340', borderTopColor: 'transparent' }} />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <Bell className="w-8 h-8" style={{ color: '#444' }} />
                                <p className="text-xs" style={{ color: '#666' }}>Sin notificaciones aún</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150"
                                    style={{
                                        background: n.is_read ? 'transparent' : 'rgba(232,226,211,0.03)',
                                        borderLeft: '3px solid transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                                        e.currentTarget.style.borderLeftColor = '#6366f1'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(232,226,211,0.03)'
                                        e.currentTarget.style.borderLeftColor = 'transparent'
                                    }}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={n.actor?.avatar_url || undefined} />
                                            <AvatarFallback className="text-[10px]" style={{ background: '#333', color: '#999' }}>
                                                {n.actor?.name?.charAt(0)?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                            style={{ background: '#242424' }}>
                                            {getNotifIcon(n.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs leading-relaxed" style={{ color: n.is_read ? '#888' : '#ccc' }}>
                                            {getNotifText(n)}
                                        </p>
                                        <span className="text-[10px]" style={{ color: '#666' }}>
                                            {timeAgo(n.created_at)}
                                        </span>
                                    </div>
                                    {!n.is_read && (
                                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#e8e2d3' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
