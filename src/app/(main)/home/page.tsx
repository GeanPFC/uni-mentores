'use client'

import { useEffect, useState, useCallback, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LikeButton } from '@/components/ui/like-button'
import { CommentSection } from '@/components/ui/comment-section'
import { FollowButton } from '@/components/ui/follow-button'
import { ShareButton } from '@/components/ui/share-button'
import { ActivityFeed } from '@/components/ui/activity-feed'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
// HIDDEN FOR DEPLOYMENT: import { ContactButton } from '@/components/ContactButton'
import {
    Clock, Sparkles, Users, Plus, Loader2, ArrowUp,
    MessageCircle, TrendingUp, Zap, BookOpen, PenSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PostWithAuthor } from '@/types'

/* ━━━ Color palette ━━━ */
const ACCENT = '#6366f1'   // indigo-500 — vibrant but professional

/* Unique colors for demo avatar fallbacks */
const AVATAR_COLORS = [
    '#f43f5e', '#ec4899', '#8b5cf6', '#6366f1',
    '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e',
    '#eab308', '#f97316',
]

/* ━━━━━━━━━━━━━━ Types ━━━━━━━━━━━━━━ */
type FeedPost = PostWithAuthor & { comment_count?: number; is_following_author?: boolean }
type ActiveUser = { id: string; name: string; avatar_url: string | null; faculty: string }

const PAGE_SIZE = 15

