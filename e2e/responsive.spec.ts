import {test, expect} from '@playwright/test';

const VIEWPORTS = [
    {width: 320, height: 568},
    {width: 375, height: 667},
    {width: 768, height: 1024},
    {width: 1200, height: 800}
];

for (const vp of VIEWPORTS) {
    test(`Smoke test responsive en viewport ${vp.width}x${vp.height}px`, async ({page}) => {
        await page.setViewportSize(vp);
        await page.goto('/es/');

        // Assert no horizontal overflow
        const overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(overflow).toBe(false);

        // Assert primary button / CTA tap target size >= 44px
        const primaryCta = page.locator('.ti-btn--primary').first();
        if (await primaryCta.isVisible()) {
            const box = await primaryCta.boundingBox();
            if (box) {
                expect(box.height).toBeGreaterThanOrEqual(44);
            }
        }
    });
}
