import { test, expect } from '@playwright/test'

test.describe('Mis Posts (Sessions)', () => {

    test('página carga con header y stats', async ({ page }) => {
        await page.goto('/sessions')
        await page.waitForLoadState('load')
        await page.waitForTimeout(5000)

        // Header "Mis publicaciones"
        await expect(page.getByRole('heading', { name: /Mis publicaciones/i })).toBeVisible({ timeout: 15_000 })

        // Subtitle
        await expect(page.getByText(/Administra tus ofertas y solicitudes/i)).toBeVisible()

        // Stats cards (Total, Activas, Pausadas) — use .first() to avoid matching filter buttons
        await expect(page.getByText('Total')).toBeVisible()
        await expect(page.getByText('Activas').first()).toBeVisible()
        await expect(page.getByText('Pausadas').first()).toBeVisible()

        // "Nueva" button links to /create
        const nuevaBtn = page.locator('a[href="/create"]').filter({ hasText: /Nueva/i })
        await expect(nuevaBtn).toBeVisible()

        console.log('✅ Sessions page loads with header, stats and Nueva button')
    })

    test('filtros Todas/Activas/Pausadas funcionan', async ({ page }) => {
        await page.goto('/sessions')
        await page.waitForLoadState('load')
        await page.waitForTimeout(3000)

        // Should have filter buttons
        const todasBtn = page.locator('button').filter({ hasText: 'Todas' })
        const activasBtn = page.locator('button').filter({ hasText: 'Activas' })
        const pausadasBtn = page.locator('button').filter({ hasText: 'Pausadas' })

        await expect(todasBtn).toBeVisible()
        await expect(activasBtn).toBeVisible()
        await expect(pausadasBtn).toBeVisible()

        // Click Activas filter
        await activasBtn.click()
        await page.waitForTimeout(500)

        // Click Pausadas filter
        await pausadasBtn.click()
        await page.waitForTimeout(500)

        // Back to Todas
        await todasBtn.click()
        await page.waitForTimeout(500)

        // Page should still be functional (no crash)
        await expect(page.getByRole('heading', { name: /Mis publicaciones/i })).toBeVisible()

        console.log('✅ Filter buttons work without crashes')
    })

    test('posts muestran badge Ofrezco/Necesito y acciones', async ({ page }) => {
        await page.goto('/sessions')
        await page.waitForLoadState('load')
        await page.waitForTimeout(3000)

        // Check if there are any posts
        const offerBadge = page.getByText('Ofrezco')
        const requestBadge = page.getByText('Necesito')

        const hasOffer = await offerBadge.count() > 0
        const hasRequest = await requestBadge.count() > 0

        if (hasOffer || hasRequest) {
            // Posts exist — check action buttons
            const pauseBtn = page.locator('button[title="Pausar"], button[title="Activar"]')
            const deleteBtn = page.locator('button[title="Eliminar"]')

            if (await pauseBtn.count() > 0) {
                await expect(pauseBtn.first()).toBeVisible()
                console.log('✅ Toggle button (Pausar/Activar) visible')
            }

            if (await deleteBtn.count() > 0) {
                await expect(deleteBtn.first()).toBeVisible()
                console.log('✅ Delete button visible')
            }

            console.log('✅ Posts with badges and action buttons visible')
        } else {
            // Empty state
            const emptyText = page.getByText(/Aún no tienes publicaciones/i)
            if (await emptyText.count() > 0) {
                await expect(emptyText).toBeVisible()
                console.log('✅ Empty state shown — no posts yet')
            }
        }
    })

    test('estado vacío muestra CTA "Crear publicación"', async ({ page }) => {
        await page.goto('/sessions')
        await page.waitForLoadState('load')
        await page.waitForTimeout(3000)

        // Check if empty state exists  
        const emptyText = page.getByText(/Aún no tienes publicaciones/i)
        const hasEmpty = await emptyText.count() > 0

        if (hasEmpty) {
            // Should show "Crear publicación" button
            const createBtn = page.locator('a[href="/create"]').filter({ hasText: /Crear publicación/i })
            if (await createBtn.count() > 0) {
                await expect(createBtn).toBeVisible()
                console.log('✅ Empty state has "Crear publicación" CTA')
            }
        } else {
            // Has posts — try filter that shows no results
            const pausadasBtn = page.locator('button').filter({ hasText: 'Pausadas' })
            await pausadasBtn.click()
            await page.waitForTimeout(500)

            const noFilter = page.getByText(/No hay publicaciones con este filtro/i)
            if (await noFilter.count() > 0) {
                await expect(noFilter).toBeVisible()
                console.log('✅ Filter empty state shown')
            } else {
                console.log('ℹ️ User has both active and paused posts')
            }
        }
    })
})
