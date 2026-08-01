import {SITE_URL} from '@shared/config/site';
import {alternatesFor} from '@shared/i18n';

export const CANONICAL_PATHS = ['/', '/privacy', '/terms'] as const;

export function generateSitemapXmlResponse(): Response {
    const entries = CANONICAL_PATHS.flatMap((path) => {
        const alt = alternatesFor(path, SITE_URL);

        const links = [
            `      <xhtml:link rel="alternate" hreflang="en" href="${alt.en}"/>`,
            `      <xhtml:link rel="alternate" hreflang="es" href="${alt.es}"/>`,
            `      <xhtml:link rel="alternate" hreflang="x-default" href="${alt.xDefault}"/>`
        ].join('\n');

        return [alt.en, alt.es].map(
            (loc) => `    <url>\n      <loc>${loc}</loc>\n${links}\n    </url>`
        );
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
