'use client'

import { useState, useEffect } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FollowButtonProps {
    targetUserId: string
    initialFollowing: boolean
    onFollowChange?: (following: boolean) => void
    size?: 'sm' | 'md'
    accentColor?: string
}

export function FollowButton({
    targetUserId,
    initialFollowing,
    onFollowChange,
    size = 'sm',
    accentColor = '#e8e2d3'
}: FollowButtonProps) {
    const [following, setFollowing] = useState(initialFollowing)
    const [loading, setLoading] = useState(false)
    const [hovering, setHovering] = useState(false)
    const supabase = createClient()

    // Sync with parent state changes (e.g. when another FollowButton for the same user updates)
    useEffect(() => {
        setFollowing(initialFollowing)
    }, [initialFollowing])

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (loading) return

        const newState = !following
        setFollowing(newState)
        setLoading(true)
        onFollowChange?.(newState)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Don't follow yourself
            if (user.id === targetUserId) return

            if (newState) {
                await supabase.from('follows').insert({
                    follower_id: user.id,
                    following_id: targetUserId,
                })

                // Notification
                await supabase.from('notifications').insert({
                    user_id: targetUserId,
                    actor_id: user.id,
                    type: 'follow',
                })
            } else {
                await supabase.from('follows').delete().match({
                    follower_id: user.id,
                    following_id: targetUserId,
                })
            }
        } catch {
            setFollowing(!newState)
            onFollowChange?.(!newState)
        }
        setLoading(false)
    }

    const btnSize = size === 'sm' ? 'h-7 px-2.5 text-[11px] gap-1' : 'h-8 px-3 text-xs gap-1.5'
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

    const showUnfollow = following && hovering

    return (
        <button
            onClick={handleToggle}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            disabled={loading}
            className={`flex items-center ${btnSize} rounded-full font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50`}
            style={{
                background: following
                    ? showUnfollow ? 'rgba(239,68,68,0.15)' : `${accentColor}15`
                    : `${accentColor}`,
                color: following
                    ? showUnfollow ? '#ef4444' : accentColor
                    : '#1a1a1a',
                border: `1px solid ${following
                    ? showUnfollow ? 'rgba(239,68,68,0.3)' : `${accentColor}30`
                    : 'transparent'
                    }`,
            }}
            aria-label={following ? 'Dejar de seguir' : 'Seguir'}
        >
            {following ? (
                <>
                    <UserCheck className={`${iconSize} transition-all`} />
                    <span>{showUnfollow ? 'Dejar' : 'Siguiendo'}</span>
                </>
            ) : (
                <>
                    <UserPlus className={iconSize} />
                    <span>Seguir</span>
                </>
            )}
        </button>
    )
}
