import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
        throw new Error(
            '❌ Faltan credenciales de test.\n' +
            'Crea un archivo .env.test en la raíz del proyecto con:\n' +
            '  TEST_USER_EMAIL=tucorreo@uni.pe\n' +
            '  TEST_USER_PASSWORD=tucontraseña'
        )
    }

    // ========================================
    // Step 0: Pre-warm routes (Next.js compiles on first access)
    // This avoids timeouts during login due to compilation
    // ========================================
    console.log('🔥 Pre-warming routes...')

    // Warm up the login page
    await page.goto('/login')
    await page.waitForLoadState('load')
    await page.waitForTimeout(3000)

    // Warm up the API auth route by making a dummy request
    await page.evaluate(async () => {
        try {
            await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'warmup@uni.pe' }),
            })
        } catch { /* ignore errors, just warming up compilation */ }
    })
    await page.waitForTimeout(3000)

    // Warm up the explore page (where we redirect after login)
    await page.goto('/explore')
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    console.log('✅ Routes pre-warmed')

    // ========================================
    // Step 1: Navigate to login page
    // ========================================
    await page.goto('/login')
    await page.waitForTimeout(2000) // Wait for mount animations

    // ========================================
    // Step 2: Fill login form
    // ========================================
    const emailInput = page.locator('#login-email')
    const passwordInput = page.locator('#login-password')

    await expect(emailInput).toBeVisible({ timeout: 10_000 })
    await expect(passwordInput).toBeVisible({ timeout: 10_000 })

    await emailInput.fill(email)
    await passwordInput.fill(password)

    // ========================================
    // Step 3: Submit and wait for redirect
    // ========================================
    await page.locator('form[aria-label="Formulario de inicio de sesión"] button[type="submit"]').click()

    // Wait longer — API call + Supabase auth + router.push can take time
    await page.waitForURL('**/explore**', { timeout: 60_000 })

    // Verify we're logged in
    await expect(page.locator('header')).toBeVisible({ timeout: 10_000 })

    // ========================================
    // Step 4: Save authentication state
    // ========================================
    await page.context().storageState({ path: authFile })
    console.log('✅ Authentication saved')
})
