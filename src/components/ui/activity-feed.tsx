'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BookOpen, UserPlus, FileText, TrendingUp, Sparkles } from 'lucide-react'

interface ActivityItem {
    id: string
    type: 'new_post' | 'new_follow' | 'trending_course'
    text: string
    subtext?: string
    userId?: string
    userName?: string
    avatarUrl?: string | null
    time: string
    color?: string
}

export function ActivityFeed() {
    const supabase = createClient()
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchActivity()
    }, [])

    const fetchActivity = async () => {
        setLoading(true)
        const activities: ActivityItem[] = []

        // Recent posts (last 24h)
        const { data: recentPosts } = await supabase
            .from('posts')
            .select('id, type, course, topic, user_id, created_at, author:profiles!posts_user_id_fkey (name, avatar_url)')
            .eq('status', 'active')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(6)

        if (recentPosts) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recentPosts.forEach((post: any) => {
                activities.push({
                    id: `post-${post.id}`,
                    type: 'new_post',
                    text: post.type === 'OFFER'
                        ? `publicó una oferta de ${post.course}`
                        : `busca ayuda en ${post.course}`,
                    subtext: post.topic,
                    userId: post.user_id,
                    userName: post.author?.name || 'Alguien',
                    avatarUrl: post.author?.avatar_url,
                    time: post.created_at,
                    color: post.type === 'OFFER' ? '#a3b86c' : '#d4a524',
                })
            })
        }

        // Recent follows (last 24h)
        const { data: recentFollows } = await supabase
            .from('follows')
            .select(`
                follower_id, following_id, created_at,
                follower:profiles!follows_follower_id_fkey (name, avatar_url),
                following:profiles!follows_following_id_fkey (name)
            `)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(4)

        if (recentFollows) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recentFollows.forEach((follow: any) => {
                activities.push({
                    id: `follow-${follow.follower_id}-${follow.following_id}`,
                    type: 'new_follow',
                    text: `empezó a seguir a ${follow.following?.name || 'alguien'}`,
                    userId: follow.follower_id,
                    userName: follow.follower?.name || 'Alguien',
                    avatarUrl: follow.follower?.avatar_url,
                    time: follow.created_at,
                    color: '#8b5cf6',
                })
            })
        }

        // Trending courses (most posted in last 7 days)
        const { data: trendingData } = await supabase
            .from('posts')
            .select('course')
            .eq('status', 'active')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

        if (trendingData && trendingData.length > 0) {
            const courseCount: Record<string, number> = {}
            trendingData.forEach(p => {
                courseCount[p.course] = (courseCount[p.course] || 0) + 1
            })
            const topCourses = Object.entries(courseCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 2)

            topCourses.forEach(([course, count]) => {
                activities.push({
                    id: `trending-${course}`,
                    type: 'trending_course',
                    text: `${course}`,
                    subtext: `${count} publicaciones esta semana`,
                    time: new Date().toISOString(),
                    color: '#f59e0b',
                })
            })
        }

        // Sort by time, trending at end
        activities.sort((a, b) => {
            if (a.type === 'trending_course' && b.type !== 'trending_course') return 1
            if (b.type === 'trending_course' && a.type !== 'trending_course') return -1
            return new Date(b.time).getTime() - new Date(a.time).getTime()
        })

        setActivities(activities.slice(0, 10))
        setLoading(false)
    }

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'ahora'
        if (mins < 60) return `${mins}m`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h`
        return `${Math.floor(hrs / 24)}d`
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'new_post': return <FileText className="w-3.5 h-3.5" />
            case 'new_follow': return <UserPlus className="w-3.5 h-3.5" />
            case 'trending_course': return <TrendingUp className="w-3.5 h-3.5" />
            default: return <Sparkles className="w-3.5 h-3.5" />
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
            </div>
        )
    }

    if (activities.length === 0) return null

    return (
        <div className="rounded-2xl p-4" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                style={{ color: '#888' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#e8e2d3' }} />
                Actividad reciente
            </h3>
            <div className="space-y-1">
                {activities.map((item) => (
                    <div key={item.id}
                        className="flex items-start gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/[0.03]"
                    >
                        {item.userId ? (
                            <Link href={`/profile/${item.userId}`} className="flex-shrink-0">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={item.avatarUrl || undefined} />
                                    <AvatarFallback className="text-[10px]" style={{ background: `${item.color}20`, color: item.color }}>
                                        {item.userName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                        ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: `${item.color}15`, color: item.color }}>
                                {getIcon(item.type)}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-xs leading-snug" style={{ color: '#c8c8c8' }}>
                                {item.userName && (
                                    <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline" style={{ color: '#e8e2d3' }}>
                                        {item.userName}
                                    </Link>
                                )}{' '}
                                {item.text}
                            </p>
                            {item.subtext && (
                                <p className="text-[11px] truncate mt-0.5" style={{ color: '#666' }}>
                                    {item.subtext}
                                </p>
                            )}
                        </div>
                        <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#555' }}>
                            {formatTimeAgo(item.time)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
