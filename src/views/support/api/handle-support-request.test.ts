import {test, expect} from 'vitest';
import {handleSupportRequest} from '@views/support';
import {createFakeTurnstileGateway} from '@entities/support-request/testing/fake-turnstile-gateway.ts';
import {createFakeMailGateway} from '@entities/support-request/testing/fake-mail-gateway.ts';

function request(body: unknown): Request {
    return new Request('https://traceiron.com/api/support', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
}

const validPayload = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'I need help restoring a purchase.',
    'cf-turnstile-response': 'token'
};

test('un body que no es JSON válido devuelve 400 bad_request', async () => {
    const badRequest = new Request('https://traceiron.com/api/support', {
        method: 'POST',
        body: '{not json'
    });

    const response = await handleSupportRequest(
        badRequest,
        null,
        createFakeTurnstileGateway(true),
        createFakeMailGateway('sent')
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({success: false, code: 'bad_request'});
});

test('captcha inválido devuelve 403 captcha_failed sin validar campos ni enviar correo', async () => {
    const mail = createFakeMailGateway('sent');
    const response = await handleSupportRequest(
        request(validPayload),
        null,
        createFakeTurnstileGateway(false),
        mail
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({success: false, code: 'captcha_failed'});
    expect(mail.sent).toHaveLength(0);
});

test('campos inválidos devuelven 400 validation_error con el detalle por campo', async () => {
    const response = await handleSupportRequest(
        request({...validPayload, email: 'not-an-email'}),
        null,
        createFakeTurnstileGateway(true),
        createFakeMailGateway('sent')
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
        success: false,
        code: 'validation_error',
        fields: {email: 'invalid_format'}
    });
});

test('fallo del mail gateway devuelve 502 mail_failed', async () => {
    const response = await handleSupportRequest(
        request(validPayload),
        null,
        createFakeTurnstileGateway(true),
        createFakeMailGateway('failed')
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({success: false, code: 'mail_failed'});
});

test('un payload válido con captcha correcto envía el correo y devuelve 200', async () => {
    const mail = createFakeMailGateway('sent');
    const response = await handleSupportRequest(
        request(validPayload),
        '203.0.113.1',
        createFakeTurnstileGateway(true),
        mail
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({success: true});
    expect(mail.sent).toEqual([
        {
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            message: 'I need help restoring a purchase.'
        }
    ]);
});

test('el token de turnstile ausente se trata como cadena vacía, no crashea', async () => {
    const withoutToken = {
        name: validPayload.name,
        email: validPayload.email,
        message: validPayload.message
    };
    const response = await handleSupportRequest(
        request(withoutToken),
        null,
        createFakeTurnstileGateway(false),
        createFakeMailGateway('sent')
    );

    expect(response.status).toBe(403);
});
