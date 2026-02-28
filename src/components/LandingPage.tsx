'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const galleryImages = [
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60",
]

export default function LandingPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user)
            setCheckingAuth(false)
        })
    }, [])

    return (
        <div className="relative min-h-screen bg-[#121212] font-sans overflow-hidden text-gray-200">
            {/* Google Font */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
                .font-serif-custom { font-family: 'Playfair Display', serif; }
            `}</style>

            {/* Background image + dark overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                    alt="Biblioteca"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/95 via-[#121212]/80 to-[#121212]" />
            </div>

            {/* ── Pill Navbar ── */}
            <nav className="relative z-50 pt-6 px-4 flex justify-center w-full">
                <div className="w-full max-w-6xl bg-[#1e1e1e] border border-gray-800 rounded-full px-6 py-3 flex items-center justify-between shadow-xl">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="UNI Mentores" className="w-8 h-8 rounded object-contain" />
                        <span className="font-bold text-white text-lg tracking-wide">UNI Mentores</span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
                        <Link href="/" className="text-white hover:text-white transition-colors">Inicio</Link>
                        <Link href="/explore" className="hover:text-white transition-colors">Explorar</Link>
                        {!isLoggedIn && (
                            <Link href="/register" className="hover:text-white transition-colors">Registrarse</Link>
                        )}
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-4">
                        {checkingAuth ? (
                            <div className="w-24 h-9 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        ) : isLoggedIn ? (
                            <>
                                <Link
                                    href="/explore"
                                    className="bg-teal-400 hover:bg-teal-500 text-gray-900 font-semibold px-5 py-2 rounded-full text-sm transition-colors shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                                >
                                    Ir a la app
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-white text-gray-400 transition-colors"
                                >
                                    <User size={16} />
                                    Ingresar
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-teal-400 hover:bg-teal-500 text-gray-900 font-semibold px-5 py-2 rounded-full text-sm transition-colors shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                                >
                                    ÚNETE AHORA
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ── Hero Section ── */}
            <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4 text-center mt-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h1 className="text-5xl md:text-7xl font-serif-custom font-semibold text-white tracking-tight drop-shadow-md">
                        Mentoría para <span className="italic text-teal-400">todos.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed drop-shadow">
                        UNI Mentores es gratis en cualquier dispositivo. Encuentra la ayuda
                        académica que necesitas, donde sea que estés.
                    </p>

                    <div className="flex flex-col items-center gap-6 pt-4">
                        {isLoggedIn ? (
                            <Link
                                href="/explore"
                                className="bg-teal-400 hover:bg-teal-500 text-gray-900 font-bold px-8 py-3.5 rounded-full text-sm uppercase tracking-wide transition-transform hover:scale-105 shadow-[0_4px_20px_rgba(45,212,191,0.3)]"
                            >
                                IR A EXPLORAR
                            </Link>
                        ) : (
                            <Link
                                href="/register"
                                className="bg-teal-400 hover:bg-teal-500 text-gray-900 font-bold px-8 py-3.5 rounded-full text-sm uppercase tracking-wide transition-transform hover:scale-105 shadow-[0_4px_20px_rgba(45,212,191,0.3)]"
                            >
                                CREAR CUENTA
                            </Link>
                        )}

                        <Link
                            href="/explore"
                            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white underline underline-offset-4 transition-colors"
                        >
                            Ir a Explorar
                        </Link>
                    </div>

                    {/* Bouncing arrow */}
                    <div className="flex justify-center mt-12 animate-bounce opacity-70">
                        <div className="w-10 h-10 border border-gray-600 rounded-full flex items-center justify-center backdrop-blur-sm bg-black/20">
                            <ChevronDown size={20} className="text-gray-300" />
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Gallery ── */}
            <div className="relative z-10 w-full overflow-hidden pb-8 px-4">
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#121212] to-transparent z-20 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#121212] to-transparent z-20 pointer-events-none" />

                <div className="flex items-end justify-center gap-3 overflow-x-auto snap-x scrollbar-hide">
                    {galleryImages.map((src, index) => (
                        <div
                            key={index}
                            className={`relative flex-shrink-0 rounded-xl overflow-hidden shadow-lg snap-center border border-gray-800 transition-all duration-300 cursor-pointer ${index === 2 || index === 3
                                ? 'w-48 md:w-64 h-48 md:h-64 z-10'
                                : 'w-32 md:w-48 h-32 md:h-48 opacity-80 hover:opacity-100'
                                }`}
                        >
                            <img
                                src={src}
                                alt={`Estudiantes ${index}`}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors duration-300" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
