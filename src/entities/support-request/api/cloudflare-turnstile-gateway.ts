import {getRuntimeEnv} from '@shared/lib/runtime-env';
import type {TurnstileGateway} from './turnstile-gateway';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 4000;

export class CloudflareTurnstileGateway implements TurnstileGateway {
    async verify(token: string, remoteIp: string | null): Promise<boolean> {
        if (!token) return false;

        const secret = getRuntimeEnv().TURNSTILE_SECRET_KEY;
        if (!secret) return false;

        const body = new URLSearchParams({secret, response: token});
        if (remoteIp) body.set('remoteip', remoteIp);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(SITEVERIFY_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body,
                signal: controller.signal
            });
        } catch {
            return false;
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) return false;

        let result: unknown;
        try {
            result = await response.json();
        } catch {
            return false;
        }

        return (result as {success?: unknown})?.success === true;
    }
}

export function createCloudflareTurnstileGateway(): TurnstileGateway {
    return new CloudflareTurnstileGateway();
}
