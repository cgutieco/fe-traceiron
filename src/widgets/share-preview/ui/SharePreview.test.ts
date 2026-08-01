import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import SharePreview from './SharePreview.astro';
import {parseContentPack} from '@entities/content-pack/model/content-pack';
import {oversizedPayload, payloadWithNotes} from '@shared/testing/fixtures';

test('SharePreview renderiza aviso OVERSIZED y badge de más elementos cuando el pack excede los límites', async () => {
    const container = await AstroContainer.create();
    const parsed = parseContentPack(oversizedPayload);
    expect(parsed.state).toBe('OVERSIZED');
    if (parsed.state !== 'OVERSIZED') return;

    const html = await container.renderToString(SharePreview, {
        props: {
            locale: 'es',
            pack: parsed.pack,
            state: parsed.state,
            shareUrl: 'https://traceiron.com/r/k9X2bQ'
        }
    });

    expect(html).toContain('Rutina Gigante');
    expect(html).toContain('Esta colección es más grande de lo que podemos mostrar aquí');
    expect(html).toContain('+88 ejercicios más');
});

test('SharePreview ASERCIÓN CRÍTICA DE PRIVACIDAD: el campo notes NUNCA aparece en la UI renderizada', async () => {
    const container = await AstroContainer.create();
    const parsed = parseContentPack(payloadWithNotes);
    expect(parsed.state).toBe('OK');
    if (parsed.state !== 'OK') return;

    const html = await container.renderToString(SharePreview, {
        props: {
            locale: 'es',
            pack: parsed.pack,
            state: parsed.state,
            shareUrl: 'https://traceiron.com/e/k9X2bQ'
        }
    });

    expect(html).toContain('Curl con Barra W');
    expect(html).not.toContain('INFORMACIÓN PRIVADA');
    expect(html).not.toContain('Lesión');
    expect(html).not.toContain('notes');
});
