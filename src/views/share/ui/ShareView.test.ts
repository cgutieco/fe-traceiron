import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import ShareView from './ShareView.astro';
import {parseContentPack} from '@entities/content-pack/model/content-pack';
import {validRoutinePayload} from '@shared/testing/fixtures';

test('ShareView configura noindex=true, alternates=false y título para pack válido', async () => {
    const container = await AstroContainer.create();
    const parsed = parseContentPack(validRoutinePayload);
    if (parsed.state !== 'OK') throw new Error('Fixture inválida');

    const html = await container.renderToString(ShareView, {
        props: {
            locale: 'es',
            state: 'OK',
            pack: parsed.pack,
            path: '/r/k9X2bQ'
        },
        partial: false
    });

    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('<link rel="alternate" hreflang="en"');
    expect(html).toContain('Push Day');
});

test('ShareView renderiza fallback cuando pack=null', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ShareView, {
        props: {
            locale: 'es',
            state: 'NOT_FOUND',
            pack: null,
            path: '/r/k9X2bQ'
        },
        partial: false
    });

    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).toContain('Este enlace expiró o ya no existe');
});
