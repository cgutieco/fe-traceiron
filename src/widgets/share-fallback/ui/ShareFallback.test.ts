import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import ShareFallback from './ShareFallback.astro';

const states = ['BAD_ID', 'NOT_FOUND', 'MALFORMED', 'SERVICE_DOWN'] as const;

for (const state of states) {
    test(`ShareFallback renderiza tarjeta de marca elegante y CTA para estado ${state}`, async () => {
        const container = await AstroContainer.create();
        const html = await container.renderToString(ShareFallback, {
            props: {
                locale: 'es',
                state
            }
        });

        expect(html).toContain('class="ti-fallback"');
        expect(html).not.toContain('Error 500');
        expect(html).not.toContain('Internal Server Error');
        expect(html).not.toContain('undefined');
    });
}
