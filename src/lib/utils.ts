import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `hace ${diffMins}m`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays}d`
  return formatDate(date)
}

// Price formatting
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'A convenir'
  return `S/. ${price.toFixed(2)}`
}

// Generate UUID v4
export function generateUUID(): string {
  return crypto.randomUUID()
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// Check if online (last seen within 5 minutes)
export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  const d = new Date(lastSeen)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  return diffMs < 5 * 60 * 1000 // 5 minutes
}

// Faculty display names
export const FACULTIES: Record<string, string> = {
  'FIECS': 'Ingeniería Económica, Estadística y Ciencias Sociales',
  'FIC': 'Ingeniería Civil',
  'FIEE': 'Ingeniería Eléctrica y Electrónica',
  'FIM': 'Ingeniería Mecánica',
  'FIIS': 'Ingeniería Industrial y de Sistemas',
  'FC': 'Ciencias',
  'FAUA': 'Arquitectura, Urbanismo y Artes',
  'FIP': 'Ingeniería de Petróleo, Gas Natural y Petroquímica',
  'FIGMM': 'Ingeniería Geológica, Minera y Metalúrgica',
  'FIQA': 'Ingeniería Química y Textil',
  'FIA': 'Ingeniería Ambiental'
}

// Post type labels
export const POST_TYPES = {
  OFFER: { label: 'Ofrezco ayuda', color: 'green' },
  REQUEST: { label: 'Necesito ayuda', color: 'blue' }
}

// Session status labels
export const SESSION_STATUS = {
  pending: { label: 'Pendiente', color: 'yellow' },
  confirmed: { label: 'Confirmada', color: 'blue' },
  in_progress: { label: 'En progreso', color: 'purple' },
  completed: { label: 'Completada', color: 'green' },
  cancelled: { label: 'Cancelada', color: 'red' }
}
