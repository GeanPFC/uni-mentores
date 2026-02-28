/**
 * Scalable rate limiter using Upstash Redis.
 * Works correctly in Vercel serverless (shared state across instances).
 * Falls back to in-memory if Redis env vars are not configured (dev mode).
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Redis-backed rate limiters (production) ───────────────────────
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null

// Pre-configured limiters for each action
const loginLimiter = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s'), prefix: 'rl:login' })
    : null

const registerLimiter = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '3600 s'), prefix: 'rl:register' })
    : null

const forgotPasswordLimiter = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '900 s'), prefix: 'rl:forgot-password' })
    : null

// ─── In-memory fallback (dev / no Redis configured) ────────────────
interface RateLimitEntry { timestamps: number[] }
const memoryStore = new Map<string, RateLimitEntry>()

function memoryRateLimit(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    let entry = memoryStore.get(key)
    if (!entry) {
        entry = { timestamps: [] }
        memoryStore.set(key, entry)
    }

    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs)

    if (entry.timestamps.length >= maxAttempts) {
        const retryAfterMs = windowMs - (now - entry.timestamps[0])
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
    }

    entry.timestamps.push(now)
    return { allowed: true, remaining: maxAttempts - entry.timestamps.length, retryAfterSeconds: 0 }
}

// ─── Public API (same interface as before) ─────────────────────────
export interface RateLimitResult {
    allowed: boolean
    remaining: number
    retryAfterSeconds: number
}

const limiterMap: Record<string, Ratelimit | null> = {
    login: loginLimiter,
    register: registerLimiter,
    'forgot-password': forgotPasswordLimiter,
}

/**
 * Check and record a rate limit hit.
 * Uses Upstash Redis in production, in-memory in dev.
 */
export async function rateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
): Promise<RateLimitResult> {
    // Extract action prefix (e.g., "login" from "login:192.168.1.1")
    const action = key.split(':')[0]
    const limiter = limiterMap[action]

    if (limiter) {
        // Use Upstash Redis
        const { success, remaining, reset } = await limiter.limit(key)
        if (success) {
            return { allowed: true, remaining, retryAfterSeconds: 0 }
        }
        const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(retryAfterSeconds, 1) }
    }

    // Fallback to in-memory (dev mode / no Redis)
    return memoryRateLimit(key, maxAttempts, windowMs)
}

/**
 * Get client IP from request headers (works with Vercel, proxies, etc.)
 */
export function getClientIP(request: Request): string {
    const headers = new Headers(request.headers)
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    )
}
