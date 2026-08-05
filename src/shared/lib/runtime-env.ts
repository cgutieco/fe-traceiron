import {env} from 'cloudflare:workers';

/** Único punto de acceso a `cloudflare:workers` en todo `src/` — ver check-architecture.mjs. */
export function getRuntimeEnv(): Record<string, string | undefined> {
    return env as unknown as Record<string, string | undefined>;
}
