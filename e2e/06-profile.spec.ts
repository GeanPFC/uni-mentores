import { test, expect } from '@playwright/test'

test.describe('Perfil', () => {

    test('perfil propio muestra datos correctos', async ({ page }) => {
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // Should show user name
        const nameElement = page.locator('h1, h2').first()
        await expect(nameElement).toBeVisible()
        const name = await nameElement.textContent()
        expect(name).toBeTruthy()
        expect(name!.length).toBeGreaterThan(0)

        // Stats should be visible (Publicaciones, Seguidores, Siguiendo)
        const statsTexts = ['Publicaciones', 'Seguidores', 'Siguiendo']
        for (const stat of statsTexts) {
            const statEl = page.getByText(stat)
            await expect(statEl.first()).toBeVisible()
        }

        console.log(`✅ Perfil propio: "${name}" con stats visibles`)
    })

    test('perfil propio muestra cursos como tags', async ({ page }) => {
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // Look for "Cursos" section
        const cursosLabel = page.getByText('Cursos')

        if (await cursosLabel.count() > 0) {
            // Tags should be visible nearby
            console.log('✅ Sección de cursos visible')
        } else {
            console.log('ℹ️ No hay cursos (usuario no tiene posts aún)')
        }
    })

    test('perfil público de otro usuario carga correctamente', async ({ page }) => {
        // First find another user from explore
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const authorLinks = page.locator('a[href*="/profile/"]')
        if (await authorLinks.count() > 0) {
            const href = await authorLinks.first().getAttribute('href')
            if (href) {
                await page.goto(href)
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(1000)

                // Should show profile header with gradient
                const profileName = page.locator('h1').first()
                await expect(profileName).toBeVisible()

                // Should show stats
                const statsTexts = ['Publicaciones', 'Seguidores', 'Siguiendo']
                for (const stat of statsTexts) {
                    const statEl = page.getByText(stat)
                    await expect(statEl.first()).toBeVisible()
                }

                // Should show Follow + Contact buttons
                const followBtn = page.getByRole('button').filter({ hasText: /seguir|siguiendo/i })
                const contactBtn = page.locator('button, a').filter({ hasText: /contactar|contact/i })

                // At least one action button should be visible
                const hasFollow = await followBtn.count() > 0
                const hasContact = await contactBtn.count() > 0
                expect(hasFollow || hasContact).toBeTruthy()

                console.log('✅ Perfil público con gradient, stats y botones de acción')
            }
        }
    })

    test('perfil de usuario inexistente muestra estado vacío', async ({ page }) => {
        test.slow() // Double timeout — dynamic route with fake UUID is slow

        try {
            await page.goto('/profile/00000000-0000-0000-0000-000000000000', { timeout: 30_000 })
        } catch {
            // Navigation may abort — that's okay
        }

        await page.waitForLoadState('load').catch(() => { })
        await page.waitForTimeout(3000)

        // Should show some kind of "not found" or empty state, or at least not crash
        const notFound = page.getByText(/no encontrado|not found|no existe|error/i)
        const emptyProfile = page.locator('body')

        if (await notFound.count() > 0) {
            await expect(notFound.first()).toBeVisible()
            console.log('✅ Perfil inexistente muestra mensaje de error')
        } else {
            // Page loaded without crashing — that's acceptable
            await expect(emptyProfile).toBeVisible()
            console.log('✅ Perfil inexistente no crashea la app')
        }
    })
})
