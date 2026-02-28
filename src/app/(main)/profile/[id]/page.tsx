'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LikeButton } from '@/components/ui/like-button'
import { CommentSection } from '@/components/ui/comment-section'
import { FollowButton } from '@/components/ui/follow-button'
import { ShareButton } from '@/components/ui/share-button'
// HIDDEN FOR DEPLOYMENT: import { ContactButton } from '@/components/ContactButton'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { UNI_FACULTIES_DATA } from '@/lib/uni-courses'
import {
    ArrowLeft, Calendar, GraduationCap, BookOpen,
    MapPin, Clock, Users, UserPlus, FileText, Phone, ShieldCheck, DollarSign
} from 'lucide-react'

interface ProfileData {
    id: string
    name: string
    email: string
    avatar_url: string | null
    faculty: string | null
    bio: string | null
    cycle: string | null
    created_at: string
    mentor_status: 'none' | 'approved'
    role: string
    whatsapp: string | null
}

interface PostData {
    id: string
    type: 'OFFER' | 'REQUEST'
    course: string
    topic: string
    description: string | null
    price_or_budget: number | null
    tags: string[] | null
    created_at: string
    user_id: string
    like_count: number
    user_has_liked: boolean
    comment_count: number
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

export default function UserProfilePage() {
    const params = useParams()
    const userId = params.id as string
    const supabase = createClient()

    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [posts, setPosts] = useState<PostData[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 })
    const [courseTags, setCourseTags] = useState<string[]>([])
    const [viewerRole, setViewerRole] = useState<string>('user')
    const [viewerMentorStatus, setViewerMentorStatus] = useState<string>('none')
    const [payments, setPayments] = useState<PaymentData[]>([])

    useEffect(() => {
        if (userId) fetchUserData()
    }, [userId])

