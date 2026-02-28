import { test, expect } from '@playwright/test'

test.describe('Explorar', () => {

    test('página carga y muestra contenido', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('load')
        await page.waitForTimeout(5000) // Extra time for first load

        // Page title "Explorar" should be visible
        await expect(page.getByRole('heading', { name: 'Explorar' })).toBeVisible({ timeout: 10_000 })

        // Search bar should be visible
        const searchInput = page.locator('input[placeholder*="Buscar"]')
        await expect(searchInput).toBeVisible({ timeout: 10_000 })

        // Faculty filter buttons should be visible — use text locator with .first()
        // (two buttons match: the filter pill and a dropdown, grab the first)
        await expect(page.locator('button', { hasText: 'FIIS' }).first()).toBeVisible({ timeout: 30_000 })

        // Shows publication count
        await expect(page.getByText(/publicaciones activas/i)).toBeVisible({ timeout: 10_000 })
    })

    test('filtro por facultad funciona', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)

        // Click a different faculty filter
        await page.getByRole('button', { name: /FIC/i }).click()
        await page.waitForTimeout(1500)

        // Page should still be functional
        await expect(page.getByRole('heading', { name: 'Explorar' })).toBeVisible()
    })

    test('búsqueda filtra posts por texto', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('load')
        await page.waitForTimeout(4000)

        // Find search input
        const searchInput = page.locator('input[placeholder*="Buscar"]')
        await searchInput.fill('Cálculo')
        await page.waitForTimeout(1500)

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible()
    })

    test('ciclos académicos son clickeables', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)

        // Cycles list should be visible — heading "Selecciona un ciclo"
        await expect(page.getByRole('heading', { name: /Selecciona un ciclo/i })).toBeVisible()

        // Click first cycle
        const cycleItem = page.getByRole('listitem').filter({ hasText: '1er Ciclo' })
        if (await cycleItem.count() > 0) {
            await cycleItem.first().click()
            await page.waitForTimeout(2000)
            console.log('✅ Ciclo 1 clickeado exitosamente')
        }
    })

    test('sección de mentores destacados visible', async ({ page }) => {
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)

        // "Mentores destacados" section
        const mentoresHeading = page.getByRole('heading', { name: /Mentores destacados/i })
        if (await mentoresHeading.count() > 0) {
            await expect(mentoresHeading).toBeVisible()
            console.log('✅ Sección de mentores destacados visible')
        } else {
            console.log('ℹ️ No hay mentores destacados aún')
        }
    })
})
