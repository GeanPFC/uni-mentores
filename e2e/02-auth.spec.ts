import { test, expect } from '@playwright/test'

test.describe('Autenticación', () => {

    // These tests run WITHOUT auth state (fresh browser)
    test.use({ storageState: { cookies: [], origins: [] } })

    test('la página de login carga correctamente', async ({ page }) => {
        await page.goto('/login')
        await page.waitForTimeout(3000)

        // Email input
        await expect(page.locator('#login-email')).toBeVisible()
        // Password input
        await expect(page.locator('#login-password')).toBeVisible()

        // Submit button inside the form (avoid matching Google button too)
        const form = page.locator('form[aria-label="Formulario de inicio de sesión"]')
        await expect(form.locator('button[type="submit"]')).toBeVisible()

        // Link to register
        await expect(page.getByText('Regístrate')).toBeVisible()

        // Link to forgot password
        await expect(page.getByText('¿Olvidaste tu contraseña?')).toBeVisible()
    })

    test('login con email no-UNI muestra error de validación', async ({ page }) => {
        await page.goto('/login')
        await page.waitForTimeout(3000)

        await page.locator('#login-email').fill('test@gmail.com')
        await page.locator('#login-password').fill('password123')

        // Click submit button inside the form
        await page.locator('form[aria-label="Formulario de inicio de sesión"] button[type="submit"]').click()

        // Should show UNI domain error
        const errorMsg = page.getByText(/solo se permiten correos @uni/i)
        await expect(errorMsg).toBeVisible({ timeout: 5000 })
    })

    test('login con credenciales válidas redirige correctamente', async ({ page }) => {
        const email = process.env.TEST_USER_EMAIL
        const password = process.env.TEST_USER_PASSWORD
        if (!email || !password) {
            test.skip(true, 'No hay credenciales de test en .env.test')
            return
        }

        // Pre-warm API route
        await page.goto('/login')
        await page.waitForLoadState('load')
        await page.evaluate(async () => {
            try {
                await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'warmup@uni.pe' }),
                })
            } catch { /* ignore */ }
        })
        await page.waitForTimeout(3000)

        await page.goto('/login')
        await page.waitForTimeout(3000)

        await page.locator('#login-email').fill(email)
        await page.locator('#login-password').fill(password)
        await page.locator('form[aria-label="Formulario de inicio de sesión"] button[type="submit"]').click()

        // Should redirect to explore
        await page.waitForURL('**/explore**', { timeout: 60_000 })
        await expect(page.locator('header')).toBeVisible()
    })

    test('la página de registro carga correctamente', async ({ page }) => {
        await page.goto('/register')
        await page.waitForTimeout(3000)

        // Should have at least one input visible
        const emailInput = page.locator('input[type="email"]')
        await expect(emailInput.first()).toBeVisible({ timeout: 10_000 })
    })

    test('forgot-password carga correctamente', async ({ page }) => {
        await page.goto('/forgot-password')
        await page.waitForTimeout(3000)

        // Email input should be visible
        const emailInput = page.locator('input[type="email"]')
        await expect(emailInput.first()).toBeVisible({ timeout: 10_000 })
    })
})
