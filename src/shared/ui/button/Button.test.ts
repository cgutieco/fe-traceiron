import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import Button from './Button.astro';

test('Button renderiza etiqueta <button> por defecto con clase .ti-btn--primary', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Button, {
        slots: {
            default: 'Enviar'
        }
    });

    expect(html).toContain('<button');
    expect(html).toContain('class="ti-btn--primary"');
    expect(html).toContain('Enviar');
});

test('Button renderiza <a> cuando se especifica href y asigna .ti-btn--secondary', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Button, {
        props: {
            variant: 'secondary',
            href: 'https://traceiron.com',
            target: '_blank'
        },
        slots: {
            default: 'Visitar'
        }
    });

    expect(html).toContain('<a');
    expect(html).toContain('class="ti-btn--secondary"');
    expect(html).toContain('href="https://traceiron.com"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('Visitar');
});
