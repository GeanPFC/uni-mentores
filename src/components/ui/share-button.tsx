'use client'

import { useState } from 'react'
import { Share2, Link2, Check } from 'lucide-react'

interface ShareButtonProps {
    postId: string
    course: string
    topic?: string
    className?: string
    style?: React.CSSProperties
}

export function ShareButton({ postId, course, topic, className, style }: ShareButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation()

        const url = `${window.location.origin}/explore?post=${postId}`
        const shareText = `Mira esta oferta de ${course}${topic ? `: ${topic}` : ''} en UNI Mentores`

        // Try native Web Share API (mobile browsers)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${course} — UNI Mentores`,
                    text: shareText,
                    url,
                })
                return
            } catch {
                // User cancelled or not supported, fall through to clipboard
            }
        }

        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(`${shareText}\n${url}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Final fallback
            const textarea = document.createElement('textarea')
            textarea.value = `${shareText}\n${url}`
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 text-xs transition-all duration-200 hover:scale-110 ${className || ''}`}
            style={{
                color: copied ? '#10b981' : '#888',
                ...style,
            }}
            title={copied ? 'Link copiado!' : 'Compartir'}
        >
            {copied ? (
                <Check className="w-4 h-4" />
            ) : (
                <Share2 className="w-4 h-4" />
            )}
        </button>
    )
}
