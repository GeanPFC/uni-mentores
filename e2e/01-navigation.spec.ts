import { test, expect } from '@playwright/test'

test.describe('Navegación', () => {

    test('todas las páginas principales cargan correctamente', async ({ page }) => {
        const pages = [
            { path: '/explore', title: 'Explorar' },
            { path: '/home', title: 'Inicio' },
            { path: '/create', title: 'Publicar' },
            { path: '/chat', title: 'Chat' },
            { path: '/profile', title: 'Perfil' },
            { path: '/sessions', title: 'Mis Posts' },
        ]

        for (const p of pages) {
            await page.goto(p.path)
            await page.waitForLoadState('networkidle')
            // Page should return 200 (not error page)
            await expect(page.locator('body')).toBeVisible()
            // No Next.js error overlay
            const errorOverlay = page.locator('#__next-build-error')
            await expect(errorOverlay).toHaveCount(0)
        }
    })

    test('nav desktop contiene los links correctos', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')

        // Must be visible in desktop nav
        const nav = page.locator('header nav').first()

        // These links MUST exist
        const expectedLinks = ['Inicio', 'Explorar', 'Publicar', 'Chat', 'Mis Posts']
        for (const linkText of expectedLinks) {
            const link = nav.locator(`a, button`).filter({ hasText: linkText })
            await expect(link.first()).toBeVisible({ timeout: 5000 })
        }
    })

    test('NO existe link a Grupos en la navegación', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')

        // "Grupos" should NOT exist anywhere in the header
        const gruposLink = page.locator('header').getByText('Grupos')
        await expect(gruposLink).toHaveCount(0)
    })

    test('/groups devuelve 404 o redirige', async ({ page }) => {
        const response = await page.goto('/groups')
        // Should be 404 since groups was removed
        expect(response?.status()).toBe(404)
    })
})
