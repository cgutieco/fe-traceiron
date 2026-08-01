import type {APIRoute} from 'astro';
import {SHORT_ID_PATTERN} from '@shared/lib/short-id';

export function createAliasRedirect(targetPrefix: 'e' | 'r' | 'pack'): APIRoute {
    return ({params}) => {
        const id = params.id ?? '';

        if (!SHORT_ID_PATTERN.test(id)) {
            return new Response(null, {status: 404});
        }

        return new Response(null, {
            status: 301,
            headers: {Location: `/${targetPrefix}/${id}`, 'Cache-Control': 'public, max-age=86400'}
        });
    };
}
