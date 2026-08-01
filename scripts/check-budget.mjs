#!/usr/bin/env node

import {readFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, extname, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {brotliCompressSync, constants} from 'node:zlib';
import process from 'node:process';
import {Buffer} from 'node:buffer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'client');

if (!existsSync(dist)) {
    console.error('✗ No existe dist/client. Ejecuta `pnpm run build` primero.');
    process.exit(1);
}

const KB = 1024;
const BUDGETS = {
    js: {target: 25 * KB, max: 40 * KB, label: 'JS inicial (brotli)'},
    css: {target: 15 * KB, max: 25 * KB, label: 'CSS total (brotli)'},
    page: {target: 400 * KB, max: 600 * KB, label: 'Peso total de `/`'}
};

const brotli = (buffer) =>
    brotliCompressSync(buffer, {
        params: {[constants.BROTLI_PARAM_QUALITY]: 11}
    }).length;

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else out.push(full);
    }
    return out;
}

const files = walk(dist);

const cssFiles = files.filter((f) => extname(f) === '.css');
const cssBytes = cssFiles.reduce((total, f) => total + brotli(readFileSync(f)), 0);

const jsFiles = files.filter((f) => extname(f) === '.js' && !f.includes('_worker.js'));
const jsBundleBytes = jsFiles.reduce((total, f) => total + brotli(readFileSync(f)), 0);

const indexPath = join(dist, 'index.html');
const html = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';

const inlineScripts = [
    ...html.matchAll(
        /<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi
    )
]
    .map((match) => match[1])
    .join('\n');
const inlineJsBytes = inlineScripts.trim() ? brotli(Buffer.from(inlineScripts)) : 0;

const jsBytes = jsBundleBytes + inlineJsBytes;

const htmlBytes = html ? brotli(Buffer.from(html)) : 0;

const cinzel = join(dist, 'fonts', 'cinzel', 'variable', 'cinzel-latin-wght-normal.woff2');
const fontBytes = existsSync(cinzel) ? statSync(cinzel).size : 0;

const avifs = files.filter((f) => extname(f) === '.avif').map((f) => statSync(f).size);
const imageBytes = avifs.length > 0 ? Math.min(...avifs) : 0;

const pageBytes = htmlBytes + cssBytes + jsBytes + fontBytes + imageBytes;

const results = [
    ['js', jsBytes],
    ['css', cssBytes],
    ['page', pageBytes]
];

let failed = false;
console.log('Presupuestos de Rendimiento Web\n');

for (const [key, actual] of results) {
    const {target, max, label} = BUDGETS[key];
    const status = actual > max ? '✗ SUPERA EL MÁXIMO' : actual > target ? '~ sobre objetivo' : '✓';
    if (actual > max) failed = true;
    console.log(
        `  ${status.padEnd(20)} ${label.padEnd(24)} ${(actual / KB).toFixed(1).padStart(7)} KB ` +
            `(objetivo ${(target / KB).toFixed(0)} KB · máx ${(max / KB).toFixed(0)} KB)`
    );
}

console.log(
    `\n  Detalle JS: ${jsFiles.length} bundle(s) = ${(jsBundleBytes / KB).toFixed(1)} KB · ` +
        `inline = ${(inlineJsBytes / KB).toFixed(1)} KB`
);
console.log(`  Detalle CSS: ${cssFiles.length} hoja(s)`);
console.log(`  Fuente precargada (Cinzel): ${(fontBytes / KB).toFixed(1)} KB`);

if (failed) {
    console.error('\n✗ Presupuesto superado: este build sobrepasa los límites de rendimiento.');
    process.exit(1);
}

console.log('\n✓ Todos los presupuestos dentro de lo tolerado.');
