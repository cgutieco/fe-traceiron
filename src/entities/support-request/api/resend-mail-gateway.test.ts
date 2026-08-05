import {test, expect, vi, beforeEach} from 'vitest';

(
    globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
).__TRACEIRON_CF_ENV__ = {};

const {ResendMailGateway} = await import('./resend-mail-gateway.ts');

function setEnv(overrides: Record<string, string | undefined> = {}) {
    const target = (
        globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
    ).__TRACEIRON_CF_ENV__;
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, overrides);
}

const input = {name: 'Ada Lovelace', email: 'ada@example.com', message: 'Necesito ayuda.'};

beforeEach(() => {
    vi.restoreAllMocks();
});

test('sin RESEND_API_KEY configurado falla sin llamar a fetch', async () => {
    setEnv({});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new Error('no debería llamarse');
    });

    const gateway = new ResendMailGateway();
    expect(await gateway.send(input)).toEqual({kind: 'failed'});
    expect(fetchMock).not.toHaveBeenCalled();
});

test('una respuesta HTTP ok devuelve sent', async () => {
    setEnv({RESEND_API_KEY: 'key'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () => ({ok: true}) as unknown as Response
    );

    const gateway = new ResendMailGateway();
    expect(await gateway.send(input)).toEqual({kind: 'sent'});
});

test('una respuesta HTTP no-ok devuelve failed', async () => {
    setEnv({RESEND_API_KEY: 'key'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () => ({ok: false}) as unknown as Response
    );

    const gateway = new ResendMailGateway();
    expect(await gateway.send(input)).toEqual({kind: 'failed'});
});

test('un fetch que lanza (timeout/red) degrada a failed', async () => {
    setEnv({RESEND_API_KEY: 'key'});
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new DOMException('The operation was aborted', 'AbortError');
    });

    const gateway = new ResendMailGateway();
    expect(await gateway.send(input)).toEqual({kind: 'failed'});
});

test('envía Authorization Bearer, reply_to y el mensaje en texto plano', async () => {
    setEnv({RESEND_API_KEY: 'sk_test_123'});
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return {ok: true} as unknown as Response;
    });

    const gateway = new ResendMailGateway();
    await gateway.send(input);

    expect(capturedUrl).toBe('https://api.resend.com/emails');
    expect(capturedInit?.method).toBe('POST');
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe(
        'Bearer sk_test_123'
    );

    const body = JSON.parse(String(capturedInit?.body));
    expect(body.reply_to).toBe('ada@example.com');
    expect(body.to).toEqual(['support@traceiron.com']);
    expect(body.text).toContain('Ada Lovelace');
    expect(body.text).toContain('Necesito ayuda.');
});

test('name ausente se refleja como (not provided) en el cuerpo', async () => {
    setEnv({RESEND_API_KEY: 'sk_test_123'});
    let capturedInit: RequestInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        capturedInit = init;
        return {ok: true} as unknown as Response;
    });

    const gateway = new ResendMailGateway();
    await gateway.send({...input, name: null});

    const body = JSON.parse(String(capturedInit?.body));
    expect(body.text).toContain('(not provided)');
});
