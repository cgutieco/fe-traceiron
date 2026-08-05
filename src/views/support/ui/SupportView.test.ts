import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import SupportView from './SupportView.astro';
import {useTranslations} from '@shared/i18n';
import {SUPPORT_EMAIL} from '@shared/config/site';

test('SupportView renderiza el título, el lead y el formulario en inglés', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SupportView, {
        props: {locale: 'en'},
        partial: false
    });

    const t = useTranslations('en');
    expect(html).toContain(t.meta.support.title);
    expect(html).toContain(t.support.eyebrow);
    expect(html).toContain(t.support.form.submit);
    expect(html).toContain(SUPPORT_EMAIL);
});

test('SupportView renderiza correctamente en español', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SupportView, {
        props: {locale: 'es'},
        partial: false
    });

    const t = useTranslations('es');
    expect(html).toContain(t.support.eyebrow);
    expect(html).toContain(t.support.form.submit);
});
