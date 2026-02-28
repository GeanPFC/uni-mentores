'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, Send, Trash2, X, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import type { CommentWithAuthor } from '@/types'

interface PostPreviewData {
    type: string
    course: string
    topic: string
    description?: string | null
    price_or_budget?: number | null
    created_at: string
    author: {
        name: string
        avatar_url: string | null
        faculty: string
    }
}

interface CommentSectionProps {
    postId: string
    postOwnerId: string
    initialCount: number
    accentColor?: string
    postData?: PostPreviewData
}

export function CommentSection({ postId, postOwnerId, initialCount, accentColor = '#e8e2d3', postData }: CommentSectionProps) {
    const [comments, setComments] = useState<CommentWithAuthor[]>([])
    const [count, setCount] = useState(initialCount)
    const [showModal, setShowModal] = useState(false)
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [hasFetched, setHasFetched] = useState(false)
    const modalInputRef = useRef<HTMLInputElement>(null)
    const commentsEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUserId(user?.id || null)
        })
    }, [supabase])

    useEffect(() => {
        if (showModal && !hasFetched) fetchComments()
    }, [showModal])

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = '' }
        }
    }, [showModal])

    useEffect(() => {
        if (showModal && commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [showModal, comments.length])

    const fetchComments = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('post_comments')
            .select(`
                id, post_id, user_id, content, parent_id, created_at,
                author:profiles!post_comments_user_id_fkey(id, name, avatar_url, faculty)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = data.map((c: any) => ({
                ...c,
                author: Array.isArray(c.author) ? c.author[0] : c.author
            })) as CommentWithAuthor[]
            setComments(mapped)
            setCount(mapped.length)
        }
        setHasFetched(true)
        setLoading(false)
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!newComment.trim() || submitting || !currentUserId) return

        const content = newComment.trim()
        setSubmitting(true)
        setNewComment('')

        const tempId = crypto.randomUUID()
        const optimisticComment: CommentWithAuthor = {
            id: tempId,
            post_id: postId,
            user_id: currentUserId,
            content,
            parent_id: null,
            created_at: new Date().toISOString(),
            author: { id: currentUserId, name: 'Tú', avatar_url: null, faculty: '' }
        }

        setComments(prev => [...prev, optimisticComment])
        setCount(prev => prev + 1)

        try {
            const { data, error } = await supabase
                .from('post_comments')
                .insert({ post_id: postId, user_id: currentUserId, content })
                .select(`
                    id, post_id, user_id, content, parent_id, created_at,
                    author:profiles!post_comments_user_id_fkey(id, name, avatar_url, faculty)
                `)
                .single()

            if (error) throw error

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = { ...data, author: Array.isArray((data as any).author) ? (data as any).author[0] : (data as any).author } as CommentWithAuthor
            setComments(prev => prev.map(c => c.id === tempId ? mapped : c))

            if (postOwnerId !== currentUserId) {
                await supabase.from('notifications').insert({
                    user_id: postOwnerId,
                    actor_id: currentUserId,
                    type: 'comment',
                    post_id: postId,
                    comment_id: mapped.id,
                })
            }
        } catch {
            setComments(prev => prev.filter(c => c.id !== tempId))
            setCount(prev => prev - 1)
            setNewComment(content)
        }
        setSubmitting(false)
    }

    const handleDelete = async (commentId: string) => {
        const deleted = comments.find(c => c.id === commentId)
        if (!deleted) return

        setComments(prev => prev.filter(c => c.id !== commentId))
        setCount(prev => prev - 1)

        const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
        if (error) {
            setComments(prev => [...prev, deleted].sort((a, b) => a.created_at.localeCompare(b.created_at)))
            setCount(prev => prev + 1)
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

    const formatPrice = (price: number) => {
        return price === 0 ? 'Gratis' : `S/. ${price.toFixed(2)}`
    }

    // ─── Render helpers ───

    const renderComment = (comment: CommentWithAuthor) => (
        <div key={comment.id} className="flex gap-2.5 group">
            <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                <AvatarImage src={comment.author.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]" style={{ background: '#333', color: '#999' }}>
                    {comment.author.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-xs font-semibold" style={{ color: accentColor }}>
                        {comment.author.name}
                    </span>
                    <p className="text-xs leading-relaxed break-words mt-0.5" style={{ color: '#ccc' }}>
                        {comment.content}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 px-1">
                    <span className="text-[10px]" style={{ color: '#555' }}>{timeAgo(comment.created_at)}</span>
                    {comment.user_id === currentUserId && (
                        <button
                            onClick={() => handleDelete(comment.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center gap-0.5 hover:text-red-400"
                            style={{ color: '#666' }}
                        >
                            <Trash2 className="w-2.5 h-2.5" />
                            Eliminar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )



    return (
        <>
            {/* Compact button — never expands inline */}
            <div className="mt-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowModal(true)
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: '#999' }}
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{count > 0 ? `${count} comentario${count !== 1 ? 's' : ''}` : 'Comentar'}</span>
                </button>
            </div>

            {/* ═══════════════ CINEMATIC SPLIT MODAL ═══════════════ */}
            {showModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
                    style={{ animation: 'cmBackdropIn 0.4s ease forwards' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false)
                    }}
                >
                    {/* Backdrop with blur */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                        onClick={() => setShowModal(false)}
                    />

                    {/* ── MOBILE LAYOUT (single column, post as compact header) ── */}
                    <div className="md:hidden relative w-full max-w-lg flex flex-col"
                        style={{
                            maxHeight: '90vh',
                            animation: 'cmCardUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Mobile post compact header */}
                        {postData && (
                            <div
                                className="rounded-t-2xl px-5 py-4 flex items-center gap-3 flex-shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, #1e1e1e, #252525)',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderBottomLeftRadius: 0,
                                    borderBottomRightRadius: 0,
                                }}
                            >
                                <Avatar className="w-9 h-9 flex-shrink-0 ring-2" style={{ borderColor: `${accentColor}40` }}>
                                    <AvatarImage src={postData.author.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px] font-bold" style={{ background: `${accentColor}25`, color: accentColor }}>
                                        {postData.author.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate" style={{ color: '#e8e2d3' }}>
                                        {postData.course}
                                    </p>
                                    <p className="text-[11px] truncate" style={{ color: '#888' }}>
                                        por {postData.author.name} · {postData.topic}
                                    </p>
                                </div>
                                <span
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex-shrink-0"
                                    style={{
                                        background: postData.type === 'OFFER' ? 'rgba(107,124,63,0.2)' : 'rgba(139,105,20,0.2)',
                                        color: postData.type === 'OFFER' ? '#a3b86c' : '#d4a524',
                                    }}
                                >
                                    {postData.type === 'OFFER' ? 'Ofrezco' : 'Necesito'}
                                </span>
                            </div>
                        )}

                        {/* Mobile comments card */}
                        <div
                            className="flex-1 flex flex-col min-w-0 overflow-hidden"
                            style={{
                                background: '#1a1a1a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderTop: postData ? 'none' : undefined,
                                borderRadius: postData ? '0 0 1rem 1rem' : '1rem',
                                maxHeight: postData ? 'calc(90vh - 72px)' : '90vh',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" style={{ color: accentColor }} />
                                    <h3 className="text-sm font-semibold" style={{ color: '#e8e2d3' }}>
                                        {count > 0 ? `${count} comentario${count !== 1 ? 's' : ''}` : 'Comentarios'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 rounded-full transition-all hover:bg-white/10"
                                    style={{ color: '#999' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Scrollable comments */}
                            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ minHeight: 0 }}>
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2 py-8">
                                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accentColor}40`, borderTopColor: 'transparent' }} />
                                        <span className="text-sm" style={{ color: '#666' }}>Cargando comentarios...</span>
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                                        <MessageCircle className="w-8 h-8" style={{ color: '#444' }} />
                                        <p className="text-sm" style={{ color: '#666' }}>Sé el primero en comentar</p>
                                    </div>
                                ) : (
                                    comments.map(renderComment)
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            {/* Input */}
                            {currentUserId && (
                                <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                        <input
                                            ref={modalInputRef}
                                            type="text"
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Escribe un comentario..."
                                            maxLength={500}
                                            autoFocus
                                            className="flex-1 text-sm rounded-full px-4 py-2.5 outline-none transition-all"
                                            style={{
                                                background: 'rgba(255,255,255,0.06)',
                                                color: '#e8e2d3',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                            }}
                                            onFocus={e => { e.currentTarget.style.borderColor = `${accentColor}50` }}
                                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim() || submitting}
                                            className="p-2 rounded-full transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                                            style={{ color: accentColor }}
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── DESKTOP LAYOUT (two independent cards side by side) ── */}
                    <div
                        className="hidden md:flex items-start gap-4 relative w-full max-w-5xl"
                        style={{ maxHeight: '82vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ═══ LEFT CARD: Post Preview ═══ */}
                        {postData && (
                            <div
                                className="w-[42%] flex-shrink-0 rounded-2xl p-7 flex flex-col relative overflow-hidden"
                                style={{
                                    background: 'linear-gradient(160deg, #222222, #1a1a1a)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: `0 30px 70px -15px rgba(0,0,0,0.6), 0 0 40px -10px ${accentColor}15`,
                                    animation: 'cmPostIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                                    height: 'fit-content',
                                    maxHeight: '82vh',
                                    position: 'sticky',
                                    top: 0,
                                }}
                            >
                                {/* Decorative glow orbs */}
                                <div
                                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
                                    style={{ background: accentColor }}
                                />
                                <div
                                    className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-8 pointer-events-none"
                                    style={{ background: accentColor }}
                                />

                                {/* Accent top line */}
                                <div
                                    className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
                                    style={{
                                        background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
                                        animation: 'cmFadeInUp 0.6s ease 0.3s both',
                                    }}
                                />

                                {/* Type badge + Date */}
                                <div className="relative z-10 flex items-center justify-between mb-5"
                                    style={{ animation: 'cmFadeInUp 0.5s ease 0.15s both' }}>
                                    <span
                                        className="text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider"
                                        style={{
                                            background: postData.type === 'OFFER' ? 'rgba(107,124,63,0.2)' : 'rgba(139,105,20,0.2)',
                                            color: postData.type === 'OFFER' ? '#a3b86c' : '#d4a524',
                                            border: `1px solid ${postData.type === 'OFFER' ? 'rgba(107,124,63,0.3)' : 'rgba(139,105,20,0.3)'}`,
                                        }}
                                    >
                                        {postData.type === 'OFFER' ? '✦ Ofrezco' : '✧ Necesito'}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#666' }}>
                                        <Clock className="w-3 h-3" />
                                        {timeAgo(postData.created_at)}
                                    </span>
                                </div>

                                {/* Course title — BIG */}
                                <h3
                                    className="relative z-10 text-2xl lg:text-3xl font-serif leading-tight mb-3"
                                    style={{
                                        color: '#f0ebe0',
                                        animation: 'cmFadeInUp 0.5s ease 0.25s both',
                                    }}
                                >
                                    {postData.course}
                                </h3>

                                {/* Topic */}
                                <p
                                    className="relative z-10 text-sm leading-relaxed mb-2"
                                    style={{
                                        color: '#aaa',
                                        animation: 'cmFadeInUp 0.5s ease 0.3s both',
                                    }}
                                >
                                    {postData.topic}
                                </p>

                                {/* Description */}
                                {postData.description && (
                                    <p
                                        className="relative z-10 text-xs leading-relaxed mt-1"
                                        style={{
                                            color: '#777',
                                            animation: 'cmFadeInUp 0.5s ease 0.35s both',
                                        }}
                                    >
                                        {postData.description}
                                    </p>
                                )}

                                {/* Price badge */}
                                {postData.price_or_budget !== null && postData.price_or_budget !== undefined && (
                                    <div className="relative z-10 mt-5" style={{ animation: 'cmFadeInUp 0.5s ease 0.4s both' }}>
                                        <span
                                            className="text-base font-bold px-4 py-2 rounded-xl inline-block"
                                            style={{
                                                background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                                                color: accentColor,
                                                border: `1px solid ${accentColor}25`,
                                            }}
                                        >
                                            {formatPrice(postData.price_or_budget)}
                                        </span>
                                    </div>
                                )}

                                {/* Author — anchored to bottom */}
                                <div
                                    className="relative z-10 mt-auto pt-6"
                                    style={{
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        animation: 'cmFadeInUp 0.5s ease 0.45s both',
                                    }}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <Avatar className="w-11 h-11 ring-2" style={{ borderColor: `${accentColor}40` }}>
                                            <AvatarImage src={postData.author.avatar_url || undefined} />
                                            <AvatarFallback className="text-sm font-bold" style={{ background: `${accentColor}25`, color: accentColor }}>
                                                {postData.author.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-base font-medium truncate" style={{ color: '#d8d8d8' }}>
                                                {postData.author.name}
                                            </p>
                                            <p className="text-xs truncate" style={{ color: '#666' }}>
                                                {postData.author.faculty}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ RIGHT CARD: Comments Panel ═══ */}
                        <div
                            className={`flex flex-col rounded-2xl overflow-hidden ${postData ? 'flex-1' : 'w-full max-w-lg mx-auto'}`}
                            style={{
                                background: '#1a1a1a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
                                animation: postData
                                    ? 'cmCommentsIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both'
                                    : 'cmCardUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                                maxHeight: '82vh',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                        style={{ background: `${accentColor}15` }}>
                                        <MessageCircle className="w-3.5 h-3.5" style={{ color: accentColor }} />
                                    </div>
                                    <h3 className="text-sm font-semibold" style={{ color: '#e8e2d3' }}>
                                        {count > 0 ? `${count} comentario${count !== 1 ? 's' : ''}` : 'Comentarios'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 rounded-lg transition-all hover:bg-white/10 hover:rotate-90"
                                    style={{ color: '#888', transitionDuration: '300ms' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Scrollable comments list */}
                            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ minHeight: 0 }}>
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2 py-10">
                                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                            style={{ borderColor: `${accentColor}40`, borderTopColor: 'transparent' }} />
                                        <span className="text-sm" style={{ color: '#666' }}>Cargando comentarios...</span>
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                            style={{ background: `${accentColor}10` }}>
                                            <MessageCircle className="w-6 h-6" style={{ color: '#555' }} />
                                        </div>
                                        <p className="text-sm" style={{ color: '#666' }}>
                                            Sé el primero en comentar
                                        </p>
                                    </div>
                                ) : (
                                    comments.map(renderComment)
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            {/* Input at the bottom */}
                            {currentUserId && (
                                <div className="px-5 py-3.5 flex-shrink-0"
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
                                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                        <input
                                            ref={modalInputRef}
                                            type="text"
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Escribe un comentario..."
                                            maxLength={500}
                                            autoFocus
                                            className="flex-1 text-sm rounded-full px-4 py-2.5 outline-none transition-all"
                                            style={{
                                                background: 'rgba(255,255,255,0.06)',
                                                color: '#e8e2d3',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                            }}
                                            onFocus={e => { e.currentTarget.style.borderColor = `${accentColor}50` }}
                                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim() || submitting}
                                            className="p-2.5 rounded-full transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                                            style={{ color: accentColor }}
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style jsx global>{`
                @keyframes cmBackdropIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes cmPostIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.88) translateX(-30px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateX(0);
                    }
                }
                @keyframes cmCommentsIn {
                    0% {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes cmCardUp {
                    0% {
                        opacity: 0;
                        transform: scale(0.92) translateY(24px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes cmFadeInUp {
                    0% {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    )
}
