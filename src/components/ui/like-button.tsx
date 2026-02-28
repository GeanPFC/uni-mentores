'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LikeButtonProps {
    postId: string
    initialCount: number
    initialLiked: boolean
    color?: string
    size?: 'sm' | 'md'
}

export function LikeButton({ postId, initialCount, initialLiked, color = '#e8e2d3', size = 'sm' }: LikeButtonProps) {
    const [liked, setLiked] = useState(initialLiked)
    const [count, setCount] = useState(initialCount)
    const [animating, setAnimating] = useState(false)
    const supabase = createClient()

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation()

        // Optimistic update
        const newLiked = !liked
        setLiked(newLiked)
        setCount(prev => newLiked ? prev + 1 : prev - 1)

        if (newLiked) {
            setAnimating(true)
            setTimeout(() => setAnimating(false), 600)
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            if (newLiked) {
                await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId })
            } else {
                await supabase.from('post_likes').delete().match({ user_id: user.id, post_id: postId })
            }
        } catch {
            // Revert on error
            setLiked(!newLiked)
            setCount(prev => newLiked ? prev - 1 : prev + 1)
        }
    }

    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
    const btnSize = size === 'sm' ? 'h-9 px-2.5 gap-1.5' : 'h-10 px-3 gap-2'

    return (
        <button
            onClick={handleToggle}
            className={`flex items-center ${btnSize} rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95`}
            style={{
                background: liked ? `${color}20` : 'rgba(255,255,255,0.04)',
                color: liked ? color : '#666',
                border: `1px solid ${liked ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
            }}
            aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
            aria-pressed={liked}
        >
            <Heart
                className={`${iconSize} transition-all duration-300 ${animating ? 'scale-125' : ''}`}
                style={{
                    fill: liked ? color : 'none',
                    color: liked ? color : '#666',
                }}
            />
            {count > 0 && (
                <span className="text-xs font-medium">{count}</span>
            )}
        </button>
    )
}
