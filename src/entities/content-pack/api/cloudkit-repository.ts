import {env} from 'cloudflare:workers';
import {isShortId} from '@shared/lib/short-id';
import type {ContentPackLookup, ContentPackRepository} from './content-pack-repository';

const CONTAINER = 'iCloud.com.traceiron.app';
const DATABASE = 'public';
const TIMEOUT_MS = 4000;

export interface CloudKitConfig {
    token: string;
    environment: string;
}

export function getCloudKitConfig(): CloudKitConfig | null {
    const runtimeEnv = env as unknown as Record<string, unknown>;

    const token =
        typeof runtimeEnv?.CLOUDKIT_API_TOKEN === 'string' ? runtimeEnv.CLOUDKIT_API_TOKEN : '';

    const environment =
        typeof runtimeEnv?.CLOUDKIT_ENV === 'string' ? runtimeEnv.CLOUDKIT_ENV : 'production';

    if (!token) return null;
    return {token, environment: environment === 'development' ? 'development' : 'production'};
}

function decodeBytesField(value: unknown): unknown {
    if (typeof value !== 'string' || value.length === 0) return null;

    let binary: string;
    try {
        binary = atob(value);
    } catch {
        return null;
    }

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    try {
        return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch {
        return null;
    }
}

export class CloudKitContentPackRepository implements ContentPackRepository {
    async findByShortId(shortId: string): Promise<ContentPackLookup> {
        if (!isShortId(shortId)) return {kind: 'not-found'};

        const config = getCloudKitConfig();
        if (!config) return {kind: 'service-down'};

        const url =
            `https://api.apple-cloudkit.com/database/1/${CONTAINER}/${config.environment}` +
            `/${DATABASE}/records/lookup?ckAPIToken=${encodeURIComponent(config.token)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({records: [{recordName: shortId}]}),
                signal: controller.signal
            });
        } catch {
            return {kind: 'service-down'};
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) return {kind: 'service-down'};

        let body: unknown;
        try {
            body = await response.json();
        } catch {
            return {kind: 'service-down'};
        }

        const records = (body as {records?: unknown[]})?.records;
        const record = Array.isArray(records) ? records[0] : undefined;
        if (typeof record !== 'object' || record === null) return {kind: 'not-found'};

        const entry = record as Record<string, unknown>;

        if (typeof entry.serverErrorCode === 'string') {
            return entry.serverErrorCode === 'NOT_FOUND'
                ? {kind: 'not-found'}
                : {kind: 'service-down'};
        }

        const fields = entry.fields as Record<string, {value?: unknown}> | undefined;
        const payload = decodeBytesField(fields?.payloadData?.value);

        if (payload === null) return {kind: 'malformed'};

        return {kind: 'found', payload};
    }
}

export function createCloudKitRepository(): ContentPackRepository {
    return new CloudKitContentPackRepository();
}
