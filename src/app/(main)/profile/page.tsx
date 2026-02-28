'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LikeButton } from '@/components/ui/like-button'
import { CommentSection } from '@/components/ui/comment-section'
import { UNI_FACULTIES_DATA, CYCLE_LABELS } from '@/lib/uni-courses'
import { formatPrice } from '@/lib/utils'
import {
    Edit2, Save, X, BookOpen, GraduationCap,
    Users, FileText, Calendar, Shield, Heart, TrendingUp, LogOut,
    MessageCircle, Clock, Plus, Eye, EyeOff, Trash2, CheckCircle2, ShieldCheck, DollarSign
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useModal } from '@/components/ui/modal'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types'

const ACCENT = '#6366f1'

interface UserPost {
    id: string
    type: 'OFFER' | 'REQUEST'
    course: string
    topic: string
    description: string | null
    price_or_budget: number | null
    mode: string
    urgency: string | null
    status: string
    created_at: string
    like_count: number
    comment_count: number
    user_has_liked: boolean
}

type PaymentData = {
    id: string
    post_id: string
    mentor_id: string
    amount: number
    yape_code: string
    course: string
    topic: string
    scheduled_day: string | null
    scheduled_start: string | null
    scheduled_end: string | null
    status: 'pending' | 'confirmed' | 'rejected'
    created_at: string
    mentor: { name: string; faculty: string } | null
}

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const { toast } = useToast()
    const { showConfirm } = useModal()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        faculty: '',
        bio: '',
        cycle: '',
        whatsapp: ''
    })
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, likes: 0 })
    const [courseTags, setCourseTags] = useState<string[]>([])
    const [memberSince, setMemberSince] = useState('')

    // Posts state
    const [posts, setPosts] = useState<UserPost[]>([])
    const [postsLoading, setPostsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [payments, setPayments] = useState<PaymentData[]>([])
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
    const [activePanel, setActivePanel] = useState(0)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setLoading(false)
                return
            }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setProfile(data)
                setFormData({
                    name: data.name || '',
                    faculty: data.faculty || '',
                    bio: data.bio || '',
                    cycle: data.cycle?.toString() || '',
                    whatsapp: data.whatsapp || ''
                })
                setMemberSince(
                    new Date(data.created_at).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
                )

                // Fetch stats in parallel
                const [
                    { count: postCount },
                    { count: followerCount },
                    { count: followingCount },
                    { count: likeCount },
                    { data: postsData },
                ] = await Promise.all([
                    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
                    supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', user.id),
                    supabase.from('posts').select('course').eq('user_id', user.id).eq('status', 'active'),
                ])

                setStats({
                    posts: postCount || 0,
                    followers: followerCount || 0,
                    following: followingCount || 0,
                    likes: likeCount || 0,
                })

                if (postsData) {
                    const courses = [...new Set(postsData.map(p => p.course))]
                    setCourseTags(courses)
                }

                // Fetch user's posts with like/comment counts
                await fetchUserPosts(user.id)

                // Fetch user's payments
                const { data: paymentData } = await supabase
                    .from('payments')
                    .select('*, mentor:profiles!payments_mentor_id_fkey(name, faculty)')
                    .eq('student_id', user.id)
                    .order('created_at', { ascending: false })
                if (paymentData) {
                    setPayments(paymentData as unknown as PaymentData[])
                }
            }
            setLoading(false)
        }

        fetchProfile()
    }, [supabase])

    // Realtime subscription for payment status updates
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            channel = supabase
                .channel('profile-payments')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'payments',
                        filter: `student_id=eq.${user.id}`,
                    },
                    (payload) => {
                        // Update the specific payment in state
                        setPayments(prev =>
                            prev.map(p =>
                                p.id === payload.new.id
                                    ? { ...p, status: payload.new.status }
                                    : p
                            )
                        )
                    }
                )
                .subscribe()
        }

        setupRealtime()

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [supabase])

    const fetchUserPosts = async (userId: string) => {
        setPostsLoading(true)

        const { data: rawPosts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error || !rawPosts) {
            setPostsLoading(false)
            return
        }

        // Fetch likes, comments, and user's liked status for each post
        const postsWithCounts: UserPost[] = await Promise.all(
            rawPosts.map(async (post) => {
                const [
                    { count: likesCount },
                    { count: commentsCount },
                    { data: likedData },
                ] = await Promise.all([
                    supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
                    supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
                    supabase.from('post_likes').select('user_id').eq('post_id', post.id).eq('user_id', userId).limit(1),
                ])

                return {
                    ...post,
                    like_count: likesCount || 0,
                    comment_count: commentsCount || 0,
                    user_has_liked: (likedData && likedData.length > 0) || false,
                }
            })
        )

        setPosts(postsWithCounts)
        setPostsLoading(false)
    }

    const toggleStatus = async (postId: string, currentStatus: string) => {
        setActionLoading(postId)
        const newStatus = currentStatus === 'active' ? 'paused' : 'active'
        const { error } = await supabase
            .from('posts')
            .update({ status: newStatus })
            .eq('id', postId)

        if (!error) {
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p))
            setStats(prev => ({
                ...prev,
                posts: newStatus === 'active' ? prev.posts + 1 : prev.posts - 1
            }))
        }
        setActionLoading(null)
    }

    const handleDeletePost = (postId: string, courseName: string) => {
        showConfirm(
            'Eliminar publicación',
            `¿Eliminar la publicación de "${courseName}"? Esta acción no se puede deshacer.`,
            async () => {
                setActionLoading(postId)
                const { error } = await supabase
                    .from('posts')
                    .delete()
                    .eq('id', postId)

                if (!error) {
                    const deletedPost = posts.find(p => p.id === postId)
                    setPosts(prev => prev.filter(p => p.id !== postId))
                    if (deletedPost?.status === 'active') {
                        setStats(prev => ({ ...prev, posts: prev.posts - 1 }))
                    }
                    toast('Publicación eliminada', 'success')
                } else {
                    toast('Error al eliminar', 'error')
                }
                setActionLoading(null)
            },
            true
        )
    }

    const handleSave = async () => {
        if (!profile) return
        setSaving(true)

        const { error } = await supabase
            .from('profiles')
            .update({
                name: formData.name,
                faculty: formData.faculty,
                bio: formData.bio || null,
                cycle: formData.cycle || null,
                whatsapp: formData.whatsapp || null
            })
            .eq('id', profile.id)

        if (error) {
            toast('Error al guardar: ' + error.message, 'error')
        } else {
            setProfile(prev => prev ? { ...prev, ...formData, cycle: formData.cycle || null, whatsapp: formData.whatsapp || null } : null)
            setEditing(false)
            toast('Perfil actualizado', 'success')
        }
        setSaving(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days === 0) return 'Hoy'
        if (days === 1) return 'Ayer'
        if (days < 7) return `Hace ${days} días`
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#242424' }}>
                    <div className="h-36" style={{ background: '#333' }} />
                    <div className="p-6 pt-16 space-y-4">
                        <div className="h-6 w-40 rounded mx-auto" style={{ background: '#333' }} />
                        <div className="h-4 w-28 rounded mx-auto" style={{ background: '#333' }} />
                        <div className="flex justify-center gap-8 mt-4">
                            <div className="h-12 w-20 rounded-xl" style={{ background: '#333' }} />
                            <div className="h-12 w-20 rounded-xl" style={{ background: '#333' }} />
                            <div className="h-12 w-20 rounded-xl" style={{ background: '#333' }} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="text-center py-12">
                <p style={{ color: '#c8c8c8' }}>No se encontró el perfil</p>
            </div>
        )
    }

    const facultyColor = profile.faculty ? (UNI_FACULTIES_DATA[profile.faculty]?.color || '#e8e2d3') : '#e8e2d3'
    const facultyName = profile.faculty ? (UNI_FACULTIES_DATA[profile.faculty]?.name || profile.faculty) : ''

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto px-4 pt-4 md:pt-6">

                {/* Mobile Tab Navigation */}
                <div className="lg:hidden flex mb-5 p-1 rounded-2xl gap-1"
                    style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Perfil', 'Posts', 'Sesiones'].map((label, i) => (
                        <button
                            key={label}
                            onClick={() => setActivePanel(i)}
                            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold uppercase tracking-wider transition-all duration-200"
                            style={{
                                background: activePanel === i ? ACCENT : 'transparent',
                                color: activePanel === i ? '#fff' : 'rgba(255,255,255,0.35)',
                                boxShadow: activePanel === i ? `0 4px 14px ${ACCENT}40` : 'none',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* 3 Panel Grid */}
                <div className="flex gap-7">

                    {/* â•â•â•â•â•â•â•â•â•â•â• PANEL 1 : PERFIL â•â•â•â•â•â•â•â•â•â•â• */}
                    <div
                        className={`${activePanel !== 0 ? 'hidden lg:flex' : 'flex'} flex-col rounded-2xl overflow-hidden w-full lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-24 lg:self-start`}
                        style={{
                            background: '#1c1c1e',
                            border: '1px solid rgba(255,255,255,0.06)',
                            animation: 'pfFadeIn 0.5s ease-out',
                        }}
                    >
                        {/* Gradient Header â€” indigo like home hero */}
                        <div className="h-28 relative flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)' }}>
                            {/* Glow */}
                            <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-20"
                                style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(30px)' }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 20%, #1c1c1e 100%)' }} />

                            <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                                {!editing && (
                                    <button onClick={() => setEditing(true)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all hover:scale-105"
                                        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(10px)' }}>
                                        <Edit2 className="w-2.5 h-2.5" /> Editar
                                    </button>
                                )}
                                <button onClick={handleLogout}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all hover:scale-105"
                                    style={{ background: 'rgba(255,255,255,0.06)', color: '#ef4444', backdropFilter: 'blur(10px)' }}>
                                    <LogOut className="w-2.5 h-2.5" /> Salir
                                </button>
                            </div>
                            {/* Avatar */}
                            <div className="absolute -bottom-11 left-1/2 -translate-x-1/2">
                                <Avatar className="h-[84px] w-[84px] ring-4 shadow-2xl transition-transform duration-200 hover:scale-105"
                                    style={{ '--tw-ring-color': '#1c1c1e' } as React.CSSProperties}>
                                    <AvatarImage src={profile.avatar_url || undefined} />
                                    <AvatarFallback className="text-xl font-bold"
                                        style={{ background: `${ACCENT}15`, color: ACCENT }}>
                                        {profile.name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[2.5px]"
                                    style={{ background: '#22c55e', borderColor: '#1c1c1e' }} />
                            </div>
                        </div>

                        {/* Profile content */}
                        <div className="flex-1 overflow-y-auto px-4 pt-14 pb-5 space-y-4">
                            {/* Name */}
                            <div className="text-center">
                                {editing ? (
                                    <Input value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="text-center text-[15px] font-semibold max-w-[200px] mx-auto rounded-xl h-10"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
                                ) : (
                                    <>
                                        <h1 className="text-lg font-bold text-white">{profile.name}</h1>
                                        {profile.mentor_status === 'approved' && (
                                            <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                                                <ShieldCheck className="w-3 h-3" /> Mentor
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Faculty / Cycle / Since */}
                            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
                                {editing ? (
                                    <select value={formData.faculty}
                                        onChange={(e) => setFormData(prev => ({ ...prev, faculty: e.target.value }))}
                                        className="h-8 px-2 rounded-lg text-[11px]"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}>
                                        {Object.entries(UNI_FACULTIES_DATA).map(([code, info]) => (
                                            <option key={code} value={code} style={{ background: '#1c1c1e', color: '#fff' }}>{info.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                        <GraduationCap className="w-3 h-3" />{facultyName}
                                    </span>
                                )}
                                {editing ? (
                                    <select value={formData.cycle}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cycle: e.target.value }))}
                                        className="h-8 px-2 rounded-lg text-[11px]"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}>
                                        <option value="" style={{ background: '#1c1c1e', color: '#fff' }}>Sin ciclo</option>
                                        {Object.entries(CYCLE_LABELS).map(([n, l]) => (
                                            <option key={n} value={n} style={{ background: '#1c1c1e', color: '#fff' }}>{l}</option>
                                        ))}
                                    </select>
                                ) : profile.cycle ? (
                                    <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                        <BookOpen className="w-3 h-3" />Ciclo {profile.cycle}
                                    </span>
                                ) : null}
                                <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                    <Calendar className="w-3 h-3" />{memberSince}
                                </span>
                            </div>

                            {/* Bio */}
                            {editing ? (
                                <textarea value={formData.bio}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                    placeholder="Cuéntanos sobre ti..."
                                    rows={2} maxLength={200}
                                    className="w-full px-3 py-2 rounded-xl resize-none text-[12px]"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
                            ) : profile.bio ? (
                                <p className="text-[12px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.bio}</p>
                            ) : !editing ? (
                                <p className="text-[11px] text-center italic" style={{ color: 'rgba(255,255,255,0.15)' }}>Sin biografía</p>
                            ) : null}

                            {/* Mentor CTA */}
                            {profile.mentor_status !== 'approved' && !editing && (
                                <div className="p-3 rounded-xl text-center"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="text-[10px] mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>¿Quieres ofrecer enseñanza?</p>
                                    <a href="https://wa.me/51939157495?text=Hola%2C%20quiero%20solicitar%20ser%20mentor%20en%20UNI%20Mentores"
                                        target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                        style={{ background: `${ACCENT}15`, color: ACCENT }}>
                                        Solicitar ser mentor
                                    </a>
                                </div>
                            )}

                            {/* Edit buttons */}
                            {editing && (
                                <div className="flex gap-2">
                                    <Button onClick={handleSave} disabled={saving}
                                        className="flex-1 h-9 rounded-full text-[12px] font-semibold hover:scale-[1.03] transition-all"
                                        style={{ background: ACCENT, color: '#fff', boxShadow: `0 4px 14px ${ACCENT}40` }}>
                                        <Save className="w-3 h-3 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
                                    </Button>
                                    <Button onClick={() => { setEditing(false); setFormData({ name: profile.name || '', faculty: profile.faculty || '', bio: profile.bio || '', cycle: profile.cycle?.toString() || '', whatsapp: profile.whatsapp || '' }) }}
                                        variant="outline" className="h-9 px-4 rounded-full text-[12px]"
                                        style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)' }}>
                                        <X className="w-3 h-3 mr-1" />Cancelar
                                    </Button>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-1.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                {[
                                    { label: 'Posts', value: stats.posts, icon: FileText },
                                    { label: 'Seguidores', value: stats.followers, icon: Users },
                                    { label: 'Siguiendo', value: stats.following, icon: UserFollowing },
                                    { label: 'Likes', value: stats.likes, icon: Heart },
                                ].map(({ label, value, icon: Icon }, i) => (
                                    <div key={i} className="text-center py-2 rounded-lg cursor-default transition-all hover:bg-white/[0.03]"
                                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <p className="text-[15px] font-bold text-white">{value}</p>
                                        <p className="text-[8px] mt-0.5 flex items-center justify-center gap-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                            <Icon className="w-2 h-2" />{label}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Courses */}
                            {courseTags.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-medium mb-2 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                        <BookOpen className="w-3 h-3" />Cursos activos
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {courseTags.map((course, i) => (
                                            <span key={i} className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                                                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                                                {course}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Account Info */}
                            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <p className="text-[10px] font-medium mb-2 flex items-center gap-1 uppercase tracking-wider"
                                    style={{ color: 'rgba(255,255,255,0.2)' }}>
                                    <Shield className="w-3 h-3" />Cuenta
                                </p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Rol</span>
                                        <Badge className="capitalize text-[10px] font-bold uppercase tracking-wider"
                                            style={{ background: `${ACCENT}15`, color: ACCENT }}>
                                            {profile.role}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between py-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Estado</span>
                                        <span className="flex items-center gap-1 text-[11px]" style={{ color: '#4ade80' }}>
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80' }} />Activo
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* â•â•â•â•â•â•â•â•â•â•â• PANEL 2 : PUBLICACIONES â•â•â•â•â•â•â•â•â•â•â• */}
                    <div
                        className={`${activePanel !== 1 ? 'hidden lg:flex' : 'flex'} flex-col flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0`}
                    >
                        {/* Header */}
                        <div className="rounded-2xl mb-4 p-4 relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
                                border: '1px solid rgba(99,102,241,0.15)',
                                animation: 'pfFadeIn 0.5s ease-out 0.1s both',
                            }}>
                            <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-20"
                                style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(30px)' }} />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Publicaciones</h2>
                                    <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{posts.length} publicaciones</p>
                                </div>
                                <Link href="/create"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                                    style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(10px)' }}>
                                    <Plus className="w-3.5 h-3.5" />Nueva
                                </Link>
                            </div>
                        </div>

                        {/* Posts list */}
                        <div className="space-y-3">
                            {postsLoading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="rounded-2xl p-4"
                                        style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            animation: `pfFadeIn 0.5s ease-out ${i * 100}ms both`,
                                        }}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                                <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : posts.length === 0 ? (
                                <div className="text-center py-16 px-6 rounded-2xl"
                                    style={{
                                        background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,0.01) 100%)',
                                        border: '1px solid rgba(99,102,241,0.1)',
                                        animation: 'pfFadeIn 0.5s ease-out',
                                    }}>
                                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                        style={{ background: `${ACCENT}15` }}>
                                        <FileText className="w-7 h-7" style={{ color: ACCENT }} />
                                    </div>
                                    <p className="text-base font-semibold mb-1 text-white">Sin publicaciones</p>
                                    <p className="text-[13px] mb-6 max-w-[280px] mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                        Crea tu primera oferta o solicitud
                                    </p>
                                    <Link href="/create">
                                        <Button className="rounded-full px-6 h-10 text-sm font-semibold"
                                            style={{ background: ACCENT, color: '#fff', boxShadow: `0 4px 14px ${ACCENT}40` }}>
                                            Crear publicación
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                posts.map((post, idx) => (
                                    <article key={post.id}
                                        className="rounded-2xl overflow-hidden transition-all duration-300 group/card cursor-pointer"
                                        style={{
                                            background: '#1c1c1e',
                                            border: `1px solid ${expandedPostId === post.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                            opacity: post.status !== 'active' ? 0.5 : 1,
                                            animation: `pfCardIn 0.45s ease-out ${Math.min(idx * 60, 360)}ms both`,
                                        }}
                                        onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                                        onMouseEnter={(e) => {
                                            if (expandedPostId !== post.id) {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                                e.currentTarget.style.transform = 'translateY(-1px)'
                                                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (expandedPostId !== post.id) {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                                                e.currentTarget.style.transform = 'translateY(0)'
                                                e.currentTarget.style.boxShadow = 'none'
                                            }
                                        }}
                                    >
                                        {/* Post header */}
                                        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: post.type === 'OFFER' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                                                }}>
                                                {post.type === 'OFFER'
                                                    ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} />
                                                    : <MessageCircle className="w-5 h-5" style={{ color: '#fbbf24' }} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-[13px] font-semibold truncate text-white">{post.course}</h3>
                                                    <span className="text-[10px] px-2 py-[2px] rounded-full font-bold uppercase tracking-wider"
                                                        style={{
                                                            background: post.type === 'OFFER' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                                                            color: post.type === 'OFFER' ? '#4ade80' : '#fbbf24',
                                                        }}>
                                                        {post.type === 'OFFER' ? 'Ofrece' : 'Busca'}
                                                    </span>
                                                    {post.status !== 'active' && (
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full font-bold uppercase tracking-wider"
                                                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                                                            Pausada
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{post.topic}</span>
                                                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
                                                    <span className="text-[11px] flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                        <Clock className="w-2.5 h-2.5" />{formatDate(post.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {post.price_or_budget ? (
                                                    <span className="text-[13px] font-bold px-3 py-1 rounded-full"
                                                        style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                                                        {formatPrice(post.price_or_budget)}
                                                    </span>
                                                ) : null}
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                                                    className="transition-transform duration-200"
                                                    style={{ transform: expandedPostId === post.id ? 'rotate(180deg)' : 'rotate(0)', color: 'rgba(255,255,255,0.2)' }}>
                                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Expanded content */}
                                        {expandedPostId === post.id && (
                                            <div className="px-4 pb-3">
                                                <div className="rounded-xl p-3.5 space-y-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {post.description && (
                                                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{post.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                        <span className="capitalize">{post.mode}</span>
                                                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                                        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{post.like_count}</span>
                                                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                                        <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{post.comment_count}</span>
                                                    </div>
                                                    {/* Actions */}
                                                    <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <LikeButton postId={post.id} initialCount={post.like_count} initialLiked={post.user_has_liked} color={ACCENT} />
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={(e) => { e.stopPropagation(); toggleStatus(post.id, post.status) }}
                                                                disabled={actionLoading === post.id}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                                                                title={post.status === 'active' ? 'Pausar' : 'Activar'}>
                                                                {post.status === 'active'
                                                                    ? <EyeOff className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                                                                    : <Eye className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />}
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id, post.course) }}
                                                                disabled={actionLoading === post.id}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                                                                title="Eliminar">
                                                                <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <CommentSection postId={post.id} postOwnerId={profile.id} initialCount={post.comment_count} accentColor={ACCENT}
                                                        postData={{
                                                            type: post.type, course: post.course, topic: post.topic, description: post.description,
                                                            price_or_budget: post.price_or_budget, created_at: post.created_at,
                                                            author: { name: profile.name, avatar_url: profile.avatar_url, faculty: profile.faculty }
                                                        }} />
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                ))
                            )}
                        </div>
                    </div>

                    {/* â•â•â•â•â•â•â•â•â•â•â• PANEL 3 : SESIONES â•â•â•â•â•â•â•â•â•â•â• */}
                    <div
                        className={`${activePanel !== 2 ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-24 lg:self-start`}
                    >
                        {/* Session header */}
                        <div className="rounded-2xl p-4 mb-4"
                            style={{
                                background: '#1c1c1e',
                                border: '1px solid rgba(255,255,255,0.06)',
                                animation: 'pfFadeIn 0.5s ease-out 0.2s both',
                            }}>
                            <h2 className="text-[13px] font-bold text-white">Sesiones</h2>
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {payments.length} {payments.length === 1 ? 'sesión contratada' : 'sesiones contratadas'}
                            </p>
                        </div>

                        {/* Payments list */}
                        <div className="rounded-2xl overflow-hidden"
                            style={{
                                background: '#1c1c1e',
                                border: '1px solid rgba(255,255,255,0.06)',
                                animation: 'pfFadeIn 0.5s ease-out 0.3s both',
                            }}>
                            {payments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-5">
                                    <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center"
                                        style={{ background: `${ACCENT}15` }}>
                                        <DollarSign className="w-6 h-6" style={{ color: ACCENT }} />
                                    </div>
                                    <p className="text-[13px] font-semibold text-white">Sin sesiones</p>
                                    <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Aquí verás tus sesiones contratadas</p>
                                </div>
                            ) : (
                                <div>
                                    {payments.map((payment, idx) => {
                                        const statusMap: Record<string, { color: string; label: string }> = {
                                            confirmed: { color: '#4ade80', label: 'Confirmado' },
                                            rejected: { color: '#ef4444', label: 'Rechazado' },
                                            pending: { color: '#eab308', label: 'Pendiente' },
                                        }
                                        const st = statusMap[payment.status] || statusMap.pending
                                        return (
                                            <div key={payment.id}
                                                className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/[0.02]"
                                                style={{ borderBottom: idx < payments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
                                                    {payment.status === 'pending' && (
                                                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: st.color, opacity: 0.4 }} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-semibold truncate text-white">{payment.course}</p>
                                                    <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                        <span className="truncate">{payment.mentor?.name || 'Mentor'}</span>
                                                        {payment.scheduled_day && (
                                                            <>
                                                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                                                <span>{payment.scheduled_day} {payment.scheduled_start}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-[12px] font-bold tabular-nums" style={{ color: ACCENT }}>
                                                        S/{payment.amount.toFixed(2)}
                                                    </span>
                                                    <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: st.color }}>
                                                        {st.label}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Animations â€” same style as home page */}
            <style jsx global>{`
                @keyframes pfFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes pfCardIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}

function UserFollowing(props: React.SVGProps<SVGSVGElement>) {
    return <TrendingUp {...props} />
}
