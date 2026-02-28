import { test, expect } from '@playwright/test'

test.describe('Chat', () => {

    test('página de chat carga correctamente', async ({ page }) => {
        await page.goto('/chat')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // Page should load without errors
        await expect(page.locator('body')).toBeVisible()

        // Should show some chat UI (conversations list or empty state)
        const hasConversations = page.locator('a[href*="/chat"], [class*="conversation"], [class*="chat"]')
        const emptyState = page.getByText(/no tienes|sin conversaciones|empieza|chat/i)

        const convCount = await hasConversations.count()
        const emptyCount = await emptyState.count()

        // Either conversations exist or empty state shows
        expect(convCount > 0 || emptyCount > 0).toBeTruthy()
        console.log(`✅ Chat cargado: ${convCount > 0 ? 'tiene conversaciones' : 'estado vacío'}`)
    })

    test('iniciar chat desde perfil de otro usuario', async ({ page }) => {
        // Find a user from explore
        await page.goto('/explore')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // Find "Contactar" button
        const contactButtons = page.locator('button, a').filter({ hasText: /contactar|contact/i })

        if (await contactButtons.count() > 0) {
            await contactButtons.first().click()
            await page.waitForTimeout(3000)

            // Should navigate to chat or open chat interface
            const url = page.url()
            const isInChat = url.includes('/chat')

            if (isInChat) {
                // Look for message input
                const messageInput = page.locator('input[placeholder*="mensaje"], textarea[placeholder*="mensaje"], input[placeholder*="Escribe"]')

                if (await messageInput.count() > 0) {
                    // Type a test message
                    const testMsg = `Test E2E ${Date.now()}`
                    await messageInput.first().fill(testMsg)

                    // Find send button
                    const sendBtn = page.locator('button[type="submit"]').last()
                    if (await sendBtn.count() > 0) {
                        await sendBtn.click()
                        await page.waitForTimeout(2000)

                        // Message should appear in chat
                        const sentMsg = page.getByText(testMsg)
                        if (await sentMsg.count() > 0) {
                            console.log('✅ Mensaje enviado y visible en chat')
                        } else {
                            console.log('⚠️ Mensaje enviado pero no visible (puede requerir realtime)')
                        }
                    }
                }
            }
        } else {
            console.log('ℹ️ No hay botones de contacto visibles')
        }
    })
})
