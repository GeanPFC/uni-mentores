'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatTime, generateUUID } from '@/lib/utils'
import { Send } from 'lucide-react'
import type { MessageWithSender } from '@/types'

interface ChatMessagesProps {
    conversationId: string
    otherUser: {
        id: string
        name: string
        avatar_url: string | null
    }
}

export function ChatMessages({ conversationId, otherUser }: ChatMessagesProps) {
    const supabase = createClient()
    const [messages, setMessages] = useState<MessageWithSender[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [newMessage, setNewMessage] = useState('')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string; avatar_url: string | null } | null>(null)
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchMessages = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setCurrentUserId(user.id)

        const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', user.id)
            .single()

        if (profile) {
            setCurrentUserProfile(profile)
        }

        const { data, error } = await supabase
            .from('messages')
            .select(`
                id, conversation_id, sender_id, type, content, client_id, created_at,
                sender:profiles!messages_sender_id_fkey (
                    id, name, avatar_url
                )
            `)
            .eq('conversation_id', conversationId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error)
        } else {
            const formattedMessages: MessageWithSender[] = (data || []).map(msg => ({
                id: msg.id,
                conversation_id: msg.conversation_id,
                sender_id: msg.sender_id,
                type: msg.type,
                content: msg.content,
                client_id: msg.client_id,
                created_at: msg.created_at,
                sender: msg.sender as unknown as { id: string; name: string; avatar_url: string | null }
            }))
            setMessages(formattedMessages)
        }

        setLoading(false)
        await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
    }, [supabase, conversationId])

    useEffect(() => {
        fetchMessages()
    }, [fetchMessages])

    useEffect(() => {
        scrollToBottom()
        const timer = setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
        return () => clearTimeout(timer)
    }, [messages])

    useEffect(() => {
        if (!currentUserId) return

        const channel = supabase
            .channel(`messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    const msg = payload.new as { conversation_id?: string } | null
                    if (msg?.conversation_id === conversationId) {
                        fetchMessages()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, conversationId, currentUserId, fetchMessages])

    useEffect(() => {
        if (!currentUserId) return

        const typingChannel = supabase.channel(`typing-${conversationId}`)

        typingChannel
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                if (payload.user_id !== currentUserId) {
                    setIsOtherUserTyping(true)
                    setTimeout(() => setIsOtherUserTyping(false), 3000)
                }
            })
            .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
                if (payload.user_id !== currentUserId) {
                    setIsOtherUserTyping(false)
                }
            })
            .subscribe()

        typingChannelRef.current = typingChannel

        return () => {
            supabase.removeChannel(typingChannel)
        }
    }, [supabase, conversationId, currentUserId])

    const sendTypingEvent = useCallback(() => {
        if (!typingChannelRef.current || !currentUserId) return

        typingChannelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUserId }
        })

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        typingTimeoutRef.current = setTimeout(() => {
            typingChannelRef.current?.send({
                type: 'broadcast',
                event: 'stop_typing',
                payload: { user_id: currentUserId }
            })
        }, 2000)
    }, [currentUserId])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value)
        if (e.target.value.trim()) {
            sendTypingEvent()
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || sending || !currentUserId) return

        setSending(true)
        const clientId = generateUUID()
        const content = newMessage.trim()
        setNewMessage('')

        const optimisticMessage: MessageWithSender = {
            id: `temp-${clientId}`,
            conversation_id: conversationId,
            sender_id: currentUserId,
            type: 'text',
            content,
            client_id: clientId,
            created_at: new Date().toISOString(),
            sender: currentUserProfile
                ? { id: currentUserId, ...currentUserProfile }
                : { id: currentUserId, name: 'Yo', avatar_url: null }
        }

        setMessages(prev => [...prev, optimisticMessage])

        try {
            const { error } = await supabase.rpc('send_message', {
                p_conversation_id: conversationId,
                p_content: content,
                p_client_id: clientId
            })

            if (error) {
                console.error('Error sending message:', error)
                setMessages(prev => prev.filter(m => m.client_id !== clientId))
                setNewMessage(content)
            }
        } catch (err) {
            console.error('Error:', err)
            setMessages(prev => prev.filter(m => m.client_id !== clientId))
            setNewMessage(content)
        } finally {
            setSending(false)
            setTimeout(() => {
                inputRef.current?.focus()
            }, 0)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div
                    className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
                    style={{ borderColor: '#e8e2d3' }}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Messages list */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
                style={{ background: 'rgba(26, 26, 26, 0.5)' }}
            >
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p style={{ color: '#c8c8c8' }}>No hay mensajes aún</p>
                        <p style={{ color: '#999999' }} className="text-sm mt-1">¡Envía el primer mensaje!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isOwn = msg.sender_id === currentUserId
                        const showAvatar = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isOwn && showAvatar && (
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={msg.sender?.avatar_url || undefined} />
                                        <AvatarFallback style={{ background: '#e8e2d3', color: '#1a1a1a' }} className="text-xs font-medium">
                                            {msg.sender?.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                {!isOwn && !showAvatar && <div className="w-8" />}

                                <div
                                    className={`max-w-[70%] px-4 py-2.5 ${isOwn
                                        ? 'rounded-2xl rounded-br-md'
                                        : 'rounded-2xl rounded-bl-md'
                                        }`}
                                    style={{
                                        background: isOwn ? '#e8e2d3' : '#333333',
                                        color: isOwn ? '#1a1a1a' : '#ffffff'
                                    }}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p
                                        className="text-[10px] mt-1"
                                        style={{ color: isOwn ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.5)' }}
                                    >
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />

                {/* Typing indicator */}
                {isOtherUserTyping && (
                    <div className="flex items-center gap-2 px-2">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#e8e2d3', animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#e8e2d3', animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#e8e2d3', animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs" style={{ color: '#c8c8c8' }}>{otherUser.name} está escribiendo...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <form
                onSubmit={handleSend}
                className="p-4"
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    background: '#242424'
                }}
            >
                <div className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onBlur={() => {
                            setTimeout(() => inputRef.current?.focus(), 0)
                        }}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 rounded-full px-5 py-3 outline-none transition-all focus:ring-2 focus:ring-[#e8e2d3]"
                        style={{
                            background: '#333333',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#ffffff'
                        }}
                        autoFocus
                    />
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="rounded-full w-12 h-12 p-0 transition-all hover:scale-105"
                        style={{
                            background: newMessage.trim() ? '#e8e2d3' : '#333333',
                            color: newMessage.trim() ? '#1a1a1a' : '#999999'
                        }}
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </form>
        </div>
    )
}
