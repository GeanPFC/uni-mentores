'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeTime, isOnline } from '@/lib/utils'
import type { ConversationWithDetails } from '@/types'

interface ChatListProps {
    selectedId: string | null
    onSelect: (id: string) => void
}

export function ChatList({ selectedId, onSelect }: ChatListProps) {
    const supabase = createClient()
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map())
    const typingChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map())

    const fetchConversations = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setCurrentUserId(user.id)

        const { data: participations, error: partError } = await supabase
            .from('conversation_participants')
            .select('conversation_id, last_read_at')
            .eq('user_id', user.id)

        if (partError) {
            console.error('Error fetching participations:', partError)
            setLoading(false)
            return
        }

        if (!participations?.length) {
            setLoading(false)
            return
        }

        const conversationIds = participations.map(p => p.conversation_id)
        const lastReadMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]))

        const { data: convs, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds)
            .order('last_message_at', { ascending: false, nullsFirst: false })

        if (convError) {
            console.error('Error fetching conversations:', convError)
            setLoading(false)
            return
        }

        const conversationsWithDetails: ConversationWithDetails[] = []

        for (const conv of convs || []) {
            const { data: participant, error: partErr } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conv.id)
                .neq('user_id', user.id)
                .single()

            if (partErr || !participant) continue

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, faculty, last_seen')
                .eq('id', participant.user_id)
                .single()

            if (!profile) continue

            const lastRead = lastReadMap.get(conv.id) || '1970-01-01'
            const { count: unreadCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id)
                .gt('created_at', lastRead)

            conversationsWithDetails.push({
                id: conv.id,
                context_type: conv.context_type,
                context_id: conv.context_id,
                last_message_at: conv.last_message_at,
                last_message_preview: conv.last_message_preview,
                created_at: conv.created_at,
                other_user: {
                    id: profile.id,
                    name: profile.name,
                    avatar_url: profile.avatar_url,
                    faculty: profile.faculty,
                    last_seen: profile.last_seen
                },
                unread_count: unreadCount || 0
            })
        }

        setConversations(conversationsWithDetails)
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchConversations()
    }, [fetchConversations])

    useEffect(() => {
        if (!currentUserId) return

        const channel = supabase
            .channel('chat-list-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                },
                () => {
                    fetchConversations()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, currentUserId, fetchConversations])

    useEffect(() => {
        if (!currentUserId || conversations.length === 0) return

        typingChannelsRef.current.forEach(ch => supabase.removeChannel(ch))
        typingChannelsRef.current.clear()

        conversations.forEach(conv => {
            const typingChannel = supabase.channel(`typing-${conv.id}`)

            typingChannel
                .on('broadcast', { event: 'typing' }, ({ payload }) => {
                    if (payload.user_id !== currentUserId) {
                        setTypingUsers(prev => new Map(prev).set(conv.id, true))
                        setTimeout(() => {
                            setTypingUsers(prev => {
                                const newMap = new Map(prev)
                                newMap.delete(conv.id)
                                return newMap
                            })
                        }, 3000)
                    }
                })
                .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
                    if (payload.user_id !== currentUserId) {
                        setTypingUsers(prev => {
                            const newMap = new Map(prev)
                            newMap.delete(conv.id)
                            return newMap
                        })
                    }
                })
                .subscribe()

            typingChannelsRef.current.set(conv.id, typingChannel)
        })

        return () => {
            typingChannelsRef.current.forEach(ch => supabase.removeChannel(ch))
            typingChannelsRef.current.clear()
        }
    }, [supabase, currentUserId, conversations])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div
                    className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2"
                    style={{ borderColor: '#e8e2d3' }}
                />
            </div>
        )
    }

    if (conversations.length === 0) {
        return (
            <div className="text-center py-8 px-4">
                <p style={{ color: '#c8c8c8' }} className="text-sm">No tienes conversaciones aún</p>
                <p style={{ color: '#999999' }} className="text-xs mt-2">
                    Contacta a alguien desde una publicación para iniciar un chat
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-1 p-2">
            {conversations.map((conv) => (
                <div
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all rounded-xl hover:scale-[1.01] ${selectedId === conv.id ? 'ring-1' : ''
                        }`}
                    style={{
                        background: selectedId === conv.id ? 'rgba(232, 226, 211, 0.1)' : 'transparent',
                    }}
                >
                    <div className="relative">
                        <Avatar className="h-12 w-12 ring-2 ring-white/10">
                            <AvatarImage src={conv.other_user.avatar_url || undefined} />
                            <AvatarFallback style={{ background: '#e8e2d3', color: '#1a1a1a' }} className="font-medium">
                                {conv.other_user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        {isOnline(conv.other_user.last_seen) && (
                            <span
                                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                                style={{ background: '#22c55e', borderColor: '#242424' }}
                            />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate" style={{ color: '#e8e2d3' }}>
                                {conv.other_user.name}
                            </h3>
                            {conv.last_message_at && (
                                <span className="text-xs" style={{ color: '#999999' }}>
                                    {formatRelativeTime(conv.last_message_at)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            {typingUsers.get(conv.id) ? (
                                <p className="text-sm italic truncate" style={{ color: '#22c55e' }}>
                                    escribiendo...
                                </p>
                            ) : (
                                <p className="text-sm truncate" style={{ color: '#c8c8c8' }}>
                                    {conv.last_message_preview || 'Sin mensajes'}
                                </p>
                            )}
                            {conv.unread_count > 0 && (
                                <span
                                    className="ml-2 flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs rounded-full font-medium"
                                    style={{ background: '#e8e2d3', color: '#1a1a1a' }}
                                >
                                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
