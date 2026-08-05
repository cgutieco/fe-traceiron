import {getRuntimeEnv} from '@shared/lib/runtime-env';
import {SUPPORT_EMAIL, SUPPORT_FORM_SENDER_EMAIL} from '@shared/config/site';
import type {SupportRequestInput} from '../model/support-request';
import type {MailDispatchResult, MailGateway} from './mail-gateway';

const RESEND_API_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 4000;

function buildBody(input: SupportRequestInput): string {
    const lines = [
        `Name: ${input.name ?? '(not provided)'}`,
        `Email: ${input.email}`,
        '',
        'Message:',
        input.message
    ];
    return lines.join('\n');
}

export class ResendMailGateway implements MailGateway {
    async send(input: SupportRequestInput): Promise<MailDispatchResult> {
        const apiKey = getRuntimeEnv().RESEND_API_KEY;
        if (!apiKey) return {kind: 'failed'};

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(RESEND_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: `TraceIron Support <${SUPPORT_FORM_SENDER_EMAIL}>`,
                    to: [SUPPORT_EMAIL],
                    reply_to: input.email,
                    subject: 'New TraceIron support request',
                    text: buildBody(input)
                }),
                signal: controller.signal
            });
        } catch {
            return {kind: 'failed'};
        } finally {
            clearTimeout(timer);
        }

        return response.ok ? {kind: 'sent'} : {kind: 'failed'};
    }
}

export function createResendMailGateway(): MailGateway {
    return new ResendMailGateway();
}
