#!/usr/bin/env node

import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'client');

const failures = [];
const passes = [];

const check = (ok, category, message) => {
    if (ok) passes.push(`${category} ${message}`);
    else failures.push(`${category} ${message}`);
};

const read = (relative) => {
    const path = join(dist, relative);
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
};

const PAGES = [
    {file: 'index.html', lang: 'en', canonical: 'https://traceiron.com/', landing: true},
    {file: 'es/index.html', lang: 'es', canonical: 'https://traceiron.com/es/', landing: true},
    {file: 'privacy/index.html', lang: 'en', canonical: 'https://traceiron.com/privacy'},
    {file: 'es/privacy/index.html', lang: 'es', canonical: 'https://traceiron.com/es/privacy'},
    {file: 'terms/index.html', lang: 'en', canonical: 'https://traceiron.com/terms'},
    {file: 'es/terms/index.html', lang: 'es', canonical: 'https://traceiron.com/es/terms'}
];

const stripTags = (html) => html.replace(/<[^>]+>/g, '');
const decode = (s) =>
    s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

for (const page of PAGES) {
    const html = read(page.file);
    if (!html) {
        failures.push(`[BUILD] Falta la página ${page.file}`);
        continue;
    }
    const tag = `(${page.file})`;

    /* ── Estructura semántica ── */
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    check(h1s.length === 1, '[SEO]', `${tag} exactamente un <h1> (hay ${h1s.length})`);

    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    let skip = null;
    for (let i = 1; i < levels.length; i += 1) {
        if (levels[i] > levels[i - 1] + 1) skip = `h${levels[i - 1]} → h${levels[i]}`;
    }
    check(
        skip === null,
        '[SEO]',
        `${tag} sin saltos de nivel de encabezado${skip ? ` (${skip})` : ''}`
    );

    check(/<main[\s>]/.test(html), '[A11Y]', `${tag} landmark <main>`);
    check((html.match(/<main[\s>]/g) ?? []).length === 1, '[A11Y]', `${tag} un solo <main>`);
    check(
        /<header[\s>]/.test(html) && /<footer[\s>]/.test(html),
        '[A11Y]',
        `${tag} landmarks header y footer`
    );

    /* ── El enlace de salto es el primer elemento enfocable ── */
    const bodyStart = html.slice(html.indexOf('<body'), html.indexOf('<body') + 400);
    check(
        /class="ti-skip"/.test(bodyStart),
        '[A11Y]',
        `${tag} "saltar al contenido" es el primer enfocable`
    );

    /* ── Metadatos ── */
    check(
        new RegExp(`<html[^>]*lang="${page.lang}"`).test(html),
        '[I18N]',
        `${tag} lang="${page.lang}"`
    );
    check(!/name="keywords"/.test(html), '[SEO]', `${tag} sin <meta name="keywords">`);
    check(/name="theme-color" content="#000000"/.test(html), '[SEO]', `${tag} theme-color negro`);

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    check(
        canonical === page.canonical,
        '[SEO]',
        `${tag} canonical auto-referencial (${canonical})`
    );

    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
    check(
        title.length >= 50 && title.length <= 60,
        '[SEO]',
        `${tag} <title> de 50–60 caracteres (${title.length})`
    );
    const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
    check(
        description.length >= 140 && description.length <= 160,
        '[SEO]',
        `${tag} description de 140–160 caracteres (${description.length})`
    );

    /* ── hreflang recíproco ── */
    for (const hl of ['en', 'es', 'x-default']) {
        check(new RegExp(`hreflang="${hl}"`).test(html), '[I18N]', `${tag} hreflang="${hl}"`);
    }

    /* ── Open Graph y Twitter ── */
    for (const prop of [
        'og:type',
        'og:site_name',
        'og:locale',
        'og:title',
        'og:description',
        'og:url',
        'og:image',
        'og:image:width',
        'og:image:height',
        'og:image:alt'
    ]) {
        check(html.includes(`property="${prop}"`), '[SEO]', `${tag} ${prop}`);
    }
    check(html.includes('property="og:locale:alternate"'), '[SEO]', `${tag} og:locale:alternate`);
    check(
        html.includes('name="twitter:card" content="summary_large_image"'),
        '[SEO]',
        `${tag} twitter:card`
    );

    /* ── Sin emojis como iconos ──
     Se busca presentación de EMOJI. Símbolos de copyright © ® ™ se permiten ya que son legales. */
    const visible = decode(stripTags(html.slice(html.indexOf('<body'))));
    const emojiRegex = new RegExp('\\p{Emoji_Presentation}|\\p{Extended_Pictographic}️', 'u');
    const emoji = visible.match(emojiRegex);
    check(!emoji, '[DESIGN]', `${tag} sin emojis${emoji ? ` (encontrado ${emoji[0]})` : ''}`);

    /* ── Cero inline styles y patrón BEM ── */
    const inlineStyles = html.match(/style="[^"]*"/g) ?? [];
    check(
        inlineStyles.length === 0,
        '[CSS]',
        `${tag} cero atributos style="..." inline (hay ${inlineStyles.length})`
    );

    const classMatches = [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
    const tiClasses = classMatches.filter((c) => c.startsWith('ti-'));
    const bemRegex =
        /^ti-[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/;
    const invalidBem = tiClasses.filter((c) => !bemRegex.test(c));
    check(
        invalidBem.length === 0,
        '[BEM]',
        `${tag} todas las clases ti-* cumplen patrón BEM${invalidBem.length ? ` (inválidas: ${[...new Set(invalidBem)].join(', ')})` : ''}`
    );

    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    const undimensioned = imgs.filter((img) => !/width="/.test(img) || !/height="/.test(img));
    check(
        undimensioned.length === 0,
        '[PERF]',
        `${tag} las ${imgs.length} imágenes llevan width y height`
    );

    /* ── Cero recursos de terceros ── */
    const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
        .map((m) => m[1])
        .filter((url) => !url.startsWith('https://traceiron.com'));
    check(
        external.length === 0,
        '[PERF]',
        `${tag} sin recursos de terceros${external.length ? ` (${external[0]})` : ''}`
    );

    const preloads = [...html.matchAll(/<link rel="preload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    check(
        preloads.length === 1 && preloads[0].includes('cinzel'),
        '[PERF]',
        `${tag} se precarga únicamente Cinzel (${preloads.length} preload)`
    );

    /* ── Landing: recuentos normativos y veracidad comercial ── */
    if (page.landing) {
        const steps = (html.match(/class="[^"]*\bti-step\b/g) ?? []).length;
        check(steps === 4, '[CONTENT]', `${tag} cuatro pasos del camino feliz (${steps})`);

        const pairs = (html.match(/class="[^"]*\bti-pair\b/g) ?? []).length;
        check(pairs === 3, '[CONTENT]', `${tag} exactamente tres pares dolor/solución (${pairs})`);

        const details = (html.match(/<details/g) ?? []).length;
        check(details === 8, '[CONTENT]', `${tag} ocho preguntas de FAQ (${details})`);

        for (const price of ['4.99', '29.99', '79.99']) {
            check(html.includes(price), '[CONTENT]', `${tag} precio ${price} visible`);
        }

        const shots = (html.match(/class="[^"]*\bti-device\b/g) ?? []).length;
        check(shots >= 3 && shots <= 5, '[CONTENT]', `${tag} entre 3 y 5 capturas (${shots})`);

        /* Sin valoraciones inventadas. */
        check(
            !/aggregateRating|"review"/.test(html),
            '[JSON-LD]',
            `${tag} JSON-LD sin aggregateRating ni review`
        );

        /* Bloques estructurados presentes. */
        for (const type of ['SoftwareApplication', 'FAQPage', 'Organization', 'WebSite']) {
            check(html.includes(`"@type":"${type}"`), '[JSON-LD]', `${tag} JSON-LD ${type}`);
        }

        /* La FAQ estructurada debe coincidir con el texto visible. */
        const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
            .map((m) => JSON.parse(m[1]))
            .find((block) => block['@type'] === 'FAQPage');

        if (ld) {
            let mismatch = null;
            for (const entry of ld.mainEntity) {
                const answer = entry.acceptedAnswer.text;
                if (!decode(stripTags(html)).includes(answer)) mismatch = entry.name;
            }
            check(
                mismatch === null,
                '[JSON-LD]',
                `${tag} FAQ JSON-LD idéntica al texto visible${mismatch ? ` (falla: ${mismatch})` : ''}`
            );
        }
    }
}

