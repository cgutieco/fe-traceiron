import js from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            '.astro/**',
            'node_modules/**',
            '.wrangler/**',
            'worker-configuration.d.ts'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...eslintPluginAstro.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    {
        files: ['**/*.astro'],
        rules: {
            'no-unused-vars': 'off'
        }
    }
);
