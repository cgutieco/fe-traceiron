import {test, expect} from '@playwright/test';

const ROUTES = ['/', '/es/', '/privacy', '/es/privacy', '/terms', '/es/terms', '/404'];

for (const route of ROUTES) {
    test(`Cero errores de consola en ruta "${route}"`, async ({page}) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.goto(route);
        expect(consoleErrors).toEqual([]);
    });
}
