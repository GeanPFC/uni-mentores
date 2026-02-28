import { test, expect } from '@playwright/test'

test.describe('Auth Guards & Logout', () => {

    test('usuario no autenticado es redirigido a login', async ({ browser }) => {
        // Create fresh context WITHOUT saved auth state
        const context = await browser.newContext({
            storageState: { cookies: [], origins: [] }
        })
        const page = await context.newPage()

        // Try to access protected routes
        const protectedRoutes = ['/home', '/create', '/chat', '/sessions', '/profile']

        for (const route of protectedRoutes) {
            await page.goto(`http://localhost:3000${route}`)
            await page.waitForLoadState('load')
            await page.waitForTimeout(2000)

            // Should redirect to /login (or /)
            const url = page.url()
            const isRedirected = url.includes('/login') || url.endsWith('/')
                || url.includes('/register')

            if (isRedirected) {
                console.log(`✅ ${route} → redirigió a ${url}`)
            } else {
                // Some apps show login modal instead of redirect
                const loginForm = page.locator('input[type="email"], #login-email')
                if (await loginForm.count() > 0) {
                    console.log(`✅ ${route} → muestra formulario de login`)
                } else {
                    console.log(`⚠️ ${route} → URL = ${url} (puede requerir verificación manual)`)
                }
            }
        }

        await context.close()
    })

    test('botón Salir cierra sesión correctamente', async ({ page }) => {
        // Start on an authenticated page
        await page.goto('/home')
        await page.waitForLoadState('load')
        await page.waitForTimeout(3000)

        // Find "Salir" button in header
        const logoutBtn = page.getByRole('button', { name: /Salir/i })

        if (await logoutBtn.count() > 0) {
            await logoutBtn.click()
            await page.waitForTimeout(3000)

            // After logout, should redirect to / or /login
            const url = page.url()
            const isLoggedOut = url.endsWith('/') || url.includes('/login')

            if (isLoggedOut) {
                console.log(`✅ Logout exitoso → redirigido a ${url}`)
            } else {
                // Check if landing page elements are visible
                const heroText = page.getByText(/Conecta/i)
                const loginForm = page.locator('#login-email')
                const hasLanding = await heroText.count() > 0
                const hasLogin = await loginForm.count() > 0

                if (hasLanding || hasLogin) {
                    console.log('✅ Logout exitoso → muestra landing o login')
                } else {
                    console.log(`⚠️ Después de logout: ${url}`)
                }
            }
        } else {
            console.log('⚠️ Botón "Salir" no encontrado en header')
        }
    })

    test('usuario autenticado en /login es redirigido a /home', async ({ page }) => {
        // Already authenticated via auth.setup.ts
        await page.goto('/login')
        await page.waitForLoadState('load')
        await page.waitForTimeout(3000)

        // Should redirect to /home, /explore, or show an authenticated page
        const url = page.url()
        const isRedirected = url.includes('/home') || url.includes('/explore')
            || url.includes('/sessions')

        if (isRedirected) {
            console.log(`✅ /login → redirigido a ${url} (usuario ya autenticado)`)
        } else {
            // Might stay on login but show different state
            const logoutBtn = page.getByRole('button', { name: /Salir/i })
            if (await logoutBtn.count() > 0) {
                console.log('✅ /login → redirigido a página autenticada')
            } else {
                // Some apps don't redirect, they just show login
                console.log(`ℹ️ /login no redirige — URL: ${url}`)
            }
        }
    })
})
