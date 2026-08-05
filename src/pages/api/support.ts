import type {APIContext, APIRoute} from 'astro';
import {handleSupportRequest} from '@views/support';

export const prerender = false;

function getClientIp(context: APIContext): string | null {
    try {
        return context.clientAddress;
    } catch {
        return null;
    }
}

export const POST: APIRoute = (context) =>
    handleSupportRequest(context.request, getClientIp(context));
