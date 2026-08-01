import {test, expect, vi, beforeEach} from 'vitest';

(
    globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
).__TRACEIRON_CF_ENV__ = {};

const {getCloudKitConfig, CloudKitContentPackRepository} = await import('./cloudkit-repository.ts');

function setEnv(overrides: Record<string, string | undefined> = {}) {
    const target = (
        globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
    ).__TRACEIRON_CF_ENV__;
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, overrides);
}

function toBase64Json(value: unknown): string {
    const jsonStr = JSON.stringify(value);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function cloudKitResponse(records: unknown[]): Response {
    return {ok: true, json: async () => ({records})} as unknown as Response;
}

beforeEach(() => {
    vi.restoreAllMocks();
});

test('getCloudKitConfig es null sin CLOUDKIT_API_TOKEN', () => {
    setEnv({});
    expect(getCloudKitConfig()).toBeNull();
});

test('getCloudKitConfig es null cuando el token es una cadena vacía', () => {
    setEnv({CLOUDKIT_API_TOKEN: ''});
    expect(getCloudKitConfig()).toBeNull();
});

test('getCloudKitConfig por defecto usa production', () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    expect(getCloudKitConfig()).toEqual({token: 'tok', environment: 'production'});
});

test('getCloudKitConfig respeta development y descarta cualquier otro valor', () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok', CLOUDKIT_ENV: 'development'});
    expect(getCloudKitConfig()?.environment).toBe('development');

    setEnv({CLOUDKIT_API_TOKEN: 'tok', CLOUDKIT_ENV: 'staging'});
    expect(getCloudKitConfig()?.environment).toBe('production');
});

test('findByShortId no llama a fetch si el shortId no cumple el patrón', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new Error('no debería llamarse');
    });

    const repo = new CloudKitContentPackRepository();
    const result = await repo.findByShortId('bad id');
    expect(result).toEqual({kind: 'not-found'});
    expect(fetchMock).not.toHaveBeenCalled();
});

test('findByShortId da service-down si no hay CLOUDKIT_API_TOKEN configurado', async () => {
    setEnv({});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new Error('no debería llamarse');
    });

    const repo = new CloudKitContentPackRepository();
    const result = await repo.findByShortId('k9X2bQ');
    expect(result).toEqual({kind: 'service-down'});
    expect(fetchMock).not.toHaveBeenCalled();
});

test('un fetch que lanza (timeout/red) degrada a service-down', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new DOMException('The operation was aborted', 'AbortError');
    });

    const repo = new CloudKitContentPackRepository();
    const result = await repo.findByShortId('k9X2bQ');
    expect(result).toEqual({kind: 'service-down'});
});

test('una respuesta HTTP no-ok degrada a service-down', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () => ({ok: false}) as unknown as Response
    );

    const repo = new CloudKitContentPackRepository();
    const result = await repo.findByShortId('k9X2bQ');
    expect(result).toEqual({kind: 'service-down'});
});

test('un body que no es JSON válido degrada a service-down', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
            ({
                ok: true,
                json: async () => {
                    throw new SyntaxError('Unexpected token');
                }
            }) as unknown as Response
    );

    const repo = new CloudKitContentPackRepository();
    const result = await repo.findByShortId('k9X2bQ');
    expect(result).toEqual({kind: 'service-down'});
});

test('sin records o con un record que no es objeto → not-found', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => cloudKitResponse([]));
    const repo = new CloudKitContentPackRepository();
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'not-found'});

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => cloudKitResponse([null]));
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'not-found'});
});

test('serverErrorCode NOT_FOUND → not-found; cualquier otro → service-down', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        cloudKitResponse([{serverErrorCode: 'NOT_FOUND'}])
    );
    const repo = new CloudKitContentPackRepository();
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'not-found'});

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        cloudKitResponse([{serverErrorCode: 'INTERNAL_ERROR'}])
    );
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'service-down'});
});

test('un registro válido decodifica base64 → UTF-8 → JSON', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    const payload = {contentTypeRaw: 'routine', title: 'Push Day'};
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        cloudKitResponse([{fields: {payloadData: {value: toBase64Json(payload)}}}])
    );

    const repo = new CloudKitContentPackRepository();
    const result = await repo.findByShortId('k9X2bQ');
    expect(result).toEqual({kind: 'found', payload});
});

test('un valor no-string o vacío en payloadData → malformed', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        cloudKitResponse([{fields: {payloadData: {value: ''}}}])
    );
    const repo = new CloudKitContentPackRepository();
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'malformed'});
});

test('un base64 corrupto → malformed (no lanza)', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        cloudKitResponse([{fields: {payloadData: {value: '***no-es-base64***'}}}])
    );
    const repo = new CloudKitContentPackRepository();
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'malformed'});
});

test('un base64 válido cuyo contenido no es JSON → malformed', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok'});
    const notJson = btoa('esto no es json');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        cloudKitResponse([{fields: {payloadData: {value: notJson}}}])
    );
    const repo = new CloudKitContentPackRepository();
    expect(await repo.findByShortId('k9X2bQ')).toEqual({kind: 'malformed'});
});

test('la petición usa el endpoint lookup con recordName = shortId', async () => {
    setEnv({CLOUDKIT_API_TOKEN: 'tok secreto', CLOUDKIT_ENV: 'development'});
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return cloudKitResponse([{serverErrorCode: 'NOT_FOUND'}]);
    });

    const repo = new CloudKitContentPackRepository();
    await repo.findByShortId('k9X2bQ');

    expect(capturedUrl).toContain('/records/lookup?ckAPIToken=');
    expect(capturedUrl).toContain('/development/');
    expect(capturedInit?.method).toBe('POST');
    expect(JSON.parse(String(capturedInit?.body))).toEqual({records: [{recordName: 'k9X2bQ'}]});
});
