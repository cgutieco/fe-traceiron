import {test, expect} from '@playwright/test';

test.describe('I18n y Routing', () => {
    test('la ruta raíz / carga la landing en inglés', async ({page}) => {
        await page.goto('/');
        await expect(page).toHaveURL('http://127.0.0.1:8788/');
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });

    test('la ruta /es/ carga la landing en español', async ({page}) => {
        await page.goto('/es/');
        await expect(page).toHaveURL('http://127.0.0.1:8788/es/');
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    });

    test('hacer click en el switcher de idioma escribe la cookie ti_lang y navega a la otra versión', async ({
        page
    }) => {
        await page.goto('/es/');
        const langLink = page.locator('.ti-lang a[data-ti-lang="en"]').first();
        await expect(langLink).toBeVisible();

        await langLink.click();

        await page.waitForURL((url) => url.pathname === '/');
        const cookies = await page.context().cookies();
        const langCookie = cookies.find((c) => c.name === 'ti_lang');
        expect(langCookie?.value).toBe('en');
    });
});
