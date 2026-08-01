import {test, expect} from '@playwright/test';

test('Página carga correctamente con prefers-reduced-motion: reduce', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
});
