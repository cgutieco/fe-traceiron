import process from 'node:process';
import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:8788',
        trace: 'on-first-retry'
    },
    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']}
        },
        {
            name: 'mobile-chrome',
            use: {...devices['Pixel 5']}
        },
        {
            name: 'mobile-safari',
            use: {...devices['iPhone 12']}
        }
    ],
    webServer: {
        command: 'pnpm build && pnpm preview',
        url: 'http://127.0.0.1:8788',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
    }
});
