import {createCloudflareTurnstileGateway} from '@entities/support-request/api/cloudflare-turnstile-gateway';
import type {TurnstileGateway} from '@entities/support-request/api/turnstile-gateway';
import {createOciSmtpMailGateway} from '@entities/support-request/api/oci-smtp-mail-gateway';
import type {MailGateway} from '@entities/support-request/api/mail-gateway';
import {
    parseSupportRequest,
    type SupportRequestFieldErrors
} from '@entities/support-request/model/support-request';

export type SupportRequestErrorCode =
    'bad_request' | 'captcha_failed' | 'validation_error' | 'mail_failed';

export type SupportRequestResponseBody =
    | {success: true}
    | {success: false; code: SupportRequestErrorCode; fields?: SupportRequestFieldErrors};

function jsonResponse(status: number, body: SupportRequestResponseBody): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {'Content-Type': 'application/json'}
    });
}

export async function handleSupportRequest(
    request: Request,
    clientIp: string | null,
    turnstileGateway: TurnstileGateway = createCloudflareTurnstileGateway(),
    mailGateway: MailGateway = createOciSmtpMailGateway()
): Promise<Response> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return jsonResponse(400, {success: false, code: 'bad_request'});
    }

    const body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const token =
        typeof body['cf-turnstile-response'] === 'string' ? body['cf-turnstile-response'] : '';

    const captchaOk = await turnstileGateway.verify(token, clientIp);
    if (!captchaOk) {
        return jsonResponse(403, {success: false, code: 'captcha_failed'});
    }

    const validation = parseSupportRequest(body);
    if (validation.kind === 'invalid') {
        return jsonResponse(400, {
            success: false,
            code: 'validation_error',
            fields: validation.fields
        });
    }

    const dispatch = await mailGateway.send(validation.value);
    if (dispatch.kind === 'failed') {
        return jsonResponse(502, {success: false, code: 'mail_failed'});
    }

    return jsonResponse(200, {success: true});
}
