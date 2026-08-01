import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import LegalView from './LegalView.astro';
import {useTranslations} from '@shared/i18n';

test('LegalView renderiza correctamente el documento de privacidad en español', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LegalView, {
        props: {
            locale: 'es',
            document: 'privacy'
        },
        partial: false
    });

    const t = useTranslations('es');
    expect(html).toContain(t.legal.privacy.title);
    expect(html).toContain(t.legal.privacy.lead);
    for (const section of t.legal.privacy.sections) {
        expect(html).toContain(section.title);
    }
});

test('LegalView renderiza correctamente los términos en inglés', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LegalView, {
        props: {
            locale: 'en',
            document: 'terms'
        },
        partial: false
    });

    const t = useTranslations('en');
    expect(html).toContain(t.legal.terms.title);
    expect(html).toContain(t.legal.terms.lead);
    for (const section of t.legal.terms.sections) {
        expect(html).toContain(section.title);
    }
});
