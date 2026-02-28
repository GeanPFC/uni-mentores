'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LikeButton } from '@/components/ui/like-button'
import { CommentSection } from '@/components/ui/comment-section'
import { FollowButton } from '@/components/ui/follow-button'
import { ShareButton } from '@/components/ui/share-button'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
// HIDDEN FOR DEPLOYMENT: import { ContactButton } from '@/components/ContactButton'
import { PaymentButton } from '@/components/PaymentButton'
import {
    ChevronRight, ChevronLeft, ChevronDown,
    BookOpen, GraduationCap, Layers, Flame, Heart,
    Search, Plus, Sparkles, Users, FileText, Clock,
    MessageCircle, ArrowRight
} from 'lucide-react'
import { UNI_FACULTIES_DATA, getCourses, CYCLE_LABELS } from '@/lib/uni-courses'
import type { PostWithAuthor } from '@/types'

export default function ExplorePage() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [posts, setPosts] = useState<(PostWithAuthor & { comment_count?: number; is_following_author?: boolean })[]>([])
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Initialize state from URL search params (persist on refresh)
    const [selectedFaculty, setSelectedFaculty] = useState<string>(
        searchParams.get('faculty') || 'FIIS'
    )
    const [selectedCycle, setSelectedCycle] = useState<number | null>(
        searchParams.get('cycle') ? Number(searchParams.get('cycle')) : null
    )
    const [selectedCourse, setSelectedCourse] = useState<string | null>(
        searchParams.get('course') || null
    )
    const [filter, setFilter] = useState<'all' | 'OFFER' | 'REQUEST'>(
        (searchParams.get('filter') as 'all' | 'OFFER' | 'REQUEST') || 'all'
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const [showFacultyDropdown, setShowFacultyDropdown] = useState(false)

    // Animation states
    const [contentVisible, setContentVisible] = useState(true)
    const [animationKey, setAnimationKey] = useState(0)

    // Stats
    const [totalPosts, setTotalPosts] = useState(0)
    const [popularPosts, setPopularPosts] = useState<PostWithAuthor[]>([])

    const facultyScrollRef = useRef<HTMLDivElement>(null)

    // Sync filter state to URL search params
    const updateURL = useCallback((faculty: string, cycle: number | null, course: string | null, f: string) => {
        const params = new URLSearchParams()
        params.set('faculty', faculty)
        if (cycle !== null) params.set('cycle', String(cycle))
        if (course) params.set('course', course)
        if (f !== 'all') params.set('filter', f)
        router.replace(`/explore?${params.toString()}`, { scroll: false })
    }, [router])

    useEffect(() => {
        setMounted(true)
        fetchTotalPosts()
        fetchPopularPosts()
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null))
    }, [])

    useEffect(() => {
        if (selectedCourse) fetchPosts()
    }, [selectedCourse, filter])

    const fetchTotalPosts = async () => {
        const { count } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
        setTotalPosts(count || 0)
    }

    const fetchPosts = async () => {
        if (!selectedCourse) return
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        let query = supabase
            .from('posts')
            .select(`*, author:profiles!posts_user_id_fkey (id, name, avatar_url, faculty), post_likes (user_id), post_comments (id)`)
            .eq('status', 'active')
            .ilike('course', `%${selectedCourse}%`)
            .order('created_at', { ascending: false })
        if (filter !== 'all') query = query.eq('type', filter)
        const { data, error } = await query

        // Fetch follow status for all post authors
        let followingSet = new Set<string>()
        if (user && data) {
            const authorIds = [...new Set(data.map((p: { user_id: string }) => p.user_id).filter(id => id !== user.id))]
            if (authorIds.length > 0) {
                const { data: followData } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id)
                    .in('following_id', authorIds)
                followingSet = new Set(followData?.map(f => f.following_id) || [])
            }
        }

        if (!error && data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const postsWithLikes = data.map((p: any) => {
                const { post_likes, post_comments, ...rest } = p
                const likes = Array.isArray(post_likes) ? post_likes : []
                const comments = Array.isArray(post_comments) ? post_comments : []
                return {
                    ...rest,
                    like_count: likes.length,
                    user_has_liked: likes.some((l: { user_id: string }) => l.user_id === user?.id),
                    comment_count: comments.length,
                    is_following_author: followingSet.has(rest.user_id),
                }
            })
            setPosts(postsWithLikes)
        }

        setLoading(false)
    }

    const fetchPopularPosts = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('posts')
            .select(`*, author:profiles!posts_user_id_fkey (id, name, avatar_url, faculty), post_likes (user_id)`)
            .eq('status', 'active')
            .eq('type', 'OFFER')
            .order('created_at', { ascending: false })
            .limit(50)
        if (!error && data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const withLikes = data.map((p: any) => {
                const { post_likes, ...rest } = p
                const likes = Array.isArray(post_likes) ? post_likes : []
                return {
                    ...rest,
                    like_count: likes.length,
                    user_has_liked: likes.some((l: { user_id: string }) => l.user_id === user?.id),
                } as PostWithAuthor
            })
                .filter(p => p.like_count > 0)
                .sort((a, b) => b.like_count - a.like_count)
                .slice(0, 6)
            setPopularPosts(withLikes)
        }
    }

    const facultyInfo = UNI_FACULTIES_DATA[selectedFaculty]
    const facultyColor = facultyInfo?.color || '#e8e2d3'

    const animateTransition = (callback: () => void) => {
        setContentVisible(false)
        setTimeout(() => {
            callback()
            setAnimationKey(prev => prev + 1)
            setContentVisible(true)
        }, 200)
    }

    const handleSelectFaculty = (code: string) => {
        animateTransition(() => {
            setSelectedFaculty(code)
            setSelectedCycle(null)
            setSelectedCourse(null)
            setPosts([])
            updateURL(code, null, null, 'all')
        })
        setShowFacultyDropdown(false)
    }
    const handleSelectCycle = (cycle: number) => {
        animateTransition(() => {
            setSelectedCycle(cycle)
            setSelectedCourse(null)
            setPosts([])
            updateURL(selectedFaculty, cycle, null, filter)
        })
    }
    const handleSelectCourse = (course: string) => {
        animateTransition(() => {
            setSelectedCourse(course)
            setFilter('all')
            updateURL(selectedFaculty, selectedCycle, course, 'all')
        })
    }
    const handleBack = () => {
        animateTransition(() => {
            if (selectedCourse) {
                setSelectedCourse(null)
                setPosts([])
                updateURL(selectedFaculty, selectedCycle, null, filter)
            } else if (selectedCycle) {
                setSelectedCycle(null)
                updateURL(selectedFaculty, null, null, filter)
            }
        })
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffHours < 1) return 'Hace un momento'
        if (diffHours < 24) return `Hace ${diffHours}h`
        if (diffDays < 7) return `Hace ${diffDays}d`
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    }

    const currentCourses = selectedCycle ? getCourses(selectedFaculty, selectedCycle) : []

    const handlePopularCourseClick = (courseName: string) => {
        const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
        const target = norm(courseName)

        // Try exact normalized match first
        for (const [fCode, fData] of Object.entries(UNI_FACULTIES_DATA)) {
            for (const [cycle, courses] of Object.entries(fData.courses)) {
                const match = courses.find(c => norm(c) === target)
                if (match) {
                    setSelectedFaculty(fCode)
                    setSelectedCycle(Number(cycle))
                    setSelectedCourse(match)
                    setFilter('all')
                    setAnimationKey(prev => prev + 1)
                    updateURL(fCode, Number(cycle), match, 'all')
                    return
                }
            }
        }

        // Fallback: partial match (course name contains or is contained)
        for (const [fCode, fData] of Object.entries(UNI_FACULTIES_DATA)) {
            for (const [cycle, courses] of Object.entries(fData.courses)) {
                const match = courses.find(c => norm(c).includes(target) || target.includes(norm(c)))
                if (match) {
                    setSelectedFaculty(fCode)
                    setSelectedCycle(Number(cycle))
                    setSelectedCourse(match)
                    setFilter('all')
                    setAnimationKey(prev => prev + 1)
                    updateURL(fCode, Number(cycle), match, 'all')
                    return
                }
            }
        }

        // Last resort: set as-is so the user at least sees something
        setSelectedCourse(courseName)
        setFilter('all')
        setAnimationKey(prev => prev + 1)
    }

    // Normalize text: strip accents for accent-insensitive search
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

    // Search across all courses (accent-insensitive)
    const searchResults = searchQuery.length >= 2
        ? Object.entries(UNI_FACULTIES_DATA).flatMap(([fCode, fData]) =>
            Object.entries(fData.courses).flatMap(([cycle, courses]) =>
                courses
                    .filter(c => normalize(c).includes(normalize(searchQuery)))
                    .map(c => ({ course: c, faculty: fCode, cycle: Number(cycle) }))
            )
        ).slice(0, 8)
        : []

    const handleSearchSelect = (result: { course: string; faculty: string; cycle: number }) => {
        setSelectedFaculty(result.faculty)
        setSelectedCycle(result.cycle)
        setSelectedCourse(result.course)
        setFilter('all')
        setSearchQuery('')
        setSearchFocused(false)
        setAnimationKey(prev => prev + 1)
        updateURL(result.faculty, result.cycle, result.course, 'all')
    }

    // Filter counts
    const offerCount = posts.filter(p => p.type === 'OFFER').length
    const requestCount = posts.filter(p => p.type === 'REQUEST').length
    const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter)

    return (
        <>
            <div className="space-y-6">
                {/* ═══════════════════════════════════════════
                    COMPACT HERO HEADER + SEARCH
                    ═══════════════════════════════════════════ */}
                <section
                    className={`rounded-[2rem] p-6 md:p-8 relative z-20 transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                    style={{ background: '#242424' }}
                    role="banner"
                >
                    {/* Background glow */}
                    <div
                        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 transition-colors duration-500"
                        style={{ background: facultyColor, transform: 'translate(30%, -30%)' }}
                    />

                    <div className="relative z-10 space-y-5">
                        {/* Top row: Title + Button */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-300"
                                    style={{ background: `${facultyColor}20` }}
                                >
                                    <GraduationCap className="w-5 h-5" style={{ color: facultyColor }} />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-serif italic" style={{ color: '#e8e2d3' }}>
                                        Explorar
                                    </h1>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-xs" style={{ color: '#999' }}>
                                            {totalPosts > 0 && (
                                                <span className="flex items-center gap-1.5">
                                                    <FileText className="w-3 h-3" />
                                                    {totalPosts} publicaciones activas
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Link href="/create">
                                <Button
                                    className="rounded-full px-6 h-10 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${facultyColor}, ${facultyColor}cc)`,
                                        color: '#1a1a1a',
                                        boxShadow: `0 4px 15px ${facultyColor}30`
                                    }}
                                    aria-label="Crear nueva publicación"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Publicar
                                </Button>
                            </Link>
                        </div>

                        {/* Integrated Search */}
                        <div className="relative" role="search" aria-label="Buscar cursos">
                            <Search
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 z-10 transition-colors duration-300"
                                style={{ color: searchFocused ? '#e8e2d3' : '#666' }}
                            />
                            <input
                                type="text"
                                placeholder="Buscar cursos... (ej: Cálculo, Física, Programación)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                className="w-full h-12 pl-11 pr-4 rounded-xl text-sm transition-all duration-300"
                                style={{
                                    background: 'rgba(26, 26, 26, 0.6)',
                                    border: searchFocused ? `1px solid ${facultyColor}50` : '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    outline: 'none',
                                }}
                                aria-label="Buscar cursos"
                                aria-expanded={searchFocused && searchResults.length > 0}
                            />
                            {searchFocused && searchResults.length > 0 && (
                                <div
                                    className="absolute top-full mt-2 w-full rounded-xl overflow-hidden shadow-2xl z-50"
                                    style={{ background: 'rgba(36,36,36,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
                                    role="listbox"
                                >
                                    {searchResults.map((r, i) => (
                                        <button
                                            key={`${r.faculty}-${r.cycle}-${r.course}-${i}`}
                                            onMouseDown={() => handleSearchSelect(r)}
                                            className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-white/5"
                                            role="option"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: `${UNI_FACULTIES_DATA[r.faculty]?.color || '#e8e2d3'}15` }}>
                                                <BookOpen className="w-3.5 h-3.5" style={{ color: UNI_FACULTIES_DATA[r.faculty]?.color || '#e8e2d3' }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: '#e8e2d3' }}>{r.course}</p>
                                                <p className="text-xs" style={{ color: '#666' }}>{r.faculty} · {CYCLE_LABELS[r.cycle]}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════
                    HORIZONTAL FACULTY PILLS (Desktop + Mobile)
                    ═══════════════════════════════════════════ */}
                <div
                    className={`transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                >
                    {/* Desktop: Horizontal pills */}
                    <div className="hidden md:block">
                        <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible no-scrollbar py-1.5 px-1" ref={facultyScrollRef}>
                            {Object.values(UNI_FACULTIES_DATA).map((faculty) => (
                                <button
                                    key={faculty.code}
                                    onClick={() => handleSelectFaculty(faculty.code)}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-[1.03] ${selectedFaculty === faculty.code ? 'ring-1 ring-offset-1 ring-offset-[#1a1a1a]' : ''}`}
                                    style={{
                                        background: selectedFaculty === faculty.code ? `${faculty.color}20` : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${selectedFaculty === faculty.code ? `${faculty.color}50` : 'rgba(255,255,255,0.08)'}`,
                                        color: selectedFaculty === faculty.code ? faculty.color : '#999',
                                    }}
                                    aria-label={`Seleccionar facultad ${faculty.name}`}
                                    aria-pressed={selectedFaculty === faculty.code}
                                >
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: faculty.color }} />
                                    {faculty.code}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile: Dropdown */}
                    <div className="md:hidden relative">
                        <button
                            onClick={() => setShowFacultyDropdown(!showFacultyDropdown)}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-all"
                            style={{
                                background: '#242424',
                                border: `1px solid ${facultyColor}40`,
                            }}
                            aria-expanded={showFacultyDropdown}
                            aria-haspopup="listbox"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: facultyColor }} />
                                <span className="text-sm font-medium" style={{ color: '#e8e2d3' }}>
                                    {selectedFaculty} — {facultyInfo?.name}
                                </span>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 transition-transform duration-300 ${showFacultyDropdown ? 'rotate-180' : ''}`}
                                style={{ color: '#999' }}
                            />
                        </button>
                        {showFacultyDropdown && (
                            <div
                                className="absolute top-full mt-2 w-full rounded-xl overflow-hidden shadow-2xl z-50 max-h-72 overflow-y-auto"
                                style={{ background: 'rgba(36,36,36,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
                                role="listbox"
                            >
                                {Object.values(UNI_FACULTIES_DATA).map((faculty) => (
                                    <button
                                        key={faculty.code}
                                        onClick={() => handleSelectFaculty(faculty.code)}
                                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${selectedFaculty === faculty.code ? 'bg-white/5' : 'hover:bg-white/3'}`}
                                        role="option"
                                        aria-selected={selectedFaculty === faculty.code}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: faculty.color }} />
                                        <span className="text-sm font-medium" style={{ color: selectedFaculty === faculty.code ? faculty.color : '#c8c8c8' }}>
                                            {faculty.code}
                                        </span>
                                        <span className="text-xs ml-auto" style={{ color: '#666' }}>
                                            {faculty.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    BREADCRUMB NAVIGATION
                    ═══════════════════════════════════════════ */}
                {(selectedCycle || selectedCourse) && (
                    <nav
                        className="flex items-center gap-2 px-1"
                        aria-label="Navegación de exploración"
                        style={{ animation: 'slideInLeft 0.3s ease-out' }}
                    >
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1 text-sm transition-all hover:opacity-80 hover:-translate-x-0.5"
                            style={{ color: facultyColor }}
                            aria-label="Volver al nivel anterior"
                        >
                            <ChevronLeft className="w-4 h-4" /> Volver
                        </button>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: '#666' }}>
                            <span style={{ color: facultyColor }} className="font-medium">{selectedFaculty}</span>
                            {selectedCycle && (
                                <>
                                    <ChevronRight className="w-3 h-3" />
                                    <button
                                        onClick={() => animateTransition(() => { setSelectedCourse(null); setPosts([]) })}
                                        className="font-medium transition-colors hover:opacity-80"
                                        style={{ color: selectedCourse ? '#999' : facultyColor }}
                                        aria-current={!selectedCourse ? 'page' : undefined}
                                    >
                                        {CYCLE_LABELS[selectedCycle]}
                                    </button>
                                </>
                            )}
                            {selectedCourse && (
                                <>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="font-medium" style={{ color: facultyColor }} aria-current="page">{selectedCourse}</span>
                                </>
                            )}
                        </div>
                    </nav>
                )}

                {/* ═══════════════════════════════════════════
                    ANIMATED CONTENT AREA
                    ═══════════════════════════════════════════ */}
                <div
                    key={animationKey}
                    className="transition-all duration-300"
                    style={{
                        opacity: contentVisible ? 1 : 0,
                        transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
                    }}
                >

                    {/* ─── LEVEL 0: ONBOARDING (no cycle selected) ─── */}
                    {!selectedCycle && !selectedCourse && (
                        <div className="space-y-8">
                            {/* Cycle grid */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 px-1">
                                    <Layers className="w-4 h-4" style={{ color: facultyColor }} />
                                    <h2 className="text-lg font-serif" style={{ color: '#e8e2d3' }}>
                                        Selecciona un ciclo
                                    </h2>
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${facultyColor}15`, color: facultyColor }}>
                                        {facultyInfo?.name}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" role="list" aria-label="Ciclos académicos">
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((cycle, idx) => {
                                        const courses = getCourses(selectedFaculty, cycle)
                                        const isPopular = cycle <= 4
                                        return (
                                            <button
                                                key={cycle}
                                                onClick={() => handleSelectCycle(cycle)}
                                                className="group relative rounded-2xl p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl text-left overflow-hidden"
                                                style={{
                                                    background: '#242424',
                                                    border: `1px solid ${facultyColor}20`,
                                                    animationDelay: `${idx * 50}ms`,
                                                }}
                                                role="listitem"
                                                aria-label={`${CYCLE_LABELS[cycle]}, ${courses.length} cursos`}
                                            >
                                                <div
                                                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                    style={{ background: `linear-gradient(135deg, ${facultyColor}12, transparent)` }}
                                                />
                                                <div className="relative z-10 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <div
                                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-300 group-hover:scale-110"
                                                            style={{ background: `${facultyColor}20`, color: facultyColor }}
                                                        >
                                                            {cycle}
                                                        </div>
                                                        {isPopular && (
                                                            <span
                                                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                                                                style={{ background: '#f59e0b18', color: '#f59e0b' }}
                                                            >
                                                                <Flame className="w-2.5 h-2.5" />
                                                                Popular
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium" style={{ color: '#e8e2d3' }}>
                                                            {CYCLE_LABELS[cycle]}
                                                        </p>
                                                        <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                                                            {courses.length} cursos
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight
                                                    className="absolute bottom-3.5 right-3.5 w-4 h-4 opacity-0 group-hover:opacity-60 transition-all duration-300 group-hover:translate-x-0.5"
                                                    style={{ color: facultyColor }}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── LEVEL 1: COURSES ─── */}
                    {selectedCycle && !selectedCourse && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5 px-1">
                                <BookOpen className="w-4 h-4" style={{ color: facultyColor }} />
                                <h2 className="text-lg font-serif" style={{ color: '#e8e2d3' }}>
                                    Cursos del {CYCLE_LABELS[selectedCycle]}
                                </h2>
                                <span className="text-xs" style={{ color: '#666' }}>
                                    {currentCourses.length} cursos
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" role="list" aria-label="Cursos disponibles">
                                {currentCourses.map((course, index) => (
                                    <button
                                        key={course}
                                        onClick={() => handleSelectCourse(course)}
                                        className="group relative rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg text-left overflow-hidden"
                                        style={{
                                            background: '#242424',
                                            border: `1px solid ${facultyColor}20`,
                                        }}
                                        role="listitem"
                                        aria-label={`Curso: ${course}`}
                                    >
                                        <div
                                            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                            style={{ background: `linear-gradient(135deg, ${facultyColor}10, transparent)` }}
                                        />
                                        <div className="relative z-10 flex items-center gap-3.5">
                                            <div
                                                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-semibold transition-transform duration-300 group-hover:scale-110"
                                                style={{ background: `${facultyColor}15`, color: facultyColor }}
                                            >
                                                {String(index + 1).padStart(2, '0')}
                                            </div>
                                            <p className="text-sm font-medium leading-tight" style={{ color: '#e8e2d3' }}>
                                                {course}
                                            </p>
                                            <ChevronRight
                                                className="w-4 h-4 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-60 transition-all duration-300 group-hover:translate-x-0.5"
                                                style={{ color: facultyColor }}
                                            />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── LEVEL 2: POSTS (Editorial Cards) ─── */}
                    {selectedCourse && (
                        <div className="space-y-5">
                            {/* Header + Filters */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${facultyColor}20` }}>
                                        <GraduationCap className="w-5 h-5" style={{ color: facultyColor }} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-serif" style={{ color: '#e8e2d3' }}>{selectedCourse}</h2>
                                        <p className="text-xs" style={{ color: '#666' }}>{selectedFaculty} • {CYCLE_LABELS[selectedCycle!]}</p>
                                    </div>
                                </div>

                                {/* Filter Tabs with Counts */}
                                <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    {([
                                        { key: 'all' as const, label: 'Todos', count: posts.length },
                                        { key: 'OFFER' as const, label: 'Ofrezco', count: offerCount },
                                        { key: 'REQUEST' as const, label: 'Necesito', count: requestCount },
                                    ]).map((f) => (
                                        <button
                                            key={f.key}
                                            onClick={() => { setFilter(f.key); updateURL(selectedFaculty, selectedCycle, selectedCourse, f.key) }}
                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                                            style={{
                                                background: filter === f.key
                                                    ? f.key === 'OFFER' ? '#6b7c3f' : f.key === 'REQUEST' ? '#8b6914' : facultyColor
                                                    : 'transparent',
                                                color: filter === f.key
                                                    ? f.key === 'all' ? '#1a1a1a' : '#ffffff'
                                                    : '#999',
                                            }}
                                            aria-pressed={filter === f.key}
                                        >
                                            {f.label}
                                            {f.count > 0 && (
                                                <span
                                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                                    style={{
                                                        background: filter === f.key ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                                                        color: filter === f.key ? 'rgba(255,255,255,0.9)' : '#666',
                                                    }}
                                                >
                                                    {f.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Posts Grid */}
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="rounded-2xl p-5 space-y-4 animate-pulse" style={{ background: '#242424' }}>
                                            <div className="flex justify-between">
                                                <div className="h-6 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                                <div className="h-4 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                            </div>
                                            <div className="h-5 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            <div className="h-4 w-1/2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                            <div className="flex items-center gap-3 pt-2">
                                                <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                                <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredPosts.length === 0 ? (
                                /* Empty State */
                                <div className="text-center py-16 rounded-2xl" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${facultyColor}12` }}>
                                        <BookOpen className="w-7 h-7" style={{ color: facultyColor }} />
                                    </div>
                                    <p style={{ color: '#c8c8c8' }} className="text-lg">
                                        No hay publicaciones para <span className="font-medium" style={{ color: '#e8e2d3' }}>{selectedCourse}</span>
                                    </p>
                                    <p style={{ color: '#666' }} className="text-sm mt-1 mb-6">Sé el primero en ofrecer o solicitar ayuda</p>
                                    <Link href="/create">
                                        <Button
                                            className="rounded-full px-8 h-11 font-medium"
                                            style={{ background: facultyColor, color: '#1a1a1a' }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear publicación
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                /* Editorial Post Cards */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredPosts.map((post, index) => (
                                        <div
                                            key={post.id}
                                            className="group relative rounded-2xl p-5 transition-all duration-300 hover:scale-[1.015] hover:shadow-xl overflow-hidden"
                                            style={{
                                                background: '#242424',
                                                border: `1px solid rgba(255,255,255,0.06)`,
                                                animationDelay: `${index * 80}ms`,
                                            }}
                                        >
                                            {/* Hover glow */}
                                            <div
                                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                                style={{ background: `linear-gradient(135deg, ${facultyColor}08, transparent)` }}
                                            />

                                            {/* Top: Type badge + Date */}
                                            <div className="relative z-10 flex items-center justify-between mb-4">
                                                <span
                                                    className="text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide"
                                                    style={{
                                                        background: post.type === 'OFFER' ? 'rgba(107,124,63,0.15)' : 'rgba(139,105,20,0.15)',
                                                        color: post.type === 'OFFER' ? '#a3b86c' : '#d4a524',
                                                        border: `1px solid ${post.type === 'OFFER' ? 'rgba(107,124,63,0.25)' : 'rgba(139,105,20,0.25)'}`,
                                                    }}
                                                >
                                                    {post.type === 'OFFER' ? 'Ofrezco' : 'Necesito'}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs" style={{ color: '#666' }}>
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(post.created_at)}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="relative z-10 space-y-2 mb-5">
                                                <h3 className="text-lg font-serif leading-tight line-clamp-1" style={{ color: '#e8e2d3' }}>
                                                    {post.course}
                                                </h3>
                                                <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#999' }}>
                                                    {post.topic}
                                                </p>
                                            </div>

                                            {/* Availability Schedule */}
                                            {post.availability && Array.isArray(post.availability) && post.availability.length > 0 && (
                                                <div className="relative z-10 flex flex-wrap gap-1.5 mb-3">
                                                    {(post.availability as Array<{ day: string; start: string; end: string }>).map((slot, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
                                                            style={{
                                                                background: `${facultyColor}10`,
                                                                border: `1px solid ${facultyColor}20`,
                                                                color: facultyColor
                                                            }}
                                                        >
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {slot.day.slice(0, 3)} {slot.start}-{slot.end}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Bottom: Two stacked rows to prevent overlap */}
                                            <div className="relative z-10 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                {/* Row 1: Author info only */}
                                                <div className="flex items-center gap-2.5">
                                                    <Link href={`/profile/${post.user_id}`} onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                                                        <Avatar className="h-8 w-8 ring-1 ring-white/10 transition-transform hover:scale-110">
                                                            <AvatarImage src={post.author?.avatar_url || undefined} />
                                                            <AvatarFallback style={{ background: `${facultyColor}25`, color: facultyColor }} className="text-xs font-medium">
                                                                {post.author?.name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate" style={{ color: '#c8c8c8' }}>
                                                            {post.author?.name}
                                                        </p>
                                                        <p className="text-[11px] truncate" style={{ color: '#666' }}>
                                                            {post.author?.faculty}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Row 2: Actions — all in one row, never overlaps */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {currentUserId && post.user_id !== currentUserId && (
                                                        <FollowButton
                                                            targetUserId={post.user_id}
                                                            initialFollowing={post.is_following_author || false}
                                                            accentColor={facultyColor}
                                                            onFollowChange={(following) => {
                                                                setPosts(prev => prev.map(p =>
                                                                    p.user_id === post.user_id
                                                                        ? { ...p, is_following_author: following }
                                                                        : p
                                                                ))
                                                            }}
                                                        />
                                                    )}
                                                    {post.type === 'OFFER' && (
                                                        <LikeButton
                                                            postId={post.id}
                                                            initialCount={post.like_count}
                                                            initialLiked={post.user_has_liked}
                                                            color={facultyColor}
                                                        />
                                                    )}
                                                    {post.price_or_budget && (
                                                        <span
                                                            className="text-sm font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
                                                            style={{ background: 'rgba(232,226,211,0.08)', color: '#e8e2d3' }}
                                                        >
                                                            {formatPrice(post.price_or_budget)}
                                                        </span>
                                                    )}
                                                    {/* HIDDEN FOR DEPLOYMENT
                                                    <ContactButton
                                                        userId={post.user_id}
                                                        postId={post.id}
                                                        size="sm"
                                                        className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all duration-300 hover:scale-105 whitespace-nowrap"
                                                        style={{
                                                            background: `${facultyColor}20`,
                                                            color: facultyColor,
                                                        }}
                                                    />
                                                    */}
                                                    {post.type === 'OFFER' && post.price_or_budget && post.price_or_budget > 0 && currentUserId && post.user_id !== currentUserId && (
                                                        <PaymentButton
                                                            postId={post.id}
                                                            mentorId={post.user_id}
                                                            mentorName={post.author?.name || 'Mentor'}
                                                            courseName={post.course}
                                                            topic={post.topic}
                                                            price={post.price_or_budget}
                                                            accentColor={facultyColor}
                                                            availability={post.availability}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Comments */}
                                            <div className="relative z-10">
                                                <CommentSection
                                                    postId={post.id}
                                                    postOwnerId={post.user_id}
                                                    initialCount={post.comment_count || 0}
                                                    accentColor={facultyColor}
                                                    postData={{
                                                        type: post.type,
                                                        course: post.course,
                                                        topic: post.topic,
                                                        description: post.description,
                                                        price_or_budget: post.price_or_budget,
                                                        created_at: post.created_at,
                                                        author: post.author,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════
                    PUBLICACIONES POPULARES
                    ═══════════════════════════════════════════ */}
                {!selectedCourse && popularPosts.length > 0 && (
                    <section className="mt-6 space-y-5">
                        <div className="flex items-center gap-2.5 px-1">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))' }}>
                                <Flame className="w-4 h-4" style={{ color: '#f59e0b' }} />
                            </div>
                            <div>
                                <h2 className="text-lg font-serif" style={{ color: '#e8e2d3' }}>Mentores destacados</h2>
                                <p className="text-[11px]" style={{ color: '#666' }}>Las ofertas más valoradas por la comunidad</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {popularPosts.map((post, index) => {
                                const postFacultyColor = UNI_FACULTIES_DATA[post.author?.faculty]?.color || '#e8e2d3'
                                return (
                                    <button
                                        key={post.id}
                                        onClick={() => handlePopularCourseClick(post.course)}
                                        className="group relative rounded-2xl text-left transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl overflow-hidden"
                                        style={{
                                            background: '#242424',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            animationDelay: `${index * 100}ms`,
                                        }}
                                    >
                                        {/* Gradient header with faculty color */}
                                        <div
                                            className="relative h-24 flex items-end p-4"
                                            style={{
                                                background: `linear-gradient(135deg, ${postFacultyColor}35, ${postFacultyColor}10, #242424)`,
                                            }}
                                        >
                                            {/* Decorative pattern */}
                                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: postFacultyColor, transform: 'translate(30%, -50%)' }} />

                                            {/* Likes badge */}
                                            <div
                                                className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                                                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: '#f59e0b' }}
                                            >
                                                <Heart className="w-3 h-3" style={{ fill: '#f59e0b' }} />
                                                {post.like_count}
                                            </div>

                                            {/* Course name overlay */}
                                            <h3 className="relative z-10 text-base font-serif font-medium leading-tight line-clamp-1" style={{ color: '#ffffff' }}>
                                                {post.course}
                                            </h3>
                                        </div>

                                        {/* Card body */}
                                        <div className="p-4 space-y-3">
                                            {/* Topic */}
                                            <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#999' }}>
                                                {post.topic}
                                            </p>

                                            {/* Author + Price row */}
                                            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Avatar className="h-9 w-9 ring-2 transition-transform duration-300 group-hover:scale-110" style={{ borderColor: `${postFacultyColor}40` }}>
                                                        <AvatarImage src={post.author?.avatar_url || undefined} />
                                                        <AvatarFallback
                                                            style={{ background: `linear-gradient(135deg, ${postFacultyColor}40, ${postFacultyColor}20)`, color: postFacultyColor }}
                                                            className="text-xs font-bold"
                                                        >
                                                            {post.author?.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate" style={{ color: '#e8e2d3' }}>
                                                            {post.author?.name}
                                                        </p>
                                                        <p className="text-[10px]" style={{ color: '#666' }}>
                                                            {post.author?.faculty}
                                                        </p>
                                                    </div>
                                                </div>
                                                {post.price_or_budget ? (
                                                    <span
                                                        className="text-sm font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                                                        style={{ background: `${postFacultyColor}15`, color: postFacultyColor }}
                                                    >
                                                        {formatPrice(post.price_or_budget)}
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                                                        style={{ background: 'rgba(107,124,63,0.15)', color: '#a3b86c' }}
                                                    >
                                                        Gratis
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom hover accent */}
                                        <div
                                            className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                            style={{ background: `linear-gradient(to right, ${postFacultyColor}, transparent)` }}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                )}
            </div>

            <style jsx>{`
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </>
    )
}
