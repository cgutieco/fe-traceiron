import type {APIRoute} from 'astro';
import {generateSitemapXmlResponse} from '@app/seo';

export const prerender = true;

export const GET: APIRoute = () => generateSitemapXmlResponse();
