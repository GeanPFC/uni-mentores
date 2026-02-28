'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, X, Copy, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface PaymentButtonProps {
    postId: string
    mentorId: string
    mentorName: string
    courseName: string
    topic: string
    price: number | null
    accentColor?: string
    availability?: Array<{ day: string; start: string; end: string }> | null
}

const YAPE_NUMBER = '939 157 495'

export function PaymentButton({
    postId,
    mentorId,
    mentorName,
    courseName,
    topic,
    price,
    accentColor = '#e8e2d3',
    availability,
}: PaymentButtonProps) {
    const supabase = createClient()
    const router = useRouter()
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'info' | 'confirm'>('info')
    const [yapeCode, setYapeCode] = useState('')
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(YAPE_NUMBER.replace(/ /g, ''))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSubmitPayment = async () => {
        if (!yapeCode.trim()) {
            toast('Ingresa el código del voucher de Yape', 'error')
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast('Debes iniciar sesión', 'error')
            setLoading(false)
            return
        }

        const scheduledSlot = selectedSlot !== null && availability?.[selectedSlot]
            ? availability[selectedSlot]
            : null

        const { error } = await supabase.from('payments').insert({
            student_id: user.id,
            mentor_id: mentorId,
            post_id: postId,
            amount: price || 0,
            yape_code: yapeCode.trim(),
            course: courseName,
            topic,
            scheduled_day: scheduledSlot?.day || null,
            scheduled_start: scheduledSlot?.start || null,
            scheduled_end: scheduledSlot?.end || null,
            status: 'pending',
        })

        if (error) {
            console.error('Payment error:', error)
            toast('Error al registrar pago: ' + error.message, 'error')
        } else {
            toast('¡Pago registrado! Te confirmaremos en breve.', 'success')
            setOpen(false)
            setStep('info')
            setYapeCode('')
            setSelectedSlot(null)
            // Redirect to user's profile to see payment status
            router.push('/profile')
        }
        setLoading(false)
    }

    if (!price || price <= 0) return null

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
                style={{
                    background: '#6C2BD9',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(108,43,217,0.3)',
                }}
            >
                <ShieldCheck className="w-3.5 h-3.5" />
                Pago Seguro
            </button>

            {/* Modal Overlay — rendered via Portal to escape card stacking context */}
            {open && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl overflow-hidden"
                        style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className="px-5 py-4 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg, #6C2BD9, #8B5CF6)', color: '#fff' }}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-sm font-semibold">Pago Seguro</span>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            {/* Post info */}
                            <div
                                className="p-3 rounded-xl text-sm space-y-1"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <p style={{ color: '#e8e2d3' }} className="font-medium">{courseName}</p>
                                <p style={{ color: '#999' }} className="text-xs">{topic}</p>
                                <p style={{ color: '#999' }} className="text-xs">Mentor: <span style={{ color: accentColor }}>{mentorName}</span></p>
                                <p className="text-lg font-bold mt-2" style={{ color: '#a78bfa' }}>
                                    S/{price?.toFixed(2)}
                                </p>
                            </div>

                            {step === 'info' && (
                                <>
                                    {/* Schedule selection */}
                                    {availability && availability.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                                Selecciona un horario:
                                            </p>
                                            <div className="space-y-1.5">
                                                {availability.map((slot, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(selectedSlot === i ? null : i)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                                                        style={{
                                                            background: selectedSlot === i ? 'rgba(108,43,217,0.15)' : 'rgba(255,255,255,0.03)',
                                                            border: selectedSlot === i ? '1.5px solid rgba(108,43,217,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                                            color: selectedSlot === i ? '#a78bfa' : '#999',
                                                        }}
                                                    >
                                                        <div
                                                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                                            style={{
                                                                borderColor: selectedSlot === i ? '#a78bfa' : '#555',
                                                            }}
                                                        >
                                                            {selectedSlot === i && (
                                                                <div className="w-2 h-2 rounded-full" style={{ background: '#a78bfa' }} />
                                                            )}
                                                        </div>
                                                        <span className="font-medium">{slot.day}</span>
                                                        <span>{slot.start} — {slot.end}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Yape instructions */}
                                    <div className="space-y-3">
                                        <p className="text-xs font-medium flex items-center gap-2" style={{ color: '#c8c8c8' }}>
                                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(108,43,217,0.2)', color: '#a78bfa' }}>1</span>
                                            Paga por Yape
                                        </p>
                                        <div
                                            className="flex items-center justify-between px-4 py-3 rounded-xl"
                                            style={{ background: 'rgba(108,43,217,0.08)', border: '1px solid rgba(108,43,217,0.2)' }}
                                        >
                                            <div>
                                                <p className="text-xs" style={{ color: '#999' }}>Enviar Yape a:</p>
                                                <p className="text-lg font-bold tracking-wider" style={{ color: '#a78bfa' }}>
                                                    {YAPE_NUMBER}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleCopyNumber}
                                                className="p-2 rounded-lg transition-all hover:scale-110"
                                                style={{ background: 'rgba(108,43,217,0.15)', color: '#a78bfa' }}
                                            >
                                                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-center" style={{ color: '#666' }}>
                                            Monto exacto: <span className="font-bold" style={{ color: '#a78bfa' }}>S/{price?.toFixed(2)}</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setStep('confirm')}
                                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        style={{
                                            background: 'linear-gradient(135deg, #6C2BD9, #8B5CF6)',
                                            color: '#fff',
                                            boxShadow: '0 4px 15px rgba(108,43,217,0.3)',
                                        }}
                                    >
                                        Siguiente
                                    </button>
                                </>
                            )}

                            {step === 'confirm' && (
                                <>
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium flex items-center gap-2" style={{ color: '#c8c8c8' }}>
                                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(108,43,217,0.2)', color: '#a78bfa' }}>2</span>
                                            Ingresa el código del voucher
                                        </p>
                                        <p className="text-[11px]" style={{ color: '#666' }}>
                                            Lo encuentras en el comprobante de Yape después de pagar.
                                        </p>
                                        <input
                                            type="text"
                                            value={yapeCode}
                                            onChange={(e) => setYapeCode(e.target.value)}
                                            placeholder="Ej: 742891"
                                            className="w-full px-4 py-3 rounded-xl text-center text-lg font-bold tracking-widest outline-none transition-all focus:ring-2"
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(108,43,217,0.3)',
                                                color: '#e8e2d3',
                                            }}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStep('info')}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#999', border: '1px solid rgba(255,255,255,0.06)' }}
                                        >
                                            Atrás
                                        </button>
                                        <button
                                            onClick={handleSubmitPayment}
                                            disabled={loading || !yapeCode.trim()}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40"
                                            style={{
                                                background: yapeCode.trim()
                                                    ? 'linear-gradient(135deg, #6C2BD9, #8B5CF6)'
                                                    : 'rgba(255,255,255,0.05)',
                                                color: yapeCode.trim() ? '#fff' : '#666',
                                            }}
                                        >
                                            {loading ? 'Registrando...' : 'Confirmar pago'}
                                        </button>
                                    </div>
                                </>
                            )}

                            <p className="text-[10px] text-center flex items-center justify-center gap-1" style={{ color: '#555' }}>
                                <ShieldCheck className="w-3 h-3" style={{ color: '#6C2BD9' }} />
                                Tu pago será verificado por el administrador
                            </p>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    )
}
