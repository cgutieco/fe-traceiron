import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ACCESSIBILITY_ROUTES = [
    '/',
    '/es/',
    '/privacy',
    '/es/privacy',
    '/terms',
    '/es/terms',
    '/404',
    '/s/abcdef'
];

for (const route of ACCESSIBILITY_ROUTES) {
    test(`Auditoría de accesibilidad WCAG 2.1 AA en ruta "${route}"`, async ({page}) => {
        await page.goto(route);

        const accessibilityScanResults = await new AxeBuilder({page})
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const seriousOrCriticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical'
        );

        if (seriousOrCriticalViolations.length > 0) {
            console.error(
                `Violaciones WCAG en ${route}:`,
                JSON.stringify(seriousOrCriticalViolations, null, 2)
            );
        }

        expect(seriousOrCriticalViolations).toEqual([]);
    });
}
