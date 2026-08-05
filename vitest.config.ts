import {defineConfig} from 'vitest/config';
import {getViteConfig} from 'astro/config';

export default defineConfig(async (env) => {
    const baseConfig = await getViteConfig(
        {
            test: {
                environment: 'node',
                globals: true,
                exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
                alias: {
                    'cloudflare:workers': new URL(
                        './src/shared/testing/cloudflare-workers-stub.ts',
                        import.meta.url
                    ).pathname,
                    'cloudflare:sockets': new URL(
                        './src/shared/testing/cloudflare-sockets-stub.ts',
                        import.meta.url
                    ).pathname
                }
            }
        },
        {
            adapter: undefined
        }
    )(env);

    return {
        ...baseConfig,
        plugins: (baseConfig.plugins ?? []).filter(
            (p) =>
                !p ||
                typeof p !== 'object' ||
                !('name' in p) ||
                (typeof p.name === 'string' && !p.name.includes('cloudflare'))
        )
    };
});
