#!/usr/bin/env node

import {readdirSync, readFileSync, statSync, existsSync} from 'node:fs';
import {resolve, join, relative} from 'node:path';
import process from 'node:process';

const ROOT = resolve(process.cwd());
const SRC_DIR = join(ROOT, 'src');

const FSD_LAYERS = ['app', 'views', 'widgets', 'features', 'entities', 'shared'];

// Allowlist for migration transition period — MUST BE EMPTY AFTER MIGRATION
const LEGACY_FOLDER_ALLOWLIST = [];

const problems = [];

function getAllFiles(dir, exts = ['.ts', '.astro', '.js', '.mjs', '.css']) {
    let files = [];
    if (!existsSync(dir)) return files;
    for (const item of readdirSync(dir)) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(getAllFiles(fullPath, exts));
        } else if (exts.some((ext) => item.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

// 1. Verify no full layer barrels (e.g., src/widgets/index.ts)
for (const layer of FSD_LAYERS) {
    const layerIndexTs = join(SRC_DIR, layer, 'index.ts');
    const layerIndexJs = join(SRC_DIR, layer, 'index.js');
    if (existsSync(layerIndexTs) || existsSync(layerIndexJs)) {
        problems.push(`Prohibido barrel de capa completa: src/${layer}/index.ts`);
    }
}

// 2. Verify legacy folders (except allowlist)
const currentSrcItems = readdirSync(SRC_DIR);
for (const item of currentSrcItems) {
    const fullPath = join(SRC_DIR, item);
    if (statSync(fullPath).isDirectory()) {
        if (!FSD_LAYERS.includes(item) && item !== 'pages' && item !== 'assets') {
            if (!LEGACY_FOLDER_ALLOWLIST.includes(item)) {
                problems.push(`Carpeta legacy no permitida en src/: src/${item}/`);
            }
        }
    }
}

// 3. Verify single cloudflare:workers import
const allSrcFiles = getAllFiles(SRC_DIR);
const cfWorkersImports = [];
for (const file of allSrcFiles) {
    const content = readFileSync(file, 'utf8');
    if (
        content.includes("from 'cloudflare:workers'") ||
        content.includes('import("cloudflare:workers")') ||
        content.includes("import('cloudflare:workers')")
    ) {
        cfWorkersImports.push(relative(ROOT, file));
    }
}

if (cfWorkersImports.length > 1) {
    problems.push(
        `Solo UN archivo puede importar cloudflare:workers. Encontrado en: ${cfWorkersImports.join(', ')}`
    );
}

// 4. Verify FSD layer import hierarchy for migrated layers
for (const file of allSrcFiles) {
    const rel = relative(SRC_DIR, file);
    const parts = rel.split('/');
    const sourceLayer = parts[0];

    if (!FSD_LAYERS.includes(sourceLayer)) continue;

    const sourceRank = FSD_LAYERS.indexOf(sourceLayer);
    const content = readFileSync(file, 'utf8');
    const importRegex = /(?:import|from)\s+['"](@[a-z]+)\/([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const targetAlias = match[1]; // e.g. '@shared'
        const targetLayer = targetAlias.replace('@', '');

        if (FSD_LAYERS.includes(targetLayer)) {
            const targetRank = FSD_LAYERS.indexOf(targetLayer);
            // Higher specificity layer index is smaller (app=0, shared=5)
            // views (1) is permitted to import app (0) layouts/bootstrap primitives
            const isAllowedViewsAppImport = sourceLayer === 'views' && targetLayer === 'app';
            const isSelfLayerImport = sourceLayer === targetLayer;

            if (targetRank < sourceRank && !isAllowedViewsAppImport && !isSelfLayerImport) {
                problems.push(
                    `Violación de capa FSD en ${relative(ROOT, file)}: '${sourceLayer}' no puede importar de '${targetLayer}' (${match[0]})`
                );
            }
        }
    }
}

// 5. Verify src/pages/**/*.astro are thin wrappers (<= 15 lines, only import @views/* and astro)
const pagesDir = join(SRC_DIR, 'pages');
const astroPageFiles = getAllFiles(pagesDir, ['.astro']);
for (const file of astroPageFiles) {
    const content = readFileSync(file, 'utf8');
    const lines = content.trim().split('\n').length;
    const relPath = relative(ROOT, file);

    if (lines > 15) {
        problems.push(
            `El wrapper de ruta ${relPath} excede el límite de 15 líneas (${lines} líneas)`
        );
    }

    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath.startsWith('@views/') && importPath !== 'astro') {
            problems.push(
                `El wrapper de ruta ${relPath} importa fuera de @views/*: '${importPath}'`
            );
        }
    }
}

if (problems.length > 0) {
    console.error('✗ Violaciones de Arquitectura FSD:\n');
    for (const p of problems) console.error(`  · ${p}`);
    process.exit(1);
}

console.log('✓ Arquitectura FSD validada correctamente');
