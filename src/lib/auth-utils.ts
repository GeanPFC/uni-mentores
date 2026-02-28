/**
 * Auth utilities: validation, error mapping, and security helpers
 */

// --- Domain Validation ---
export const ALLOWED_DOMAINS = ['@uni.edu.pe', '@uni.pe']

export function isUniEmail(email: string): boolean {
    return ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain))
}

// --- Error Mapping (Supabase → Spanish) ---
const ERROR_MAP: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos',
    'Email not confirmed': 'Confirma tu correo antes de iniciar sesión',
    'User already registered': 'Este correo ya está registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
    'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo puedes solicitar esto cada 60 segundos.',
    'New password should be different from the old password.': 'La nueva contraseña debe ser diferente a la anterior.',
    'Auth session missing!': 'Tu sesión ha expirado. Solicita un nuevo enlace de recuperación.',
    'Token has expired or is invalid': 'El enlace ha expirado. Solicita uno nuevo.',
    'User not found': 'No se encontró una cuenta con ese correo.',
    'Signup requires a valid password': 'Ingresa una contraseña válida.',
    'Unable to validate email address: invalid format': 'El formato del correo no es válido.',
    'Email link is invalid or has expired': 'El enlace ha expirado o es inválido. Solicita uno nuevo.',
    'A user with this email address has already been registered': 'Este correo ya está registrado.',
    'Password should contain at least one character of each': 'La contraseña debe incluir mayúsculas, números y caracteres especiales.',
    'over_email_send_rate_limit': 'Demasiados correos enviados. Espera unos minutos.',
}

export function mapAuthError(message: string): string {
    return ERROR_MAP[message] || 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// --- Input Sanitization ---
export function sanitizeName(name: string): string {
    return name
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[^\p{L}\p{M}\s'-]/gu, '') // Only letters, accents, spaces, hyphens, apostrophes
        .trim()
        .substring(0, 100) // Max 100 chars
}

export function isNameValid(name: string): boolean {
    const sanitized = sanitizeName(name)
    const words = sanitized.split(/\s+/).filter(w => w.length >= 2)
    return words.length >= 2
}

// --- Password Strength ---
const PASSWORD_REQUIREMENTS = [
    { label: 'Mínimo 6 caracteres', test: (p: string) => p.length >= 6 },
    { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export function getPasswordScore(password: string): number {
    return PASSWORD_REQUIREMENTS.filter(r => r.test(password)).length
}

export function isPasswordAcceptable(password: string): boolean {
    // Require at least: 6 chars + uppercase + number (score >= 3)
    return getPasswordScore(password) >= 3
}

// --- Rate Limiting (client-side) ---
const LOGIN_ATTEMPTS_KEY = 'uni_login_attempts'
const LOCKOUT_KEY = 'uni_login_lockout'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30_000 // 30 seconds

interface LoginAttempts {
    count: number
    firstAttempt: number
}

export function checkLoginRateLimit(): { blocked: boolean; remainingSeconds: number } {
    try {
        const lockoutUntil = localStorage.getItem(LOCKOUT_KEY)
        if (lockoutUntil) {
            const remaining = parseInt(lockoutUntil) - Date.now()
            if (remaining > 0) {
                return { blocked: true, remainingSeconds: Math.ceil(remaining / 1000) }
            }
            // Lockout expired, clear it
            localStorage.removeItem(LOCKOUT_KEY)
            localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
        }
    } catch {
        // localStorage not available
    }
    return { blocked: false, remainingSeconds: 0 }
}

export function recordFailedLogin(): { blocked: boolean; remainingSeconds: number } {
    try {
        const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
        let attempts: LoginAttempts = raw ? JSON.parse(raw) : { count: 0, firstAttempt: Date.now() }

        // Reset counter if window expired (5 minutes)
        if (Date.now() - attempts.firstAttempt > 300_000) {
            attempts = { count: 0, firstAttempt: Date.now() }
        }

        attempts.count++
        localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts))

        if (attempts.count >= MAX_ATTEMPTS) {
            const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
            localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil))
            localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
            return { blocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) }
        }
    } catch {
        // localStorage not available
    }
    return { blocked: false, remainingSeconds: 0 }
}

export function clearLoginAttempts(): void {
    try {
        localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
        localStorage.removeItem(LOCKOUT_KEY)
    } catch {
        // localStorage not available
    }
}

// --- Redirect Validation ---
export function sanitizeRedirectPath(path: string | null): string {
    if (!path) return '/explore'
    // Must start with / and not start with // (open redirect)
    if (path.startsWith('/') && !path.startsWith('//') && !path.includes('://')) {
        return path
    }
    return '/explore'
}

// --- Cooldown Timer ---
const COOLDOWN_KEY = 'uni_email_cooldown'

export function getCooldownRemaining(): number {
    try {
        const until = localStorage.getItem(COOLDOWN_KEY)
        if (until) {
            const remaining = parseInt(until) - Date.now()
            if (remaining > 0) return Math.ceil(remaining / 1000)
            localStorage.removeItem(COOLDOWN_KEY)
        }
    } catch { /* */ }
    return 0
}

export function setCooldown(seconds: number): void {
    try {
        localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000))
    } catch { /* */ }
}
