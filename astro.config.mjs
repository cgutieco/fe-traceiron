import {defineConfig} from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
    site: 'https://traceiron.com',
    output: 'server',
    adapter: cloudflare({
        imageService: 'compile'
    }),
    build: {inlineStylesheets: 'auto'},
    compressHTML: true
});
