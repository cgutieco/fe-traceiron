import {test, expect, vi, beforeEach} from 'vitest';

(
    globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
).__TRACEIRON_CF_ENV__ = {};

const {CloudflareTurnstileGateway} = await import('./cloudflare-turnstile-gateway.ts');

function setEnv(overrides: Record<string, string | undefined> = {}) {
    const target = (
        globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
    ).__TRACEIRON_CF_ENV__;
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, overrides);
}

beforeEach(() => {
    vi.restoreAllMocks();
});

test('token vacío nunca llama a fetch y devuelve false', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'secret'});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new Error('no debería llamarse');
    });

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('', null)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
});

test('sin TURNSTILE_SECRET_KEY configurado devuelve false sin llamar a fetch', async () => {
    setEnv({});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new Error('no debería llamarse');
    });

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('token', null)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
});

test('respuesta success:true devuelve true', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'secret'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () => ({ok: true, json: async () => ({success: true})}) as unknown as Response
    );

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('token', '1.2.3.4')).toBe(true);
});

test('respuesta success:false devuelve false', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'secret'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
            ({
                ok: true,
                json: async () => ({success: false, 'error-codes': ['invalid-input-response']})
            }) as unknown as Response
    );

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('token', null)).toBe(false);
});

test('una respuesta HTTP no-ok degrada a false', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'secret'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () => ({ok: false}) as unknown as Response
    );

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('token', null)).toBe(false);
});

test('un fetch que lanza (timeout/red) degrada a false', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'secret'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new DOMException('The operation was aborted', 'AbortError');
    });

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('token', null)).toBe(false);
});

test('un body que no es JSON válido degrada a false', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'secret'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
            ({
                ok: true,
                json: async () => {
                    throw new SyntaxError('Unexpected token');
                }
            }) as unknown as Response
    );

    const gateway = new CloudflareTurnstileGateway();
    expect(await gateway.verify('token', null)).toBe(false);
});

test('envía secret, response y remoteip codificados como form-urlencoded', async () => {
    setEnv({TURNSTILE_SECRET_KEY: 'super secret'});
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return {ok: true, json: async () => ({success: true})} as unknown as Response;
    });

    const gateway = new CloudflareTurnstileGateway();
    await gateway.verify('the-token', '203.0.113.1');

    expect(capturedUrl).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(capturedInit?.method).toBe('POST');
    const body = capturedInit?.body as URLSearchParams;
    expect(body.get('secret')).toBe('super secret');
    expect(body.get('response')).toBe('the-token');
    expect(body.get('remoteip')).toBe('203.0.113.1');
});
