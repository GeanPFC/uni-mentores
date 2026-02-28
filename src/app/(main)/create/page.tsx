'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    HandHeart, HelpCircle, ArrowRight, ArrowLeft,
    GraduationCap, Layers, BookOpen, ChevronRight,
    Sparkles, CheckCircle2, Send, Lock, Clock, Trash2, Plus
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { UNI_FACULTIES_DATA, getCourses, CYCLE_LABELS } from '@/lib/uni-courses'

const TOTAL_STEPS = 6

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TIME_OPTIONS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00'
]

interface AvailSlot {
    day: string
    start: string
    end: string
}

export default function CreatePage() {
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [step, setStep] = useState(1)
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
    const [mounted, setMounted] = useState(false)
    const [stepMounted, setStepMounted] = useState(true)
    const [mentorStatus, setMentorStatus] = useState<'none' | 'approved'>('none')

    // Selections
    const [selectedType, setSelectedType] = useState<'OFFER' | 'REQUEST' | ''>('')
    const [selectedFaculty, setSelectedFaculty] = useState('')
    const [selectedCycle, setSelectedCycle] = useState<number | null>(null)
    const [selectedCourse, setSelectedCourse] = useState('')
    const [topic, setTopic] = useState('')
    const [description, setDescription] = useState('')
    const [priceBudget, setPriceBudget] = useState('')
    const [mode, setMode] = useState<'virtual' | 'presencial' | 'hibrido'>('virtual')
    const [urgency, setUrgency] = useState<'baja' | 'media' | 'alta'>('media')
    const [availability, setAvailability] = useState<AvailSlot[]>([])
    const [slotDay, setSlotDay] = useState('')
    const [slotStart, setSlotStart] = useState('')
    const [slotEnd, setSlotEnd] = useState('')

    useEffect(() => {
        setMounted(true)
        // Fetch mentor status
        const fetchMentorStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('mentor_status')
                    .eq('id', user.id)
                    .single()
                if (profile?.mentor_status) {
                    setMentorStatus(profile.mentor_status)
                }
            }
        }
        fetchMentorStatus()
    }, [])

    const availableCourses = useMemo(() => {
        if (selectedFaculty && selectedCycle) {
            return getCourses(selectedFaculty, selectedCycle)
        }
        return []
    }, [selectedFaculty, selectedCycle])

    const facultyColor = selectedFaculty
        ? UNI_FACULTIES_DATA[selectedFaculty]?.color || '#e8e2d3'
        : '#e8e2d3'

    const accentColor = selectedFaculty ? facultyColor : '#e8e2d3'

    // Step transition
    const goTo = (nextStep: number) => {
        setDirection(nextStep > step ? 'forward' : 'backward')
        setStepMounted(false)
        setTimeout(() => {
            setStep(nextStep)
            setStepMounted(true)
        }, 250)
    }

    const goNext = () => {
        if (step < TOTAL_STEPS) goTo(step + 1)
    }

    const goBack = () => {
        if (step > 1) goTo(step - 1)
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError('')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError('Debes iniciar sesión')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                type: selectedType,
                course: selectedCourse,
                topic,
                description: description || null,
                price_or_budget: priceBudget ? parseFloat(priceBudget) : null,
                mode,
                urgency: selectedType === 'REQUEST' ? urgency : null,
                status: 'active',
                availability: availability.length > 0 ? availability : []
            })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
        } else {
            toast('¡Publicación creada exitosamente!', 'success')
            router.push('/profile')
        }
    }

    // Can advance from current step?
    const canAdvance = () => {
        switch (step) {
            case 1: return selectedType !== ''
            case 2: return selectedFaculty !== ''
            case 3: return selectedCycle !== null
            case 4: return selectedCourse !== ''
            case 5: return topic.trim() !== ''
            case 6: return true // availability is optional
            default: return false
        }
    }

    // Step titles
    const stepTitles = [
        '',
        '¿Qué deseas hacer?',
        '¿De qué facultad?',
        '¿De qué ciclo?',
        '¿Qué curso?',
        'Últimos detalles',
        '¿Cuándo estás disponible?',
    ]

    const stepSubtitles = [
        '',
        'Elige si ofreces o necesitas ayuda',
        'Selecciona tu facultad de la UNI',
        `Selecciona el ciclo en ${selectedFaculty || '...'}`,
        `Cursos del ${selectedCycle ? CYCLE_LABELS[selectedCycle] : '...'} • ${selectedFaculty}`,
        `${selectedCourse || 'Curso'} • ${selectedFaculty}`,
        'Agrega tus horarios disponibles (opcional)',
    ]

    // Animation class
    const animClass = stepMounted
        ? 'opacity-100 translate-y-0 scale-100'
        : direction === 'forward'
            ? 'opacity-0 translate-y-6 scale-95'
            : 'opacity-0 -translate-y-6 scale-95'

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.07]"
                    style={{
                        background: accentColor,
                        top: '-10%',
                        right: '-10%',
                        animation: 'float 12s ease-in-out infinite',
                    }}
                />
                <div
                    className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05]"
                    style={{
                        background: accentColor,
                        bottom: '-5%',
                        left: '-5%',
                        animation: 'float 15s ease-in-out infinite reverse',
                    }}
                />
            </div>

            <div
                className={`w-full max-w-lg transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                {/* Progress Bar */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className="h-1.5 rounded-full transition-all duration-500"
                                style={{
                                    width: step >= s ? '2rem' : '0.75rem',
                                    background: step >= s ? accentColor : 'rgba(255,255,255,0.1)',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div
                    className="rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden"
                    style={{
                        background: 'rgba(36, 36, 36, 0.85)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: `0 25px 60px -15px rgba(0,0,0,0.5), 0 0 80px -20px ${accentColor}15`,
                    }}
                >
                    {/* Decorative corner accents */}
                    <div
                        className="absolute top-0 left-0 w-24 h-24 opacity-20 transition-colors duration-700"
                        style={{
                            background: `radial-gradient(circle at top left, ${accentColor}, transparent 70%)`,
                        }}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-32 h-32 opacity-15 transition-colors duration-700"
                        style={{
                            background: `radial-gradient(circle at bottom right, ${accentColor}, transparent 70%)`,
                        }}
                    />

                    {/* Header */}
                    <div className={`text-center mb-8 transition-all duration-300 ${animClass}`}>
                        <p className="text-xs font-mono tracking-widest mb-3 uppercase" style={{ color: accentColor }}>
                            Paso {step} de {TOTAL_STEPS}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-serif italic" style={{ color: '#e8e2d3' }}>
                            {stepTitles[step]}
                        </h1>
                        <p className="text-sm mt-2" style={{ color: '#999999' }}>
                            {stepSubtitles[step]}
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="mb-6 p-3 rounded-xl text-center text-sm animate-in fade-in slide-in-from-top-2"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Step Content */}
                    <div className={`transition-all duration-300 ease-out ${animClass}`}>

                        {/* ========================
                            STEP 1: Offer or Request
                            ======================== */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { type: 'OFFER' as const, icon: HandHeart, label: 'Ofrezco ayuda', desc: 'Comparte lo que sabes', gradient: 'from-emerald-500/20 to-teal-500/20' },
                                        { type: 'REQUEST' as const, icon: HelpCircle, label: 'Necesito ayuda', desc: 'Encuentra un mentor', gradient: 'from-amber-500/20 to-orange-500/20' },
                                    ].map(({ type, icon: Icon, label, desc }) => {
                                        const isOfferLocked = type === 'OFFER' && mentorStatus !== 'approved'
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                disabled={isOfferLocked}
                                                onClick={() => {
                                                    if (isOfferLocked) return
                                                    setSelectedType(type)
                                                    setTimeout(() => goNext(), 400)
                                                }}
                                                className={`group relative p-6 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300 ${isOfferLocked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.04]'}`}
                                                style={{
                                                    background: selectedType === type
                                                        ? 'rgba(232, 226, 211, 0.12)'
                                                        : 'rgba(255,255,255,0.03)',
                                                    border: selectedType === type
                                                        ? '2px solid #e8e2d3'
                                                        : '1px solid rgba(255,255,255,0.08)',
                                                }}
                                            >
                                                {isOfferLocked && (
                                                    <Lock
                                                        className="absolute top-3 right-3 w-4 h-4"
                                                        style={{ color: '#666' }}
                                                    />
                                                )}
                                                <div
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                                                    style={{
                                                        background: selectedType === type
                                                            ? 'rgba(232, 226, 211, 0.2)'
                                                            : 'rgba(255,255,255,0.05)',
                                                    }}
                                                >
                                                    <Icon
                                                        className="w-7 h-7 transition-colors duration-300"
                                                        style={{ color: selectedType === type ? '#e8e2d3' : '#999999' }}
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p
                                                        className="font-medium text-sm transition-colors duration-300"
                                                        style={{ color: selectedType === type ? '#e8e2d3' : '#c8c8c8' }}
                                                    >
                                                        {label}
                                                    </p>
                                                    <p className="text-xs mt-1" style={{ color: '#999999' }}>
                                                        {isOfferLocked ? 'Requiere verificación' : desc}
                                                    </p>
                                                </div>
                                                {selectedType === type && (
                                                    <CheckCircle2
                                                        className="absolute top-3 right-3 w-5 h-5 animate-in zoom-in duration-300"
                                                        style={{ color: '#e8e2d3' }}
                                                    />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                                {mentorStatus !== 'approved' && (
                                    <div
                                        className="p-4 rounded-xl text-center"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                    >
                                        <p className="text-xs mb-2" style={{ color: '#999' }}>
                                            ¿Quieres ofrecer enseñanza? Solicita ser mentor verificado
                                        </p>
                                        <a
                                            href="https://wa.me/51939157495?text=Hola%2C%20quiero%20solicitar%20ser%20mentor%20en%20UNI%20Mentores"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-all hover:scale-105"
                                            style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}
                                        >
                                            Contactar por WhatsApp
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================
                            STEP 2: Faculty
                            ======================== */}
                        {step === 2 && (
                            <div className="grid grid-cols-2 gap-2.5">
                                {Object.values(UNI_FACULTIES_DATA).map((faculty, i) => (
                                    <button
                                        key={faculty.code}
                                        type="button"
                                        onClick={() => {
                                            setSelectedFaculty(faculty.code)
                                            setSelectedCycle(null)
                                            setSelectedCourse('')
                                            setTimeout(() => goNext(), 350)
                                        }}
                                        className="group relative flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:scale-[1.03] text-left"
                                        style={{
                                            background: selectedFaculty === faculty.code
                                                ? `${faculty.color}18`
                                                : 'rgba(255,255,255,0.03)',
                                            border: selectedFaculty === faculty.code
                                                ? `2px solid ${faculty.color}50`
                                                : '1px solid rgba(255,255,255,0.06)',
                                            animationDelay: `${i * 40}ms`,
                                        }}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-125"
                                            style={{ background: faculty.color }}
                                        />
                                        <div className="min-w-0">
                                            <p
                                                className="text-sm font-semibold transition-colors duration-300"
                                                style={{ color: selectedFaculty === faculty.code ? faculty.color : '#e8e2d3' }}
                                            >
                                                {faculty.code}
                                            </p>
                                            <p className="text-[10px] truncate" style={{ color: '#999999' }}>
                                                {faculty.name}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ========================
                            STEP 3: Cycle
                            ======================== */}
                        {step === 3 && (
                            <div className="grid grid-cols-5 gap-3">
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((cycle) => {
                                    const courses = getCourses(selectedFaculty, cycle)
                                    return (
                                        <button
                                            key={cycle}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCycle(cycle)
                                                setSelectedCourse('')
                                                setTimeout(() => goNext(), 350)
                                            }}
                                            className="group relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-110"
                                            style={{
                                                background: selectedCycle === cycle
                                                    ? `${facultyColor}25`
                                                    : 'rgba(255,255,255,0.03)',
                                                border: selectedCycle === cycle
                                                    ? `2px solid ${facultyColor}`
                                                    : '1px solid rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            <span
                                                className="text-xl font-bold transition-all duration-300 group-hover:scale-110"
                                                style={{ color: selectedCycle === cycle ? facultyColor : '#c8c8c8' }}
                                            >
                                                {cycle}
                                            </span>
                                            <span className="text-[9px]" style={{ color: '#999999' }}>
                                                {courses.length} cursos
                                            </span>
                                            {selectedCycle === cycle && (
                                                <div
                                                    className="absolute -bottom-1 w-6 h-1 rounded-full animate-in fade-in duration-300"
                                                    style={{ background: facultyColor }}
                                                />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* ========================
                            STEP 4: Course
                            ======================== */}
                        {step === 4 && (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                                {availableCourses.map((course, index) => (
                                    <button
                                        key={course}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCourse(course)
                                            setTimeout(() => goNext(), 350)
                                        }}
                                        className="group w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] text-left"
                                        style={{
                                            background: selectedCourse === course
                                                ? `${facultyColor}18`
                                                : 'rgba(255,255,255,0.03)',
                                            border: selectedCourse === course
                                                ? `2px solid ${facultyColor}50`
                                                : '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:scale-110"
                                            style={{
                                                background: selectedCourse === course ? `${facultyColor}30` : 'rgba(255,255,255,0.05)',
                                                color: selectedCourse === course ? facultyColor : '#999999',
                                            }}
                                        >
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <span
                                            className="text-sm font-medium transition-colors duration-300"
                                            style={{ color: selectedCourse === course ? '#e8e2d3' : '#c8c8c8' }}
                                        >
                                            {course}
                                        </span>
                                        {selectedCourse === course && (
                                            <CheckCircle2
                                                className="w-4 h-4 ml-auto animate-in zoom-in duration-300"
                                                style={{ color: facultyColor }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ========================
                            STEP 5: Details
                            ======================== */}
                        {step === 5 && (
                            <div className="space-y-5">
                                {/* Selected summary */}
                                <div
                                    className="flex items-center gap-2 p-3 rounded-xl text-xs"
                                    style={{ background: `${facultyColor}10`, border: `1px solid ${facultyColor}20` }}
                                >
                                    <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: facultyColor }} />
                                    <span style={{ color: '#c8c8c8' }}>
                                        {selectedType === 'OFFER' ? 'Ofrezco' : 'Necesito'} •
                                        <span className="font-medium" style={{ color: facultyColor }}> {selectedFaculty}</span> •
                                        {CYCLE_LABELS[selectedCycle!]} •
                                        <span className="font-medium" style={{ color: '#e8e2d3' }}> {selectedCourse}</span>
                                    </span>
                                </div>

                                {/* Topic */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                        Tema específico *
                                    </label>
                                    <Input
                                        placeholder="Ej: Integrales dobles, Cinemática..."
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        required
                                        className="h-12 rounded-xl transition-all duration-300 focus:scale-[1.01]"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                        Descripción (opcional)
                                    </label>
                                    <textarea
                                        placeholder="Añade más detalles..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl resize-none transition-all duration-300 focus:scale-[1.01]"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>

                                {/* Price + Mode row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                            {selectedType === 'OFFER' ? 'Precio/hora' : 'Presupuesto'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#999999' }}>S/.</span>
                                            <Input
                                                type="number"
                                                placeholder="50"
                                                value={priceBudget}
                                                onChange={(e) => setPriceBudget(e.target.value)}
                                                className="h-11 pl-10 rounded-xl"
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    color: '#ffffff'
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] mt-1.5" style={{ color: '#666' }}>
                                            Mentores suelen cobrar entre S/.20-60/hr
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                            Modalidad
                                        </label>
                                        <select
                                            value={mode}
                                            onChange={(e) => setMode(e.target.value as typeof mode)}
                                            className="w-full h-11 px-3 rounded-xl text-sm"
                                            style={{
                                                background: '#2a2a2a',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: '#ffffff',
                                            }}
                                        >
                                            <option value="virtual" style={{ background: '#2a2a2a', color: '#ffffff' }}>Virtual</option>
                                            <option value="presencial" style={{ background: '#2a2a2a', color: '#ffffff' }}>Presencial</option>
                                            <option value="hibrido" style={{ background: '#2a2a2a', color: '#ffffff' }}>Híbrido</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Urgency (REQUEST only) */}
                                {selectedType === 'REQUEST' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                            Urgencia
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {([
                                                { v: 'baja' as const, label: 'Baja', sub: 'Tengo tiempo' },
                                                { v: 'media' as const, label: 'Media', sub: 'Esta semana' },
                                                { v: 'alta' as const, label: 'Alta', sub: '¡Urgente!' },
                                            ]).map(({ v, label, sub }) => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setUrgency(v)}
                                                    className="p-3 rounded-xl text-center transition-all duration-300 hover:scale-[1.03]"
                                                    style={{
                                                        background: urgency === v ? `${facultyColor}15` : 'rgba(255,255,255,0.03)',
                                                        border: urgency === v ? `2px solid ${facultyColor}50` : '1px solid rgba(255,255,255,0.06)',
                                                    }}
                                                >
                                                    <p
                                                        className="text-xs font-medium"
                                                        style={{ color: urgency === v ? facultyColor : '#c8c8c8' }}
                                                    >
                                                        {label}
                                                    </p>
                                                    <p className="text-[10px] mt-0.5" style={{ color: '#999999' }}>{sub}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================
                            STEP 6: Availability
                            ======================== */}
                        {step === 6 && (
                            <div className="space-y-5">
                                {/* Add slot form */}
                                <div
                                    className="p-4 rounded-2xl space-y-4"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <p className="text-xs font-medium" style={{ color: '#c8c8c8' }}>
                                        <Clock className="w-3.5 h-3.5 inline mr-1.5" style={{ color: facultyColor }} />
                                        Agregar horario
                                    </p>

                                    {/* Day selector */}
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => setSlotDay(day)}
                                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                                                style={{
                                                    background: slotDay === day ? `${facultyColor}20` : 'rgba(255,255,255,0.04)',
                                                    border: slotDay === day ? `1.5px solid ${facultyColor}60` : '1px solid rgba(255,255,255,0.08)',
                                                    color: slotDay === day ? facultyColor : '#999',
                                                }}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Time selectors */}
                                    {slotDay && (
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-medium mb-1 block" style={{ color: '#999' }}>Desde</label>
                                                <select
                                                    value={slotStart}
                                                    onChange={(e) => setSlotStart(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: '#e8e2d3'
                                                    }}
                                                >
                                                    <option value="" style={{ background: '#2a2a2a' }}>--:--</option>
                                                    {TIME_OPTIONS.map(t => (
                                                        <option key={t} value={t} style={{ background: '#2a2a2a' }}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <span className="text-sm mt-4" style={{ color: '#666' }}>→</span>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-medium mb-1 block" style={{ color: '#999' }}>Hasta</label>
                                                <select
                                                    value={slotEnd}
                                                    onChange={(e) => setSlotEnd(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: '#e8e2d3'
                                                    }}
                                                >
                                                    <option value="" style={{ background: '#2a2a2a' }}>--:--</option>
                                                    {TIME_OPTIONS.filter(t => t > slotStart).map(t => (
                                                        <option key={t} value={t} style={{ background: '#2a2a2a' }}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={!slotDay || !slotStart || !slotEnd}
                                                onClick={() => {
                                                    if (slotDay && slotStart && slotEnd) {
                                                        setAvailability(prev => [...prev, { day: slotDay, start: slotStart, end: slotEnd }])
                                                        setSlotDay('')
                                                        setSlotStart('')
                                                        setSlotEnd('')
                                                    }
                                                }}
                                                className="mt-4 p-2 rounded-xl transition-all duration-200 disabled:opacity-30"
                                                style={{
                                                    background: slotDay && slotStart && slotEnd ? `${facultyColor}20` : 'rgba(255,255,255,0.04)',
                                                    color: facultyColor
                                                }}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Added slots */}
                                {availability.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium" style={{ color: '#999' }}>Horarios agregados:</p>
                                        {availability.map((slot, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                                                style={{ background: `${facultyColor}08`, border: `1px solid ${facultyColor}20` }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" style={{ color: facultyColor }} />
                                                    <span className="text-sm font-medium" style={{ color: '#e8e2d3' }}>
                                                        {slot.day}
                                                    </span>
                                                    <span className="text-sm" style={{ color: '#999' }}>
                                                        {slot.start} — {slot.end}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvailability(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="p-1 rounded-lg transition-all hover:scale-110"
                                                    style={{ color: '#ef4444' }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {availability.length === 0 && (
                                    <p className="text-center text-xs py-4" style={{ color: '#666' }}>
                                        Puedes publicar sin horarios, pero agregarlos ayuda a que te contacten más rápido.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Back */}
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={goBack}
                                className="flex items-center gap-2 text-sm transition-all duration-300 hover:opacity-70 hover:-translate-x-1"
                                style={{ color: '#c8c8c8' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Atrás
                            </button>
                        ) : (
                            <div />
                        )}

                        {/* Next / Submit */}
                        {step < TOTAL_STEPS ? (
                            <button
                                type="button"
                                onClick={goNext}
                                disabled={!canAdvance()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:translate-x-1 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:translate-x-0"
                                style={{
                                    background: canAdvance() ? accentColor : 'rgba(255,255,255,0.05)',
                                    color: canAdvance() ? '#1a1a1a' : '#999999',
                                }}
                            >
                                Continuar
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || !canAdvance()}
                                className="flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                                style={{
                                    background: canAdvance()
                                        ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                                        : 'rgba(255,255,255,0.05)',
                                    color: canAdvance() ? '#1a1a1a' : '#999999',
                                    boxShadow: canAdvance() ? `0 8px 30px -8px ${accentColor}50` : 'none',
                                }}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Publicando...
                                    </span>
                                ) : (
                                    <>
                                        Publicar
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Step hint below card */}
                <div className="text-center mt-6">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {step < TOTAL_STEPS - 1
                            ? 'Selecciona una opción para continuar'
                            : step === TOTAL_STEPS - 1
                                ? 'Completa el tema para continuar'
                                : 'Agrega horarios o publica directamente'
                        }
                    </p>
                </div>
            </div>

            {/* Keyframe animation */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                }
            `}</style>
        </div>
    )
}
