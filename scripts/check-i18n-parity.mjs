#!/usr/bin/env node

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import process from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) =>
    JSON.parse(readFileSync(resolve(here, '..', 'src', 'shared', 'i18n', name), 'utf8'));

const en = load('en.json');
const es = load('es.json');

const problems = [];

function walk(a, b, path) {
    if (a === null || b === null) {
        if (a !== b) {
            problems.push(`${path}: valor nulo desigual (en=${a}, es=${b})`);
        }
        return;
    }

    const typeA = Array.isArray(a) ? 'array' : typeof a;
    const typeB = Array.isArray(b) ? 'array' : typeof b;

    if (typeA !== typeB) {
        problems.push(`${path}: tipo distinto (en=${typeA}, es=${typeB})`);
        return;
    }

    if (typeA === 'array') {
        if (a.length !== b.length) {
            problems.push(`${path}: longitud distinta (en=${a.length}, es=${b.length})`);
            return;
        }
        a.forEach((item, i) => walk(item, b[i], `${path}[${i}]`));
        return;
    }

    if (typeA === 'object') {
        for (const key of Object.keys(a)) {
            if (!(key in b)) {
                problems.push(`${path}.${key}: falta en es.json`);
                continue;
            }
            walk(a[key], b[key], `${path}.${key}`);
        }
        for (const key of Object.keys(b)) {
            if (!(key in a)) problems.push(`${path}.${key}: sobra en es.json (falta en en.json)`);
        }
        return;
    }

    if (typeA === 'string' && a.trim() === '') {
        problems.push(`${path}: cadena vacía en en.json`);
    }
    if (typeB === 'string' && b.trim() === '') {
        problems.push(`${path}: cadena vacía en es.json`);
    }
}

walk(en, es, '');

// Recuentos requeridos de contenido para mantener congruencia.
const counts = [
    ['faq.items', en.faq.items.length, 8],
    ['pain.pairs', en.pain.pairs.length, 3],
    ['how.steps', en.how.steps.length, 4],
    ['pricing.limits.items', en.pricing.limits.items.length, 4]
];

for (const [name, actual, expected] of counts) {
    if (actual !== expected) {
        problems.push(`${name}: se esperaban ${expected} elementos y hay ${actual}`);
    }
}

if (problems.length > 0) {
    console.error('✗ Paridad i18n rota:\n');
    for (const p of problems) console.error(`  · ${p}`);
    process.exit(1);
}

console.log('✓ Paridad i18n correcta: en.json ≡ es.json');
console.log(
    `  FAQ ${en.faq.items.length} · dolor/solución ${en.pain.pairs.length} · pasos ${en.how.steps.length} · límites free ${en.pricing.limits.items.length}`
);
