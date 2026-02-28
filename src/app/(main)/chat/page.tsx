'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatList, ChatMessages } from '@/components/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { isOnline } from '@/lib/utils'
import { ArrowLeft, MoreVertical, Calendar, Ban, Flag, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { useModal } from '@/components/ui/modal'

interface SelectedConversation {
    id: string
    other_user: {
        id: string
        name: string
        avatar_url: string | null
        faculty: string
        last_seen: string | null
    }
}

export default function ChatPage() {
    const supabase = createClient()
    const searchParams = useSearchParams()
    const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const { toast } = useToast()
    const { showConfirm, showPrompt, showForm } = useModal()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setCurrentUserId(user.id)
        }
        getUser()
    }, [supabase])

    const handleBlockUser = async () => {
        if (!selectedConversation || !currentUserId) return
        setShowUserMenu(false)

        showConfirm(
            'Bloquear usuario',
            `¿Bloquear a ${selectedConversation.other_user.name}? No podrán contactarte.`,
            async () => {
                const { error } = await supabase
                    .from('blocks')
                    .insert({ blocker_id: currentUserId, blocked_id: selectedConversation.other_user.id })

                if (error) {
                    if (error.code === '23505') {
                        toast('Usuario ya bloqueado', 'info')
                    } else {
                        toast('Error al bloquear usuario', 'error')
                    }
                } else {
                    toast(`${selectedConversation.other_user.name} ha sido bloqueado`, 'success')
                }
            },
            true
        )
    }

    const handleReportUser = async () => {
        if (!selectedConversation || !currentUserId) return
        setShowUserMenu(false)

        showPrompt(
            'Reportar usuario',
            `¿Por qué quieres reportar a ${selectedConversation.other_user.name}?`,
            'Describe el motivo del reporte...',
            async (reason) => {
                const { error } = await supabase
                    .from('reports')
                    .insert({
                        reporter_id: currentUserId,
                        reported_user_id: selectedConversation.other_user.id,
                        reason: reason
                    })

                if (error) {
                    toast('Error al enviar reporte', 'error')
                } else {
                    toast('Reporte enviado. Lo revisaremos pronto.', 'success')
                }
            }
        )
    }

    const handleProposeSession = async () => {
        if (!selectedConversation || !currentUserId) return
        setShowUserMenu(false)

        showForm(
            'Proponer sesión',
            [
                { key: 'course', label: 'Curso', placeholder: 'Ej: Cálculo II', required: true },
                { key: 'topic', label: 'Tema específico (opcional)', placeholder: 'Ej: Integrales dobles' },
            ],
            async (values) => {
                if (!values.course?.trim()) {
                    toast('Debes especificar el curso', 'error')
                    return
                }
                const { error } = await supabase
                    .from('sessions')
                    .insert({
                        mentor_id: selectedConversation.other_user.id,
                        mentee_id: currentUserId,
                        conversation_id: selectedConversation.id,
                        course: values.course,
                        topic: values.topic || null,
                        status: 'pending'
                    })

                if (error) {
                    toast('Error: ' + error.message, 'error')
                } else {
                    toast('¡Sesión propuesta! El mentor puede aceptarla.', 'success')
                }
            }
        )
    }

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const handleSelectConversation = useCallback(async (conversationId: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: participant, error: partError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', user.id)
            .single()

        if (partError || !participant) {
            console.error('Error fetching participant:', partError)
            return
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, faculty, last_seen')
            .eq('id', participant.user_id)
            .single()

        if (profileError || !profile) {
            console.error('Error fetching profile:', profileError)
            return
        }

        setSelectedConversation({
            id: conversationId,
            other_user: {
                id: profile.id,
                name: profile.name,
                avatar_url: profile.avatar_url,
                faculty: profile.faculty,
                last_seen: profile.last_seen
            }
        })
    }, [supabase])

    useEffect(() => {
        const conversationId = searchParams.get('id')
        if (conversationId && !selectedConversation) {
            handleSelectConversation(conversationId)
        }
    }, [searchParams, selectedConversation, handleSelectConversation])

    const handleBack = () => {
        setSelectedConversation(null)
    }

    // Mobile view
    if (isMobile) {
        return (
            <div className="h-[calc(100vh-8rem)]">
                {selectedConversation ? (
                    <div
                        className="h-full rounded-[2rem] flex flex-col overflow-hidden"
                        style={{
                            background: '#242424',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        {/* Mobile header */}
                        <div
                            className="flex items-center gap-3 p-4"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
                                className="rounded-full"
                                style={{ color: '#c8c8c8' }}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={selectedConversation.other_user.avatar_url || undefined} />
                                <AvatarFallback style={{ background: '#e8e2d3', color: '#1a1a1a' }}>
                                    {selectedConversation.other_user.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-medium truncate" style={{ color: '#e8e2d3' }}>
                                    {selectedConversation.other_user.name}
                                </h2>
                                <p className="text-xs" style={{ color: '#999999' }}>
                                    {isOnline(selectedConversation.other_user.last_seen) ? 'En línea' : 'Desconectado'}
                                </p>
                            </div>
                        </div>
                        <ChatMessages
                            conversationId={selectedConversation.id}
                            otherUser={selectedConversation.other_user}
                        />
                    </div>
                ) : (
                    <div
                        className="h-full rounded-[2rem] overflow-hidden"
                        style={{
                            background: '#242424',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <div
                            className="p-6"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <h1 className="text-2xl font-serif italic" style={{ color: '#e8e2d3' }}>
                                Mensajes
                            </h1>
                        </div>
                        <ChatList
                            selectedId={null}
                            onSelect={handleSelectConversation}
                        />
                    </div>
                )}
            </div>
        )
    }

    // Desktop view
    return (
        <div className="h-[calc(100vh-8rem)] flex gap-4">
            {/* Sidebar - Conversation list */}
            <div
                className="w-80 flex-shrink-0 rounded-[2rem] flex flex-col overflow-hidden"
                style={{
                    background: '#242424',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <div
                    className="p-6"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <h1 className="text-2xl font-serif italic" style={{ color: '#e8e2d3' }}>
                        Mensajes
                    </h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ChatList
                        selectedId={selectedConversation?.id || null}
                        onSelect={handleSelectConversation}
                    />
                </div>
            </div>

            {/* Main - Messages */}
            <div
                className="flex-1 rounded-[2rem] flex flex-col overflow-hidden"
                style={{
                    background: '#242424',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div
                            className="flex items-center gap-4 p-4"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <div className="relative">
                                <Avatar className="h-12 w-12 ring-2 ring-white/10">
                                    <AvatarImage src={selectedConversation.other_user.avatar_url || undefined} />
                                    <AvatarFallback style={{ background: '#e8e2d3', color: '#1a1a1a' }} className="font-medium">
                                        {selectedConversation.other_user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {isOnline(selectedConversation.other_user.last_seen) && (
                                    <span
                                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
                                        style={{ background: '#22c55e', borderColor: '#242424' }}
                                    />
                                )}
                            </div>
                            <div className="flex-1">
                                <Link
                                    href={`/profile/${selectedConversation.other_user.id}`}
                                    className="font-medium hover:underline"
                                    style={{ color: '#e8e2d3' }}
                                >
                                    {selectedConversation.other_user.name}
                                </Link>
                                <p className="text-xs" style={{ color: '#999999' }}>
                                    {selectedConversation.other_user.faculty} • {isOnline(selectedConversation.other_user.last_seen) ? 'En línea' : 'Desconectado'}
                                </p>
                            </div>

                            {/* Options menu button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="p-2.5 rounded-full transition-all hover:scale-105"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    <MoreVertical className="w-5 h-5" style={{ color: '#c8c8c8' }} />
                                </button>

                                {showUserMenu && (
                                    <div
                                        className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-xl z-50 overflow-hidden"
                                        style={{
                                            background: '#2a2a2a',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        <button
                                            onClick={handleProposeSession}
                                            className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-white/5 flex items-center gap-3"
                                            style={{ color: '#e8e2d3' }}
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Proponer sesión
                                        </button>
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                                        <button
                                            onClick={handleBlockUser}
                                            className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-white/5 flex items-center gap-3"
                                            style={{ color: '#c8c8c8' }}
                                        >
                                            <Ban className="w-4 h-4" />
                                            Bloquear usuario
                                        </button>
                                        <button
                                            onClick={handleReportUser}
                                            className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-white/5 flex items-center gap-3"
                                            style={{ color: '#ef4444' }}
                                        >
                                            <Flag className="w-4 h-4" />
                                            Reportar usuario
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <ChatMessages
                            conversationId={selectedConversation.id}
                            otherUser={selectedConversation.other_user}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div
                                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                                style={{ background: 'rgba(232, 226, 211, 0.1)' }}
                            >
                                <MessageCircle className="w-10 h-10" style={{ color: '#e8e2d3' }} />
                            </div>
                            <div>
                                <p style={{ color: '#e8e2d3' }} className="font-medium">Selecciona una conversación</p>
                                <p style={{ color: '#999999' }} className="text-sm mt-1">
                                    o inicia una desde una publicación
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
