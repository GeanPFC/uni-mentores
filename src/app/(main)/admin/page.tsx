'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    ShieldCheck, ShieldOff, Search, Users, GraduationCap,
    BookOpen, ChevronDown, Filter, RefreshCw, Phone,
    DollarSign, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useModal } from '@/components/ui/modal'
import { UNI_FACULTIES_DATA } from '@/lib/uni-courses'
import { useRouter } from 'next/navigation'

type AdminUser = {
    id: string
    name: string
    faculty: string
    cycle: string | null
    avatar_url: string | null
    mentor_status: 'none' | 'approved'
    role: string
    created_at: string
    is_active: boolean
    whatsapp: string | null
}

type Payment = {
    id: string
    student_id: string
    mentor_id: string
    post_id: string
    amount: number
    yape_code: string
    course: string
    topic: string
    scheduled_day: string | null
    scheduled_start: string | null
    scheduled_end: string | null
    status: 'pending' | 'confirmed' | 'rejected'
    created_at: string
    student: { name: string; faculty: string } | null
    mentor: { name: string; faculty: string } | null
}

type Tab = 'all' | 'mentors' | 'payments'

export default function AdminPage() {
    const supabase = createClient()
    const router = useRouter()
    const { toast } = useToast()
    const { showConfirm } = useModal()
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<Tab>('all')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [payments, setPayments] = useState<Payment[]>([])
    const [paymentFilter, setPaymentFilter] = useState<'pending' | 'confirmed' | 'rejected' | 'all'>('pending')

    const fetchUsers = useCallback(async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, faculty, cycle, avatar_url, mentor_status, role, created_at, is_active, whatsapp')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setUsers(data as AdminUser[])
        }
        setLoading(false)
    }, [supabase])

    const fetchPayments = useCallback(async () => {
        const { data, error } = await supabase
            .from('payments')
            .select('*, student:profiles!payments_student_id_fkey(name, faculty), mentor:profiles!payments_mentor_id_fkey(name, faculty)')
            .order('created_at', { ascending: false })
        if (!error && data) {
            setPayments(data as unknown as Payment[])
        }
    }, [supabase])

    useEffect(() => {
        setMounted(true)

        const checkAdminAndLoad = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/home')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                router.push('/home')
                return
            }

            setIsAdmin(true)
            await fetchUsers()
            await fetchPayments()
        }

        checkAdminAndLoad()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleMentorStatus = async (user: AdminUser) => {
        const newStatus = user.mentor_status === 'approved' ? 'none' : 'approved'
        const action = newStatus === 'approved' ? 'aprobar como mentor' : 'revocar mentor de'

        showConfirm(
            `¿${newStatus === 'approved' ? 'Aprobar' : 'Revocar'} mentor?`,
            `¿Estás seguro de ${action} ${user.name}?`,
            async () => {
                setActionLoading(user.id)

                const { error, data, count } = await supabase
                    .from('profiles')
                    .update({ mentor_status: newStatus })
                    .eq('id', user.id)
                    .select()

                console.log('Update result:', { error, data, count, userId: user.id, newStatus })

                if (error) {
                    console.error('Mentor status update error:', error)
                    toast('Error: ' + error.message, 'error')
                } else if (!data || data.length === 0) {
                    console.error('Update returned no rows - RLS policy may be blocking the update')
                    toast('Error: No se pudo actualizar. Verifica permisos de admin.', 'error')
                } else {
                    // Re-fetch all users to confirm change persisted
                    await fetchUsers()
                    toast(
                        newStatus === 'approved'
                            ? `${user.name} es ahora mentor verificado ✓`
                            : `Se revocó el estado de mentor de ${user.name}`,
                        'success'
                    )
                }
                setActionLoading(null)
            },
            true
        )
    }

    const confirmPayment = async (paymentId: string) => {
        setActionLoading(paymentId)
        const { error } = await supabase
            .from('payments')
            .update({ status: 'confirmed' })
            .eq('id', paymentId)
        if (error) {
            toast('Error al confirmar: ' + error.message, 'error')
        } else {
            toast('¡Pago confirmado!', 'success')
            setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'confirmed' } : p))
        }
        setActionLoading(null)
    }

    const rejectPayment = async (paymentId: string) => {
        setActionLoading(paymentId)
        const { error } = await supabase
            .from('payments')
            .update({ status: 'rejected' })
            .eq('id', paymentId)
        if (error) {
            toast('Error al rechazar: ' + error.message, 'error')
        } else {
            toast('Pago rechazado', 'success')
            setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'rejected' } : p))
        }
        setActionLoading(null)
    }

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchQuery === '' ||
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.faculty.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesTab = activeTab === 'all' ||
            (activeTab === 'mentors' && user.mentor_status === 'approved')

        return matchesSearch && matchesTab
    })

    // Stats
    const totalUsers = users.length
    const totalMentors = users.filter(u => u.mentor_status === 'approved').length
    const pendingPayments = payments.filter(p => p.status === 'pending').length

    if (!isAdmin || loading) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#242424' }}>
                    <div className="h-24" style={{ background: '#333' }} />
                    <div className="p-6 space-y-4">
                        <div className="h-6 w-48 rounded" style={{ background: '#333' }} />
                        <div className="h-10 w-full rounded-xl" style={{ background: '#333' }} />
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 rounded-xl" style={{ background: '#333' }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-PE', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'all', label: 'Todos', count: totalUsers },
        { key: 'mentors', label: 'Mentores', count: totalMentors },
        { key: 'payments', label: '💰 Pagos', count: pendingPayments },
    ]

    return (
        <div className={`max-w-4xl mx-auto space-y-5 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* ─── Header ─── */}
            <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(36, 36, 36, 0.9) 50%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
            >
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />

                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h1 className="text-2xl font-serif italic mb-1" style={{ color: '#e8e2d3' }}>
                            Panel de Administración
                        </h1>
                        <p className="text-sm" style={{ color: '#999' }}>
                            Gestiona mentores verificados
                        </p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchUsers(); fetchPayments() }}
                        className="p-2.5 rounded-xl transition-all hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                        <RefreshCw className="w-4 h-4" style={{ color: '#999' }} />
                    </button>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mt-5">
                    <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-2xl font-bold" style={{ color: '#e8e2d3' }}>{totalUsers}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888' }}>Usuarios</p>
                    </div>
                    <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.08)' }}>
                        <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{totalMentors}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888' }}>Mentores</p>
                    </div>
                    <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(108,43,217,0.08)' }}>
                        <p className="text-2xl font-bold" style={{ color: '#a78bfa' }}>{pendingPayments}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888' }}>Pagos pendientes</p>
                    </div>
                </div>
            </div>

            {/* ─── Search + Tabs ─── */}
            <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre o facultad..."
                        className="w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none transition-all focus:ring-2"
                        style={{
                            background: '#242424',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#e8e2d3',
                            '--tw-ring-color': '#6366f1',
                        } as React.CSSProperties}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                            style={{
                                background: activeTab === tab.key ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.04)',
                                color: activeTab === tab.key ? '#818cf8' : '#888',
                                border: activeTab === tab.key ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                            }}
                        >
                            {tab.label}
                            <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{
                                    background: activeTab === tab.key ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.08)',
                                }}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Users List ─── */}
            <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#555' }} />
                        <p className="text-sm" style={{ color: '#888' }}>
                            {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios en esta categoría'}
                        </p>
                    </div>
                ) : (
                    filteredUsers.map((user, index) => {
                        const facultyData = UNI_FACULTIES_DATA[user.faculty]
                        const facultyColor = facultyData?.color || '#888'
                        const isApproved = user.mentor_status === 'approved'

                        return (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.005]"
                                style={{
                                    background: '#242424',
                                    border: isApproved
                                        ? '1px solid rgba(34, 197, 94, 0.15)'
                                        : '1px solid rgba(255,255,255,0.06)',
                                    animationDelay: `${index * 50}ms`,
                                }}
                            >
                                {/* Avatar */}
                                <Avatar className="h-12 w-12 flex-shrink-0">
                                    <AvatarImage src={user.avatar_url || undefined} />
                                    <AvatarFallback
                                        style={{
                                            background: `linear-gradient(135deg, ${facultyColor}, ${facultyColor}cc)`,
                                            color: '#fff',
                                        }}
                                        className="text-lg font-bold"
                                    >
                                        {user.name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm truncate" style={{ color: '#e8e2d3' }}>
                                            {user.name}
                                        </p>
                                        {isApproved && (
                                            <span
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                                style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                                            >
                                                <ShieldCheck className="w-3 h-3" />
                                                Mentor
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="flex items-center gap-1 text-xs" style={{ color: facultyColor }}>
                                            <GraduationCap className="w-3 h-3" />
                                            {facultyData?.name || user.faculty}
                                        </span>
                                        {user.cycle && (
                                            <span className="flex items-center gap-1 text-xs" style={{ color: '#666' }}>
                                                <BookOpen className="w-3 h-3" />
                                                Ciclo {user.cycle}
                                            </span>
                                        )}
                                        <span className="text-xs" style={{ color: '#555' }}>
                                            {formatDate(user.created_at)}
                                        </span>
                                        {user.whatsapp && (
                                            <a
                                                href={`https://wa.me/51${user.whatsapp}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs transition-all hover:scale-105"
                                                style={{ color: '#25D366' }}
                                            >
                                                <Phone className="w-3 h-3" />
                                                {user.whatsapp}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => toggleMentorStatus(user)}
                                    disabled={actionLoading === user.id}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all hover:scale-105 flex-shrink-0 disabled:opacity-50"
                                    style={
                                        isApproved
                                            ? { background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }
                                            : { background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }
                                    }
                                >
                                    {actionLoading === user.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : isApproved ? (
                                        <>
                                            <ShieldOff className="w-3.5 h-3.5" />
                                            Revocar
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Aprobar
                                        </>
                                    )}
                                </button>
                            </div>
                        )
                    })
                )}
            </div>

            {/* ─── Payments List ─── */}
            {activeTab === 'payments' && (
                <div className="space-y-3">
                    {/* Payment filter */}
                    <div className="flex gap-2">
                        {(['pending', 'confirmed', 'rejected', 'all'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setPaymentFilter(f)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                style={{
                                    background: paymentFilter === f ? 'rgba(108,43,217,0.2)' : 'rgba(255,255,255,0.04)',
                                    color: paymentFilter === f ? '#a78bfa' : '#888',
                                    border: paymentFilter === f ? '1px solid rgba(108,43,217,0.3)' : '1px solid transparent',
                                }}
                            >
                                {f === 'pending' ? '🟡 Pendientes' : f === 'confirmed' ? '🟢 Confirmados' : f === 'rejected' ? '🔴 Rechazados' : 'Todos'}
                            </button>
                        ))}
                    </div>

                    {/* Payments */}
                    {payments
                        .filter(p => paymentFilter === 'all' || p.status === paymentFilter)
                        .map((payment, idx) => (
                            <div
                                key={payment.id}
                                className="p-4 rounded-xl"
                                style={{
                                    background: '#242424',
                                    border: payment.status === 'pending'
                                        ? '1px solid rgba(234,179,8,0.2)'
                                        : payment.status === 'confirmed'
                                            ? '1px solid rgba(34,197,94,0.2)'
                                            : '1px solid rgba(239,68,68,0.2)',
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                                style={{
                                                    background: payment.status === 'pending' ? 'rgba(234,179,8,0.15)'
                                                        : payment.status === 'confirmed' ? 'rgba(34,197,94,0.15)'
                                                            : 'rgba(239,68,68,0.15)',
                                                    color: payment.status === 'pending' ? '#eab308'
                                                        : payment.status === 'confirmed' ? '#22c55e'
                                                            : '#ef4444',
                                                }}
                                            >
                                                {payment.status === 'pending' ? 'Pendiente' : payment.status === 'confirmed' ? 'Confirmado' : 'Rechazado'}
                                            </span>
                                            <span className="text-xs" style={{ color: '#666' }}>
                                                {new Date(payment.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: '#e8e2d3' }}>
                                            {payment.course} — {payment.topic}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#999' }}>
                                            <span>👨‍🎓 {payment.student?.name || 'Alumno'}</span>
                                            <span>👨‍🏫 {payment.mentor?.name || 'Mentor'}</span>
                                        </div>
                                        {payment.scheduled_day && (
                                            <p className="text-xs" style={{ color: '#a78bfa' }}>
                                                🕐 {payment.scheduled_day} {payment.scheduled_start} — {payment.scheduled_end}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-lg font-bold" style={{ color: '#a78bfa' }}>
                                                S/{payment.amount.toFixed(2)}
                                            </span>
                                            <span
                                                className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold"
                                                style={{ background: 'rgba(108,43,217,0.1)', color: '#c4b5fd' }}
                                            >
                                                Yape: {payment.yape_code}
                                            </span>
                                        </div>
                                    </div>

                                    {payment.status === 'pending' && (
                                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                                            <button
                                                onClick={() => confirmPayment(payment.id)}
                                                disabled={actionLoading === payment.id}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Confirmar
                                            </button>
                                            <button
                                                onClick={() => rejectPayment(payment.id)}
                                                disabled={actionLoading === payment.id}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Rechazar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    }

                    {payments.filter(p => paymentFilter === 'all' || p.status === paymentFilter).length === 0 && (
                        <div className="text-center py-12 rounded-2xl" style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: '#555' }} />
                            <p className="text-sm" style={{ color: '#888' }}>No hay pagos en esta categoría</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
