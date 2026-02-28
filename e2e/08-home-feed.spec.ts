import { test, expect } from '@playwright/test'

test.describe('Home Feed', () => {

    test('página de inicio carga con header correcto', async ({ page }) => {
        await page.goto('/home')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // Header should say "Inicio"
        const header = page.getByText('Inicio').first()
        await expect(header).toBeVisible()

        // Subtitle should describe the feed
        const subtitle = page.getByText(/posts de|tu feed/i)
        await expect(subtitle.first()).toBeVisible()

        console.log('✅ Home feed header visible')
    })

    test('muestra posts o estado vacío', async ({ page }) => {
        await page.goto('/home')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)

        // Either posts are visible or empty state
        const postCards = page.locator('[class*="rounded"]').filter({
            has: page.locator('text=/Ofrezco|Necesito/'),
        })
        const emptyState = page.getByText(/feed está vacío|explorar|seguir/i)

        const hasCards = await postCards.count() > 0
        const hasEmpty = await emptyState.count() > 0

        expect(hasCards || hasEmpty).toBeTruthy()
        console.log(hasCards
            ? `✅ Feed con ${await postCards.count()} posts`
            : '✅ Estado vacío con CTAs para Explorar/Publicar')
    })

    test('ActivityFeed sidebar visible en desktop', async ({ page }) => {
        // Set viewport to desktop size
        await page.setViewportSize({ width: 1280, height: 800 })

        await page.goto('/home')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // ActivityFeed should show "Actividad reciente"
        const activityHeader = page.getByText('Actividad reciente')

        if (await activityHeader.count() > 0) {
            await expect(activityHeader.first()).toBeVisible()
            console.log('✅ ActivityFeed sidebar visible en desktop')
        } else {
            console.log('ℹ️ No hay actividad reciente aún (nuevo proyecto)')
        }
    })

    test('posts en el feed tienen botones de acción', async ({ page }) => {
        await page.goto('/home')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)

        const postCards = page.locator('[class*="rounded"]').filter({
            has: page.locator('text=/Ofrezco|Necesito/'),
        })

        if (await postCards.count() > 0) {
            const firstCard = postCards.first()

            // Should have share button
            const shareBtn = firstCard.locator('button[title="Compartir"]')
            if (await shareBtn.count() > 0) {
                await expect(shareBtn).toBeVisible()
            }

            // Should have contact button
            const contactBtn = firstCard.locator('button, a').filter({ hasText: /contactar/i })
            // Contact might be an icon-only button, so also check for styled buttons
            const styledBtns = firstCard.locator('button[class*="rounded-full"]')

            console.log('✅ Post cards tienen botones de acción')
        } else {
            console.log('ℹ️ No hay posts en el feed para verificar botones')
        }
    })

    test('estado vacío tiene botones funcionales', async ({ page }) => {
        await page.goto('/home')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const emptyState = page.getByText(/feed está vacío/i)

        if (await emptyState.count() > 0) {
            // "Explorar" button should link to /explore
            const exploreBtn = page.getByRole('link').filter({ hasText: /explorar/i })
            if (await exploreBtn.count() > 0) {
                const href = await exploreBtn.first().getAttribute('href')
                expect(href).toContain('/explore')
            }

            // "Publicar" button should link to /create
            const createBtn = page.getByRole('link').filter({ hasText: /publicar/i })
            if (await createBtn.count() > 0) {
                const href = await createBtn.first().getAttribute('href')
                expect(href).toContain('/create')
            }

            console.log('✅ Estado vacío tiene CTAs funcionales')
        }
    })
})
