import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import BaseLayout from './BaseLayout.astro';

test('BaseLayout renderiza documento HTML completo con lang, canonical y skip link', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
        props: {
            locale: 'es',
            canonicalPath: '/privacy',
            title: 'Privacidad - TRACEIRON',
            description: 'Política de privacidad de TRACEIRON'
        },
        partial: false
    });

    expect(html).toContain('<html lang="es">');
    expect(html).toContain('<link rel="canonical" href="https://traceiron.com/es/privacy"');
    expect(html).toContain('<a class="ti-skip" href="#main">Saltar al contenido</a>');
    expect(html).toContain('<title>Privacidad - TRACEIRON</title>');
});

test('BaseLayout incluye etiquetas hreflang cuando alternates=true', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
        props: {
            locale: 'en',
            canonicalPath: '/',
            title: 'TRACEIRON',
            description: 'Log iron',
            alternates: true
        },
        partial: false
    });

    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://traceiron.com/"');
    expect(html).toContain('<link rel="alternate" hreflang="es" href="https://traceiron.com/es/"');
    expect(html).toContain(
        '<link rel="alternate" hreflang="x-default" href="https://traceiron.com/"'
    );
});

test('BaseLayout omite etiquetas hreflang cuando alternates=false', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
        props: {
            locale: 'es',
            canonicalPath: '/s/k9X2bQ',
            title: 'Share - TRACEIRON',
            description: 'Shared content pack',
            alternates: false
        },
        partial: false
    });

    expect(html).not.toContain('hreflang="en"');
    expect(html).not.toContain('hreflang="es"');
});

test('BaseLayout incluye noindex únicamente cuando noindex=true', async () => {
    const container = await AstroContainer.create();

    const withNoindex = await container.renderToString(BaseLayout, {
        props: {
            locale: 'en',
            canonicalPath: '/s/k9X2bQ',
            title: 'Title',
            description: 'Desc',
            noindex: true
        },
        partial: false
    });
    expect(withNoindex).toContain('<meta name="robots" content="noindex, nofollow"');

    const withoutNoindex = await container.renderToString(BaseLayout, {
        props: {
            locale: 'en',
            canonicalPath: '/',
            title: 'Title',
            description: 'Desc',
            noindex: false
        },
        partial: false
    });
    expect(withoutNoindex).not.toContain('<meta name="robots" content="noindex, nofollow"');
});

test('BaseLayout renderiza bloques JSON-LD correctamente', async () => {
    const container = await AstroContainer.create();
    const jsonLdBlock = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'TRACEIRON'
    };

    const html = await container.renderToString(BaseLayout, {
        props: {
            locale: 'en',
            canonicalPath: '/',
            title: 'Title',
            description: 'Desc',
            jsonLd: [jsonLdBlock]
        },
        partial: false
    });

    expect(html).toContain(
        '<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"TRACEIRON"}</script>'
    );
});
