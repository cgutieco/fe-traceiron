import {test, expect} from '@playwright/test';

test.describe('Rutas de Share Fallback E2E', () => {
    test('un shortId inválido responde con página de fallback BAD_ID / NOT_FOUND y status 404', async ({
        page
    }) => {
        const response = await page.goto('/s/invalid');
        expect(response?.status()).toBe(404);
        await expect(page.locator('.ti-fallback')).toBeVisible();
    });

    test('una ruta de share sin token de CloudKit responde con tarjeta de servicio degradado', async ({
        page
    }) => {
        const response = await page.goto('/r/k9X2bQ');
        expect(response?.status()).toBe(200);
        await expect(page.locator('.ti-fallback')).toBeVisible();
    });
});