const notFound = read('404.html');
if (notFound) {
    check(/name="robots" content="noindex/.test(notFound), '[ROBOTS]', '(404.html) lleva noindex');
} else {
    failures.push('[BUILD] Falta 404.html');
}

const sitemap = read('sitemap.xml');
if (sitemap) {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = [
        'https://traceiron.com/',
        'https://traceiron.com/es/',
        'https://traceiron.com/privacy',
        'https://traceiron.com/es/privacy',
        'https://traceiron.com/terms',
        'https://traceiron.com/es/terms'
    ];
    check(
        locs.length === expected.length && expected.every((url) => locs.includes(url)),
        '[SITEMAP]',
        `sitemap con exactamente las 6 URLs indexables (hay ${locs.length})`
    );
    check(
        !/\/(r|e|pack|s|share|routine|exercise|library)\//.test(sitemap),
        '[SITEMAP]',
        'sitemap sin rutas de compartir'
    );
    check(sitemap.includes('xhtml:link'), '[SITEMAP]', 'sitemap con anotaciones xhtml:link');
} else {
    failures.push('[BUILD] Falta sitemap.xml');
}

/* ── robots.txt ── */
const robots = read('robots.txt');
if (robots) {
    check(/Allow:\s*\/\s*$/m.test(robots), '[ROBOTS]', 'robots.txt permite el rastreo');
    check(
        /Sitemap:\s*https:\/\/traceiron\.com\/sitemap\.xml/.test(robots),
        '[ROBOTS]',
        'robots.txt declara el sitemap'
    );
    check(
        !/Disallow:\s*\/(r|e|pack)\//.test(robots),
        '[ROBOTS]',
        'robots.txt NO bloquea las rutas de compartir'
    );
} else {
    failures.push('[BUILD] Falta robots.txt');
}

/* ── Apple App Site Association (AASA) ── */
const aasa = read('.well-known/apple-app-site-association');
if (aasa) {
    /** @type {{ applinks: { details: Array<{ appIDs: string[]; components: Array<{ '/'?: string; exclude?: boolean }> }> } }} */
    const parsed = JSON.parse(aasa);
    const details = parsed.applinks.details[0];
    const components = details.components;
    check(details.appIDs[0] === 'K5D5UP52UM.traceiron.TraceIronApp', '[AASA]', 'appID correcto');
    /** @type {string[]} */
    const paths = components.map((c) => c['/'] ?? '');
    for (const p of [
        '/r/*',
        '/routine/*',
        '/e/*',
        '/exercise/*',
        '/pack/*',
        '/library/*',
        '/s/*',
        '/share/*'
    ]) {
        check(paths.includes(p), '[AASA]', `componente ${p}`);
    }
    // El comodín de exclusión debe ir el ÚLTIMO.
    check(paths[paths.length - 1] === '/*', '[AASA]', 'el comodín de exclusión "/*" va el último');
    const wildcardIndex = paths.indexOf('/*');
    const lastCapture = Math.max(...['/r/*', '/share/*'].map((p) => paths.indexOf(p)));
    check(wildcardIndex > lastCapture, '[AASA]', 'ninguna captura queda después de la exclusión');
    // Legal y landing ES quedan excluidos.
    for (const p of ['/privacy', '/terms', '/es/*']) {
        const entry = components.find((c) => c['/'] === p);
        check(entry?.exclude === true, '[AASA]', `${p} excluido del secuestro de enlace`);
    }
} else {
    failures.push('[BUILD] Falta .well-known/apple-app-site-association');
}

/* ── Assets de marca ── */
const ogImagePath = join(dist, 'og', 'traceiron-og.jpg');
check(
    existsSync(ogImagePath),
    '[ASSETS]',
    'existe el asset Open Graph (dist/client/og/traceiron-og.jpg)'
);

if (process.env.PUBLIC_APPSTORE_URL) {
    for (const lang of ['en', 'es']) {
        const badgePath = join(dist, 'badges', `app-store-${lang}.svg`);
        check(existsSync(badgePath), '[ASSETS]', `existe el badge de App Store (${lang})`);
    }
}

/* ── Verificación estricta de Tokens CSS ── */
const astroDir = join(dist, '_astro');
if (existsSync(astroDir)) {
    const cssFiles = readdirSync(astroDir).filter((f) => f.endsWith('.css'));
    let cssContent = '';
    for (const file of cssFiles) {
        cssContent += readFileSync(join(astroDir, file), 'utf8') + '\n';
    }

    const EXPECTED_TOKENS = {
        '--ti-bg': ['#000000', '#000'],
        '--ti-elev-1': ['#0a0a0a'],
        '--ti-elev-2': ['#101010'],
        '--ti-surface': ['#14130f'],
        '--ti-gold-deep': ['#836c4f'],
        '--ti-gold': ['#c3a885'],
        '--ti-gold-bright': ['#e6c280'],
        '--ti-gold-hi': ['#ffecc5'],
        '--ti-gold-spec': ['#ffffe5'],
        '--ti-gold-core': ['#d4af37'],
        '--ti-text': ['#fdfdf7'],
        '--ti-text-muted': ['#9e988a'],
        '--ti-ghost': ['#5c584e'],
        '--ti-success': ['#32d74b'],
        '--ti-error': ['#ff453a']
    };

    for (const [token, values] of Object.entries(EXPECTED_TOKENS)) {
        const found = values.some(
            (val) =>
                cssContent.includes(`${token}:${val}`) || cssContent.includes(`${token}: ${val}`)
        );
        check(
            found,
            '[TOKENS]',
            `Token CSS ${token} coincide exactamente con la spec de AGENTS.md §3 (${values.join(' | ')})`
        );
    }
}

/* ── Informe ── */
console.log(`Verificación de Conformidad Web — comprobaciones automáticas\n`);
console.log(`  ✓ ${passes.length} conformes`);

if (failures.length > 0) {
    console.error(`  ✗ ${failures.length} incumplimientos:\n`);
    for (const f of failures) console.error(`     ${f}`);
    process.exit(1);
}

console.log('\n✓ Sin incumplimientos automáticos detectados.');