    const fetchUserData = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id || null)

        // Fetch viewer's own profile for visibility rules
        if (user) {
            const { data: viewerProfile } = await supabase
                .from('profiles')
                .select('role, mentor_status')
                .eq('id', user.id)
                .single()
            if (viewerProfile) {
                setViewerRole(viewerProfile.role)
                setViewerMentorStatus(viewerProfile.mentor_status || 'none')
            }
        }

        // Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (profileData) setProfile(profileData)

        // Posts with likes + comments
        const { data: postsData } = await supabase
            .from('posts')
            .select(`*, post_likes (user_id), post_comments (id)`)
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)

        if (postsData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const processed = postsData.map((p: any) => {
                const { post_likes, post_comments, ...rest } = p
                const likes = Array.isArray(post_likes) ? post_likes : []
                const comments = Array.isArray(post_comments) ? post_comments : []
                return {
                    ...rest,
                    like_count: likes.length,
                    user_has_liked: likes.some((l: { user_id: string }) => l.user_id === user?.id),
                    comment_count: comments.length,
                }
            })
            setPosts(processed)

            // Extract unique courses as tags
            const courses = [...new Set(postsData.map(p => p.course))]
            setCourseTags(courses)
        }

        // Stats: post count
        const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active')

        // Followers
        const { count: followerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId)

        // Following
        const { count: followingCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId)

        setStats({
            posts: postCount || 0,
            followers: followerCount || 0,
            following: followingCount || 0,
        })

        // Check if I follow this user
        if (user && user.id !== userId) {
            const { data: followCheck } = await supabase
                .from('follows')
                .select('follower_id')
                .eq('follower_id', user.id)
                .eq('following_id', userId)
                .maybeSingle()

            setIsFollowing(!!followCheck)
        }

        // Fetch payments if viewing own profile
        if (user && user.id === userId) {
            const { data: paymentData } = await supabase
                .from('payments')
                .select('*, mentor:profiles!payments_mentor_id_fkey(name, faculty)')
                .eq('student_id', userId)
                .order('created_at', { ascending: false })
            if (paymentData) {
                setPayments(paymentData as unknown as PaymentData[])
            }
        }

        setLoading(false)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    }

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'ahora'
        if (mins < 60) return `hace ${mins}m`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `hace ${hrs}h`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `hace ${days}d`
        return new Date(date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    }

    const facultyColor = profile?.faculty ? (UNI_FACULTIES_DATA[profile.faculty]?.color || '#e8e2d3') : '#e8e2d3'
    const facultyName = profile?.faculty ? (UNI_FACULTIES_DATA[profile.faculty]?.name || profile.faculty) : ''

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#242424' }}>
                    <div className="h-28" style={{ background: '#333' }} />
                    <div className="p-6 pt-14 space-y-4">
                        <div className="h-6 w-40 rounded" style={{ background: '#333' }} />
                        <div className="h-4 w-28 rounded" style={{ background: '#333' }} />
                        <div className="flex gap-8 mt-4">
                            <div className="h-4 w-16 rounded" style={{ background: '#333' }} />
                            <div className="h-4 w-16 rounded" style={{ background: '#333' }} />
                            <div className="h-4 w-16 rounded" style={{ background: '#333' }} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="text-center py-16">
                <h1 className="text-2xl font-serif mb-4" style={{ color: '#e8e2d3' }}>
                    Usuario no encontrado
                </h1>
                <Link href="/explore">
                    <Button variant="outline" className="rounded-full" style={{ borderColor: '#e8e2d3', color: '#e8e2d3' }}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a explorar
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Back */}
            <Link href="/explore" className="inline-flex items-center gap-2 text-sm hover:underline transition-colors" style={{ color: '#888' }}>
                <ArrowLeft className="w-4 h-4" />
                Volver
            </Link>

            {/* Profile Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Gradient Header */}
                <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${facultyColor} 0%, ${facultyColor}66 50%, #242424 100%)` }}>
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #242424 100%)' }} />
                    <div className="absolute -bottom-12 left-6">
                        <Avatar className="h-24 w-24 ring-4 shadow-xl" style={{ '--tw-ring-color': '#242424' } as React.CSSProperties}>
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback style={{ background: facultyColor, color: '#fff' }} className="text-3xl font-bold">
                                {profile.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                {/* Actions row */}
                <div className="flex justify-end gap-2 pt-3 px-6">
                    {currentUserId && currentUserId !== userId && (
                        <>
                            <FollowButton
                                targetUserId={userId}
                                initialFollowing={isFollowing}
                                accentColor={facultyColor}
                            />
                            {/* HIDDEN FOR DEPLOYMENT
                            <ContactButton
                                userId={userId}
                                className="rounded-full px-4 h-9 text-sm font-medium"
                                style={{ background: `${facultyColor}20`, color: facultyColor }}
                            />
                            */}
                        </>
                    )}
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6 pt-10">
                    <h1 className="text-2xl font-serif font-semibold" style={{ color: '#e8e2d3' }}>
                        {profile.name}
                    </h1>

                    {/* Faculty & Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        {profile.faculty && (
                            <span className="flex items-center gap-1 text-sm" style={{ color: facultyColor }}>
                                <GraduationCap className="w-3.5 h-3.5" />
                                {facultyName}
                            </span>
                        )}
                        {profile.cycle && (
                            <span className="flex items-center gap-1 text-sm" style={{ color: '#888' }}>
                                <BookOpen className="w-3.5 h-3.5" />
                                Ciclo {profile.cycle}
                            </span>
                        )}
                        <span className="flex items-center gap-1 text-sm" style={{ color: '#666' }}>
                            <Calendar className="w-3.5 h-3.5" />
                            Desde {formatDate(profile.created_at)}
                        </span>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#c8c8c8' }}>
                            {profile.bio}
                        </p>
                    )}

                    {/* Mentor Badge */}
                    {profile.mentor_status === 'approved' && (
                        <div className="flex items-center justify-center mt-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Mentor Verificado
                            </span>
                        </div>
                    )}

                    {/* WhatsApp — visibility rules */}
                    {(() => {
                        const viewedIsPublic = profile.mentor_status === 'approved' || profile.role === 'admin'
                        const viewerCanSeeAll = viewerRole === 'admin' || viewerMentorStatus === 'approved'
                        const canSeeWhatsapp = profile.whatsapp && (viewedIsPublic || viewerCanSeeAll)

                        return canSeeWhatsapp ? (
                            <div className="flex items-center justify-center mt-3">
                                <a
                                    href={`https://wa.me/51${profile.whatsapp}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                    style={{ background: 'rgba(37, 211, 102, 0.12)', color: '#25D366' }}
                                >
                                    <Phone className="w-3 h-3" />
                                    +51 {profile.whatsapp}
                                </a>
                            </div>
                        ) : null
                    })()}

                    {/* Stats Bar */}
                    <div className="flex gap-6 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="text-center">
                            <p className="text-lg font-bold" style={{ color: '#e8e2d3' }}>{stats.posts}</p>
                            <p className="text-xs" style={{ color: '#888' }}>Publicaciones</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold" style={{ color: '#e8e2d3' }}>{stats.followers}</p>
                            <p className="text-xs" style={{ color: '#888' }}>Seguidores</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold" style={{ color: '#e8e2d3' }}>{stats.following}</p>
                            <p className="text-xs" style={{ color: '#888' }}>Siguiendo</p>
                        </div>
                    </div>

                    {/* Courses Tags */}
                    {courseTags.length > 0 && (
                        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-xs font-medium mb-2" style={{ color: '#888' }}>Cursos</p>
                            <div className="flex flex-wrap gap-1.5">
                                {courseTags.map((course, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                                        style={{ background: `${facultyColor}15`, color: `${facultyColor}`, border: `1px solid ${facultyColor}30` }}>
                                        {course}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Posts Section */}
            {posts.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-serif font-medium flex items-center gap-2" style={{ color: '#e8e2d3' }}>
                        <FileText className="w-4 h-4" />
                        Publicaciones
                    </h2>
                    <div className="space-y-3">
                        {posts.map((post) => (
                            <div key={post.id} className="rounded-2xl p-5 transition-all duration-300"
                                style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {/* Post Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{
                                                background: post.type === 'OFFER' ? 'rgba(107,124,63,0.15)' : 'rgba(139,105,20,0.15)',
                                                color: post.type === 'OFFER' ? '#a3b86c' : '#d4a524',
                                            }}>
                                            {post.type === 'OFFER' ? 'Ofrezco' : 'Necesito'}
                                        </span>
                                        {post.price_or_budget && (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                                                style={{ background: 'rgba(232,226,211,0.08)', color: '#e8e2d3' }}>
                                                {formatPrice(post.price_or_budget)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] flex items-center gap-1" style={{ color: '#666' }}>
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatTimeAgo(post.created_at)}
                                    </span>
                                </div>

                                {/* Content */}
                                <h3 className="font-serif text-base leading-tight mb-1" style={{ color: '#e8e2d3' }}>
                                    {post.course}
                                </h3>
                                <p className="text-sm" style={{ color: '#999' }}>{post.topic}</p>
                                {post.description && (
                                    <p className="text-sm mt-1.5 line-clamp-2" style={{ color: '#777' }}>
                                        {post.description}
                                    </p>
                                )}

                                {/* Tags */}
                                {post.tags && post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {post.tags.map((tag, i) => (
                                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full"
                                                style={{ background: `${facultyColor}10`, color: `${facultyColor}bb` }}>
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-3 mt-3"
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="flex items-center gap-2">
                                        {post.type === 'OFFER' && (
                                            <LikeButton
                                                postId={post.id}
                                                initialCount={post.like_count}
                                                initialLiked={post.user_has_liked}
                                                color={facultyColor}
                                            />
                                        )}
                                        <ShareButton
                                            postId={post.id}
                                            course={post.course}
                                            topic={post.topic}
                                        />
                                    </div>
                                    {/* HIDDEN FOR DEPLOYMENT
                                    <ContactButton
                                        userId={userId}
                                        postId={post.id}
                                        size="sm"
                                        className="rounded-full px-3 h-8 text-xs transition-all hover:scale-105"
                                        style={{ background: `${facultyColor}20`, color: facultyColor }}
                                    />
                                    */}
                                </div>

                                {/* Comments */}
                                <CommentSection
                                    postId={post.id}
                                    postOwnerId={userId}
                                    initialCount={post.comment_count}
                                    accentColor={facultyColor}
                                    postData={{
                                        type: post.type,
                                        course: post.course,
                                        topic: post.topic,
                                        description: post.description,
                                        price_or_budget: post.price_or_budget,
                                        created_at: post.created_at,
                                        author: {
                                            name: profile?.name || '',
                                            avatar_url: profile?.avatar_url || null,
                                            faculty: profile?.faculty || '',
                                        },
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {posts.length === 0 && !loading && (
                <div className="text-center py-10 rounded-2xl" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#555' }} />
                    <p className="text-sm" style={{ color: '#888' }}>
                        {profile.name} no tiene publicaciones todavía
                    </p>
                </div>
            )}

            {/* Mis Sesiones — Payment History (own profile only) */}
            {
                currentUserId === userId && payments.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-serif font-medium flex items-center gap-2" style={{ color: '#e8e2d3' }}>
                            <DollarSign className="w-4 h-4" />
                            Mis Sesiones
                        </h2>
                        <div className="space-y-2">
                            {payments.map((payment) => {
                                const statusConfig = payment.status === 'confirmed'
                                    ? { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: '✅ Confirmado', border: 'rgba(34,197,94,0.2)' }
                                    : payment.status === 'rejected'
                                        ? { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: '❌ Rechazado', border: 'rgba(239,68,68,0.2)' }
                                        : { bg: 'rgba(234,179,8,0.12)', color: '#eab308', label: '🕐 Pendiente', border: 'rgba(234,179,8,0.2)' }

                                return (
                                    <div
                                        key={payment.id}
                                        className="rounded-xl p-4 transition-all"
                                        style={{
                                            background: '#242424',
                                            border: `1px solid ${statusConfig.border}`,
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                                                    >
                                                        {statusConfig.label}
                                                    </span>
                                                    <span className="text-[11px]" style={{ color: '#666' }}>
                                                        {new Date(payment.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium" style={{ color: '#e8e2d3' }}>
                                                    {payment.course}
                                                </p>
                                                <p className="text-xs" style={{ color: '#999' }}>{payment.topic}</p>
                                                <p className="text-xs" style={{ color: '#888' }}>
                                                    Mentor: <span style={{ color: '#a78bfa' }}>{payment.mentor?.name || 'Mentor'}</span>
                                                </p>
                                                {payment.scheduled_day && (
                                                    <p className="text-xs" style={{ color: '#a78bfa' }}>
                                                        📅 {payment.scheduled_day} {payment.scheduled_start} — {payment.scheduled_end}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-lg font-bold flex-shrink-0" style={{ color: '#a78bfa' }}>
                                                S/{payment.amount.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            }

        </div >
    )
}
