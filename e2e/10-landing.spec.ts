import { test, expect } from '@playwright/test'

// Landing page is for unauthenticated users
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Landing Page', () => {

    test('página de inicio carga correctamente para visitantes', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('load')
        await page.waitForTimeout(4000)

        // Should show hero title with "Conecta"
        const heroText = page.getByText(/Conecta/i).first()
        await expect(heroText).toBeVisible({ timeout: 10_000 })

        // Should show description about UNI Mentores
        await expect(page.getByText(/UNI Mentores/i).first()).toBeVisible()

        // Should show "Únete Ahora" CTA button → /register
        const joinBtn = page.locator('a[href="/register"]').first()
        await expect(joinBtn).toBeVisible()

        // Should show "Explorar" CTA button → /explore
        const exploreBtn = page.locator('a[href="/explore"]').first()
        await expect(exploreBtn).toBeVisible()

        // Should show "¿Cómo funciona?" section
        await expect(page.getByText(/¿Cómo funciona/i)).toBeVisible()

        // Should show the 3 steps (use specific step headings)
        await expect(page.getByText('Regístrate')).toBeVisible()

        console.log('✅ Landing page loads with hero, CTAs and "¿Cómo funciona?" section')
    })

    test('CTAs de la landing navegan correctamente', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('load')
        await page.waitForTimeout(4000)

        // Click "Únete Ahora" → should go to /register
        const joinLink = page.locator('a[href="/register"]').first()
        await joinLink.click()
        await page.waitForLoadState('load')
        await page.waitForTimeout(2000)

        expect(page.url()).toContain('/register')

        // Go back to landing
        await page.goto('/')
        await page.waitForLoadState('load')
        await page.waitForTimeout(4000)

        // Click "Explorar" → may redirect to /explore or /login (auth guard)
        const exploreLink = page.locator('a[href="/explore"]').first()
        await exploreLink.click()
        await page.waitForLoadState('load')
        await page.waitForTimeout(2000)

        // Accept either /explore or /login (middleware may redirect unauthenticated users)
        const url = page.url()
        const isValid = url.includes('/explore') || url.includes('/login')
        expect(isValid).toBeTruthy()

        console.log(`✅ Landing CTAs navigate correctly: /register ✅, Explorar → ${url}`)
    })
})
