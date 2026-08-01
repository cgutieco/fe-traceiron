import type {AstroGlobal} from 'astro';
import type {ContentPackRepository} from '@entities/content-pack/api/content-pack-repository';
import {createCloudKitRepository} from '@entities/content-pack/api/cloudkit-repository';
import {isShortId} from '@shared/lib/short-id';
import {resolveLocale, type Locale} from '@shared/i18n';
import {
    parseContentPack,
    type ContentType,
    type ContentPack,
    type ShareState
} from '@entities/content-pack/model/content-pack';
import {LANG_COOKIE_NAME} from '@features/language-switch';

export interface ShareResolution {
    state: ShareState;
    pack: ContentPack | null;
    status: number;
    locale: Locale;
    cacheControl: string;
}

const CACHE_OK = 'public, max-age=300, stale-while-revalidate=86400';
const CACHE_TRANSIENT = 'public, max-age=0, must-revalidate';

export const CANONICAL_PREFIX: Record<ContentType, string> = {
    routine: 'r',
    exercise: 'e',
    pack: 'pack'
};

export function sharePath(prefix: string, id: string | undefined, state: ShareState): string {
    return state === 'BAD_ID' || !id ? '/' : `/${prefix}/${id}`;
}

export async function resolveSharePage(
    id: string | undefined,
    request: Request,
    cookieLang: string | null,
    repository: ContentPackRepository = createCloudKitRepository()
): Promise<ShareResolution> {
    const locale = resolveLocale(request.headers.get('accept-language'), cookieLang);
    const base = {pack: null, locale} as const;

    if (!id || !isShortId(id)) {
        return {...base, state: 'BAD_ID', status: 404, cacheControl: CACHE_TRANSIENT};
    }

    const result = await repository.findByShortId(id);

    if (result.kind === 'not-found') {
        return {...base, state: 'NOT_FOUND', status: 404, cacheControl: CACHE_TRANSIENT};
    }

    if (result.kind === 'service-down') {
        return {...base, state: 'SERVICE_DOWN', status: 200, cacheControl: CACHE_TRANSIENT};
    }

    if (result.kind === 'malformed') {
        return {...base, state: 'MALFORMED', status: 200, cacheControl: CACHE_TRANSIENT};
    }

    const parsed = parseContentPack(result.payload);

    if (parsed.state === 'MALFORMED' || parsed.pack === null) {
        return {...base, state: 'MALFORMED', status: 200, cacheControl: CACHE_TRANSIENT};
    }

    return {
        state: parsed.state,
        pack: parsed.pack,
        status: 200,
        locale,
        cacheControl: CACHE_OK
    };
}

export async function resolveGenericAlias(
    id: string | undefined,
    request: Request,
    cookieLang: string | null,
    repository: ContentPackRepository = createCloudKitRepository()
): Promise<{redirectTo: string} | {resolution: ShareResolution}> {
    const resolution = await resolveSharePage(id, request, cookieLang, repository);

    if (resolution.state === 'OK' || resolution.state === 'OVERSIZED') {
        const prefix = CANONICAL_PREFIX[resolution.pack!.contentType];
        return {redirectTo: `/${prefix}/${id}`};
    }

    return {resolution};
}

export async function renderShareRoute(
    Astro: AstroGlobal,
    prefix: 'r' | 'e' | 'pack',
    repository?: ContentPackRepository
) {
    const id = Astro.params.id;
    const cookieLang = Astro.cookies.get(LANG_COOKIE_NAME)?.value ?? null;
    const resolution = await resolveSharePage(id, Astro.request, cookieLang, repository);

    Astro.response.status = resolution.status;
    Astro.response.headers.set('Cache-Control', resolution.cacheControl);
    Astro.response.headers.set('Vary', 'Accept-Language, Cookie');

    return {
        resolution,
        path: sharePath(prefix, id, resolution.state)
    };
}

export async function renderGenericAliasRoute(
    Astro: AstroGlobal,
    prefix: 's' | 'share',
    repository?: ContentPackRepository
): Promise<{redirect: string} | {resolution: ShareResolution; path: string}> {
    const id = Astro.params.id;
    const cookieLang = Astro.cookies.get(LANG_COOKIE_NAME)?.value ?? null;
    const outcome = await resolveGenericAlias(id, Astro.request, cookieLang, repository);

    if ('redirectTo' in outcome) {
        return {redirect: outcome.redirectTo};
    }

    const {resolution} = outcome;
    Astro.response.status = resolution.status;
    Astro.response.headers.set('Cache-Control', resolution.cacheControl);
    Astro.response.headers.set('Vary', 'Accept-Language, Cookie');

    return {
        resolution,
        path: sharePath(prefix, id, resolution.state)
    };
}
