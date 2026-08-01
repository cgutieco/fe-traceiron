import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import Icon, {type IconName} from './Icon.astro';

const ALL_ICONS: IconName[] = [
    'check',
    'watch',
    'smartphone',
    'widgets',
    'cloud',
    'globe',
    'arrow-right',
    'arrow-down',
    'lock',
    'calendar',
    'sparkles',
    'flame',
    'timer',
    'pencil',
    'chevron-down',
    'plus'
];

for (const name of ALL_ICONS) {
    test(`Icon "${name}" renderiza SVG válido con viewBox=0 0 24 24 de AGENTS.md §6`, async () => {
        const container = await AstroContainer.create();
        const html = await container.renderToString(Icon, {
            props: {name}
        });

        expect(html).toContain('<svg');
        expect(html).toContain('class="ti-icon"');
        expect(html).toContain('viewBox="0 0 24 24"');
        expect(html.length).toBeGreaterThan(50);
    });
}
