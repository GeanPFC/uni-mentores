'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { MessageCircle } from 'lucide-react'

interface ContactButtonProps {
    userId: string
    postId?: string
    variant?: 'default' | 'outline' | 'ghost'
    size?: 'default' | 'sm' | 'lg'
    className?: string
    style?: React.CSSProperties
}

export function ContactButton({
    userId,
    postId,
    variant = 'default',
    size = 'default',
    className = '',
    style
}: ContactButtonProps) {
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const handleContact = async () => {
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            if (user.id === userId) {
                toast('No puedes contactar tu propia publicación', 'info')
                setLoading(false)
                return
            }

            // Check if either user has blocked the other
            const { data: blockData } = await supabase
                .from('blocks')
                .select('blocker_id')
                .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`)
                .limit(1)

            if (blockData && blockData.length > 0) {
                toast('No puedes contactar a este usuario', 'error')
                setLoading(false)
                return
            }

            // Create or get conversation
            const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
                p_context_type: postId ? 'post' : 'direct',
                p_context_id: postId || null,
                p_other_user_id: userId
            })

            if (error) {
                toast('No se pudo iniciar la conversación', 'error')
                return
            }

            if (!conversationId) {
                toast('Error al crear la conversación', 'error')
                return
            }

            // Navigate to chat with this conversation
            router.push(`/chat?id=${conversationId}`)
        } catch {
            toast('Error inesperado', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleContact}
            disabled={loading}
            className={`rounded-full hover:scale-105 transition-all ${className}`}
            style={{
                background: variant === 'default' ? '#e8e2d3' : 'transparent',
                color: variant === 'default' ? '#1a1a1a' : '#e8e2d3',
                border: variant !== 'default' ? '1px solid rgba(232, 226, 211, 0.3)' : 'none',
                ...style,
            }}
        >
            <MessageCircle className="w-4 h-4 mr-2" />
            {loading ? 'Conectando...' : 'Contactar'}
        </Button>
    )
}