export default function HomePage() {
    const supabase = createClient()
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [userAvatar, setUserAvatar] = useState<string | null>(null)
    const [userFaculty, setUserFaculty] = useState<string | null>(null)
    const [followingIds, setFollowingIds] = useState<string[]>([])
    const [followingCount, setFollowingCount] = useState(0)
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
    const [newPostCount, setNewPostCount] = useState(0)
    const [activeFilter, setActiveFilter] = useState<'all' | 'following' | 'offers' | 'requests'>('all')
    const [, startTransition] = useTransition()
    const latestPostTime = useRef<string | null>(null)
    const paginationCursor = useRef<string | null>(null)

    /* ━━━ Fetch feed ━━━ */
    const fetchFeed = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setCurrentUserId(user.id)

        const [profileRes, followRes, postsRes, activeRes] = await Promise.all([
            supabase.from('profiles').select('name, avatar_url, faculty').eq('id', user.id).single(),
            supabase.from('follows').select('following_id').eq('follower_id', user.id),
            supabase
                .from('posts')
                .select(`*, author:profiles!posts_user_id_fkey (id, name, avatar_url, faculty), post_likes (user_id), post_comments (id)`)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE),
            supabase
                .from('profiles')
                .select('id, name, avatar_url, faculty')
                .neq('id', user.id)
                .order('last_seen', { ascending: false })
                .limit(30),
        ])

        const faculty = profileRes.data?.faculty || null
        setUserFaculty(faculty)
        setUserName(profileRes.data?.name || '')
        setUserAvatar(profileRes.data?.avatar_url || null)

        const fIds = followRes.data?.map(f => f.following_id) || []
        setFollowingIds(fIds)
        setFollowingCount(fIds.length)

        if (activeRes.data) {
            let facultyUsers = activeRes.data
                .filter(u => u.faculty === faculty)
                .slice(0, 12)
            if (facultyUsers.length === 0) {
                const demoNames = ['Carlos', 'María', 'Jorge', 'Lucía', 'Diego', 'Valentina', 'Andrés', 'Camila', 'Ricardo', 'Sofía']
                facultyUsers = demoNames.map((name, i) => ({ id: `demo-${i}`, name, avatar_url: null, faculty: faculty || 'FIEE' }))
            }
            setActiveUsers(facultyUsers)
        }

        if (!postsRes.error && postsRes.data) {
            const followingSet = new Set(fIds)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const feedPosts = postsRes.data.map((p: any) => {
                const { post_likes, post_comments, ...rest } = p
                const likes = Array.isArray(post_likes) ? post_likes : []
                const comments = Array.isArray(post_comments) ? post_comments : []
                return { ...rest, like_count: likes.length, user_has_liked: likes.some((l: { user_id: string }) => l.user_id === user.id), comment_count: comments.length, is_following_author: followingSet.has(rest.user_id) }
            }).filter((p: FeedPost) => fIds.includes(p.user_id) || p.author?.faculty === faculty) as FeedPost[]
            setPosts(feedPosts)
            setHasMore(postsRes.data.length === PAGE_SIZE)
            if (feedPosts.length > 0) latestPostTime.current = feedPosts[0].created_at
            if (postsRes.data.length > 0) {
                paginationCursor.current = postsRes.data[postsRes.data.length - 1].created_at
            }
        }
        setLoading(false)
    }, [supabase])

    /* ━━━ Load more ━━━ */
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || !paginationCursor.current) return
        setLoadingMore(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoadingMore(false); return }
        const { data, error } = await supabase
            .from('posts')
            .select(`*, author:profiles!posts_user_id_fkey (id, name, avatar_url, faculty), post_likes (user_id), post_comments (id)`)
            .eq('status', 'active').lt('created_at', paginationCursor.current)
            .order('created_at', { ascending: false }).limit(PAGE_SIZE)
        if (!error && data) {
            if (data.length > 0) {
                paginationCursor.current = data[data.length - 1].created_at
            }
            setHasMore(data.length === PAGE_SIZE)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newPosts = data.map((p: any) => {
                const { post_likes, post_comments, ...rest } = p
                const likes = Array.isArray(post_likes) ? post_likes : []
                const comments = Array.isArray(post_comments) ? post_comments : []
                return { ...rest, like_count: likes.length, user_has_liked: likes.some((l: { user_id: string }) => l.user_id === user.id), comment_count: comments.length, is_following_author: new Set(followingIds).has(rest.user_id) }
            }).filter((p: FeedPost) => followingIds.includes(p.user_id) || p.author?.faculty === userFaculty) as FeedPost[]
            if (newPosts.length > 0) {
                startTransition(() => setPosts(prev => [...prev, ...newPosts]))
            }
        } else {
            setHasMore(false)
        }
        setLoadingMore(false)
    }, [loadingMore, hasMore, supabase, followingIds, userFaculty, startTransition])

    useEffect(() => { fetchFeed() }, [fetchFeed])

    /* ━━━ Realtime ━━━ */
    useEffect(() => {
        if (!currentUserId) return
        const channel = supabase.channel('home-feed-new-posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                if (payload.new.status === 'active' && payload.new.user_id !== currentUserId) setNewPostCount(prev => prev + 1)
            }).subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [currentUserId, supabase])

    const refreshFeed = async () => { setNewPostCount(0); await fetchFeed(); window.scrollTo({ top: 0, behavior: 'smooth' }) }

    /* ━━━ Filter ━━━ */
    const filteredPosts = posts.filter(p => {
        if (activeFilter === 'following') return followingIds.includes(p.user_id)
        if (activeFilter === 'offers') return p.type === 'OFFER'
        if (activeFilter === 'requests') return p.type === 'REQUEST'
        return true
    })

    /* ━━━ Helpers ━━━ */
    const formatDate = (date: string) => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'ahora'
        if (mins < 60) return `${mins}m`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d`
        return new Date(date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Buenos días'
        if (hour < 18) return 'Buenas tardes'
        return 'Buenas noches'
    }

    /* ━━━ RENDER ━━━ */
    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto px-4 pt-4 md:pt-6">
                <div className="flex gap-7">

                    {/* ══════════ MAIN FEED ══════════ */}
                    <div className="flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0">

                        {/* ─── Hero greeting panel ─── */}
                        <div className="rounded-2xl mb-5 p-5 relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
                                border: '1px solid rgba(99,102,241,0.15)',
                                animation: 'hfFadeIn 0.5s ease-out',
                            }}>
                            {/* Subtle glow */}
                            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20"
                                style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(40px)' }} />
                            <div className="relative z-10">
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                                    {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''} 👋
                                </h1>
                                <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {followingCount > 0
                                        ? `${followingCount} seguidos · ${userFaculty || 'Tu facultad'}`
                                        : userFaculty || 'Explora y conecta con tu comunidad'
                                    }
                                </p>
                            </div>

                            {/* Quick action buttons */}
                            <div className="relative z-10 flex gap-2 mt-4">
                                <Link href="/create"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                                    style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(10px)' }}>
                                    <PenSquare className="w-3.5 h-3.5" /> Publicar
                                </Link>
                                <Link href="/explore"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                                    <BookOpen className="w-3.5 h-3.5" /> Explorar
                                </Link>
                            </div>
                        </div>

                        {/* ─── Stories / Active Users ─── */}
                        {activeUsers.length > 0 && (
                            <div className="mb-5 -mx-4" style={{ animation: 'hfFadeIn 0.4s ease-out 0.1s both' }}>
                                <div className="flex gap-3 overflow-x-auto pb-2 px-4" style={{ scrollbarWidth: 'none' }}>
                                    {/* My story */}
                                    <Link href="/create" className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                                        <div className="relative">
                                            <div className="h-14 w-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                                                style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
                                                <Avatar className="h-[46px] w-[46px]">
                                                    <AvatarImage src={userAvatar || undefined} />
                                                    <AvatarFallback className="text-sm font-bold"
                                                        style={{ background: '#1e1b4b', color: ACCENT }}>
                                                        {userName?.charAt(0) || '+'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                                                style={{ background: ACCENT, boxShadow: '0 0 0 2px #1a1a1a' }}>
                                                <Plus className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Tú</span>
                                    </Link>

                                    {/* Other users — each with unique color */}
                                    {activeUsers.map((u, i) => (
                                        <Link key={u.id} href={`/profile/${u.id}`}
                                            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                                            style={{ animation: `hfScaleIn 0.3s ease-out ${60 + i * 30}ms both` }}>
                                            <div className="relative">
                                                <div className="p-[2px] rounded-full transition-transform duration-200 group-hover:scale-105"
                                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #a78bfa)` }}>
                                                    <Avatar className="h-[50px] w-[50px] ring-2 ring-[#1a1a1a]">
                                                        <AvatarImage src={u.avatar_url || undefined} />
                                                        <AvatarFallback className="text-lg font-bold"
                                                            style={{ background: '#1e1b4b', color: '#fff' }}>
                                                            {u.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                                                    style={{ background: '#22c55e', boxShadow: '0 0 0 2px #1a1a1a' }} />
                                            </div>
                                            <span className="text-[10px] max-w-[48px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                {u.name?.split(' ')[0]}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── Filter tabs ─── */}
                        <div className="flex gap-2 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none', animation: 'hfFadeIn 0.4s ease-out 0.15s both' }}>
                            {([
                                { key: 'all', label: 'Para ti', icon: Sparkles },
                                { key: 'following', label: 'Siguiendo', icon: Users },
                                { key: 'offers', label: 'Ofertas', icon: TrendingUp },
                                { key: 'requests', label: 'Solicitudes', icon: Zap },
                            ] as const).map(tab => {
                                const isActive = activeFilter === tab.key
                                const TabIcon = tab.icon
                                return (
                                    <button key={tab.key}
                                        onClick={() => setActiveFilter(tab.key)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
                                        style={{
                                            background: isActive ? ACCENT : 'rgba(255,255,255,0.04)',
                                            color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                                            border: isActive ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                            boxShadow: isActive ? `0 4px 14px ${ACCENT}40` : 'none',
                                        }}>
                                        <TabIcon className="w-3 h-3" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* ─── New posts banner ─── */}
                        {newPostCount > 0 && (
                            <button onClick={refreshFeed}
                                className="w-full mb-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                                style={{
                                    background: `${ACCENT}18`,
                                    color: ACCENT,
                                    border: `1px solid ${ACCENT}30`,
                                    animation: 'hfSlideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}>
                                <ArrowUp className="w-3.5 h-3.5" />
                                {newPostCount} {newPostCount === 1 ? 'nuevo post' : 'nuevos posts'}
                            </button>
                        )}

                        {/* ─── FEED CONTENT ─── */}
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', animation: `hfFadeIn 0.5s ease-out ${i * 100}ms both` }}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                                <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                            <div className="h-3 w-full rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.025)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                        ) : filteredPosts.length === 0 ? (
                            /* Empty state */
                            <div className="text-center py-16 px-6 rounded-2xl"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,0.01) 100%)',
                                    border: '1px solid rgba(99,102,241,0.1)',
                                    animation: 'hfFadeIn 0.5s ease-out',
                                }}>
                                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                    style={{ background: `${ACCENT}15` }}>
                                    {activeFilter !== 'all'
                                        ? <MessageCircle className="w-7 h-7" style={{ color: ACCENT }} />
                                        : <Users className="w-7 h-7" style={{ color: ACCENT }} />}
                                </div>
                                <p className="text-base font-semibold mb-1 text-white">
                                    {activeFilter !== 'all' ? 'Sin resultados' : 'Tu feed está vacío'}
                                </p>
                                <p className="text-[13px] mb-6 max-w-[280px] mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    {activeFilter !== 'all'
                                        ? 'No hay posts para este filtro. Prueba con otro.'
                                        : 'Sigue a mentores desde Explorar para llenar tu feed'
                                    }
                                </p>
                                {activeFilter !== 'all' ? (
                                    <button onClick={() => setActiveFilter('all')}
                                        className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                                        style={{ background: `${ACCENT}18`, color: ACCENT }}>
                                        Ver todos
                                    </button>
                                ) : (
                                    <div className="flex gap-3 justify-center">
                                        <Link href="/explore">
                                            <Button className="rounded-full px-6 h-10 text-sm font-semibold"
                                                style={{ background: ACCENT, color: '#fff', boxShadow: `0 4px 14px ${ACCENT}40` }}>
                                                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Explorar
                                            </Button>
                                        </Link>
                                        <Link href="/create">
                                            <Button className="rounded-full px-6 h-10 text-sm font-semibold"
                                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Publicar
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                        ) : (
                            /* ─── Post cards ─── */
                            <div className="space-y-3">
                                {filteredPosts.map((post, idx) => (
                                    <article key={post.id}
                                        className="rounded-2xl overflow-hidden transition-all duration-300 group/card"
                                        style={{
                                            background: '#1c1c1e',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            animation: `hfCardIn 0.45s ease-out ${Math.min(idx * 60, 360)}ms both`,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }}
                                    >
                                        {/* Author row */}
                                        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                                            <Link href={`/profile/${post.user_id}`} className="flex-shrink-0 group/avatar">
                                                <Avatar className="h-10 w-10 transition-transform duration-200 group-hover/avatar:scale-105">
                                                    <AvatarImage src={post.author?.avatar_url || undefined} />
                                                    <AvatarFallback className="text-sm font-bold"
                                                        style={{ background: `${ACCENT}15`, color: ACCENT }}>
                                                        {post.author?.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </Link>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/profile/${post.user_id}`}
                                                        className="text-[13px] font-semibold truncate hover:underline underline-offset-2"
                                                        style={{ color: '#fff' }}>
                                                        {post.author?.name}
                                                    </Link>
                                                    <span className="text-[10px] px-2 py-[2px] rounded-full font-bold uppercase tracking-wider"
                                                        style={{
                                                            background: post.type === 'OFFER' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                                                            color: post.type === 'OFFER' ? '#4ade80' : '#fbbf24',
                                                        }}>
                                                        {post.type === 'OFFER' ? 'Ofrece' : 'Busca'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{post.author?.faculty}</span>
                                                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
                                                    <span className="text-[11px] flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatDate(post.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {currentUserId && post.user_id !== currentUserId && (
                                                <FollowButton
                                                    targetUserId={post.user_id}
                                                    initialFollowing={post.is_following_author || false}
                                                    accentColor={ACCENT}
                                                    onFollowChange={(following) => {
                                                        setPosts(prev => prev.map(p =>
                                                            p.user_id === post.user_id
                                                                ? { ...p, is_following_author: following }
                                                                : p
                                                        ))
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="px-4 py-2">
                                            <h3 className="text-[15px] font-semibold leading-snug mb-1 text-white">
                                                {post.course}
                                            </h3>
                                            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                                {post.topic}
                                            </p>
                                            {post.description && (
                                                <p className="text-[13px] mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                    {post.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Tags */}
                                        {post.tags && post.tags.length > 0 && (
                                            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                                {post.tags.slice(0, 4).map((tag, i) => (
                                                    <span key={i} className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                                                        {tag}
                                                    </span>
                                                ))}
                                                {post.tags.length > 4 && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                                        +{post.tags.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions bar */}
                                        <div className="px-4 py-2.5 mt-1 flex items-center justify-between"
                                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="flex items-center gap-1">
                                                {post.type === 'OFFER' && (
                                                    <LikeButton postId={post.id} initialCount={post.like_count} initialLiked={post.user_has_liked} color={ACCENT} />
                                                )}
                                                <ShareButton postId={post.id} course={post.course} topic={post.topic} />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {post.price_or_budget ? (
                                                    <span className="text-[13px] font-bold px-3 py-1 rounded-full"
                                                        style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                                                        {formatPrice(post.price_or_budget)}
                                                    </span>
                                                ) : post.type === 'OFFER' && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                                                        style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                                                        Gratis
                                                    </span>
                                                )}
                                                {/* HIDDEN FOR DEPLOYMENT
                                                <ContactButton userId={post.user_id} postId={post.id} size="sm"
                                                    className="h-8 px-4 rounded-full flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
                                                    style={{ background: ACCENT, color: '#fff', boxShadow: `0 2px 8px ${ACCENT}30` }} />
                                                */}
                                            </div>
                                        </div>

                                        {/* Comments */}
                                        <div className="px-4 pb-3">
                                            <CommentSection
                                                postId={post.id}
                                                postOwnerId={post.user_id}
                                                initialCount={post.comment_count || 0}
                                                accentColor={ACCENT}
                                                postData={{
                                                    type: post.type, course: post.course, topic: post.topic,
                                                    description: post.description, price_or_budget: post.price_or_budget,
                                                    created_at: post.created_at, author: post.author,
                                                }}
                                            />
                                        </div>
                                    </article>
                                ))}

                                {/* Load more */}
                                <div className="py-6 flex items-center justify-center">
                                    {hasMore ? (
                                        <button
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60"
                                            style={{
                                                background: 'rgba(255,255,255,0.06)',
                                                color: 'rgba(255,255,255,0.5)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            {loadingMore ? (
                                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...</>
                                            ) : (
                                                <>Cargar más</>
                                            )}
                                        </button>
                                    ) : filteredPosts.length > 3 ? (
                                        <div className="flex flex-col items-center gap-2 py-4">
                                            <Sparkles className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} />
                                            <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                                Estás al día
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ══════════ SIDEBAR ══════════ */}
                    <aside className="hidden lg:block w-[280px] flex-shrink-0 sticky top-24 self-start space-y-4"
                        style={{ animation: 'hfFadeIn 0.5s ease-out 0.3s both' }}>
                        <ActivityFeed />
                    </aside>
                </div>
            </div>

            {/* Activity Feed — Mobile */}
            <div className="lg:hidden px-4 mt-6">
                <ActivityFeed />
            </div>

            {/* ━━━ Animations ━━━ */}
            <style jsx global>{`
                @keyframes hfFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes hfScaleIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes hfCardIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes hfSlideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes hfPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%      { opacity: 0.6; transform: scale(0.85); }
                }
            `}</style>
        </div>
    )
}
