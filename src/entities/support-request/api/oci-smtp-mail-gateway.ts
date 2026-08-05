import {connect} from 'cloudflare:sockets';
import {getRuntimeEnv} from '@shared/lib/runtime-env';
import {SUPPORT_EMAIL, SUPPORT_FORM_SENDER_EMAIL} from '@shared/config/site';
import type {SupportRequestInput} from '../model/support-request';
import type {MailDispatchResult, MailGateway} from './mail-gateway';

// Host fijo al home region de OCI (us-ashburn-1, ver fsd-architecture skill). Si el
// dominio de correo se recrea en otra región, este valor debe actualizarse junto con
// las credenciales SMTP.
const SMTP_HOST = 'smtp.email.us-ashburn-1.oci.oraclecloud.com';
const SMTP_PORT = 587;
const TIMEOUT_MS = 8000;

export interface SmtpCredentials {
    username: string;
    password: string;
}

export interface SmtpSocketLike {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    startTls(): SmtpSocketLike;
}

interface ReadCarry {
    buffer: string;
}

function encodeBase64(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function dotStuff(body: string): string {
    return body
        .split('\r\n')
        .map((line) => (line.startsWith('.') ? `.${line}` : line))
        .join('\r\n');
}

export function buildMimeMessage(input: SupportRequestInput): string {
    const lines = [
        `From: TraceIron Support <${SUPPORT_FORM_SENDER_EMAIL}>`,
        `To: ${SUPPORT_EMAIL}`,
        `Reply-To: ${input.email}`,
        'Subject: New TraceIron support request',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        `Name: ${input.name ?? '(not provided)'}`,
        `Email: ${input.email}`,
        '',
        'Message:',
        input.message
    ];
    return dotStuff(lines.join('\r\n'));
}

export async function readSmtpResponse(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    carry: ReadCarry
): Promise<{code: number; message: string}> {
    const decoder = new TextDecoder();
    const lines: string[] = [];

    for (;;) {
        const newlineIndex = carry.buffer.indexOf('\r\n');
        if (newlineIndex === -1) {
            const {value, done} = await reader.read();
            if (done) throw new Error('SMTP: conexión cerrada inesperadamente');
            carry.buffer += decoder.decode(value, {stream: true});
            continue;
        }

        const line = carry.buffer.slice(0, newlineIndex);
        carry.buffer = carry.buffer.slice(newlineIndex + 2);
        lines.push(line);

        const match = /^(\d{3})([ -])/.exec(line);
        if (!match) throw new Error(`SMTP: respuesta inesperada "${line}"`);
        if (match[2] === ' ') return {code: Number(match[1]), message: lines.join('\n')};
    }
}

async function writeLine(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    line: string
): Promise<void> {
    await writer.write(new TextEncoder().encode(`${line}\r\n`));
}

async function expectCode(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    carry: ReadCarry,
    expected: number
): Promise<void> {
    const {code, message} = await readSmtpResponse(reader, carry);
    if (code !== expected)
        throw new Error(`SMTP: esperaba ${expected}, recibió ${code}: ${message}`);
}

export async function sendSupportEmailOverSmtp(
    socket: SmtpSocketLike,
    credentials: SmtpCredentials,
    input: SupportRequestInput
): Promise<void> {
    let writer = socket.writable.getWriter();
    let reader = socket.readable.getReader();
    const carry: ReadCarry = {buffer: ''};

    await expectCode(reader, carry, 220);
    await writeLine(writer, 'EHLO traceiron.com');
    await expectCode(reader, carry, 250);

    await writeLine(writer, 'STARTTLS');
    await expectCode(reader, carry, 220);

    writer.releaseLock();
    reader.releaseLock();
    const tlsSocket = socket.startTls();
    writer = tlsSocket.writable.getWriter();
    reader = tlsSocket.readable.getReader();
    carry.buffer = '';

    await writeLine(writer, 'EHLO traceiron.com');
    await expectCode(reader, carry, 250);

    // El relay SMTP de OCI Email Delivery no soporta AUTH LOGIN (responde 504
    // "authentication mechanism is not supported"), solo AUTH PLAIN con la
    // respuesta inicial en la misma línea (RFC 4616).
    const authPlainPayload = `\0${credentials.username}\0${credentials.password}`;
    await writeLine(writer, `AUTH PLAIN ${encodeBase64(authPlainPayload)}`);
    await expectCode(reader, carry, 235);

    await writeLine(writer, `MAIL FROM:<${SUPPORT_FORM_SENDER_EMAIL}>`);
    await expectCode(reader, carry, 250);
    await writeLine(writer, `RCPT TO:<${SUPPORT_EMAIL}>`);
    await expectCode(reader, carry, 250);

    await writeLine(writer, 'DATA');
    await expectCode(reader, carry, 354);
    await writer.write(new TextEncoder().encode(`${buildMimeMessage(input)}\r\n.\r\n`));
    await expectCode(reader, carry, 250);

    await writeLine(writer, 'QUIT');
}

export class OciSmtpMailGateway implements MailGateway {
    async send(input: SupportRequestInput): Promise<MailDispatchResult> {
        const env = getRuntimeEnv();
        const username = env.OCI_SMTP_USERNAME;
        const password = env.OCI_SMTP_PASSWORD;
        if (!username || !password) return {kind: 'failed'};

        const socket = connect(
            {hostname: SMTP_HOST, port: SMTP_PORT},
            {secureTransport: 'starttls', allowHalfOpen: false}
        );

        const timeout = new Promise<never>((_resolve, reject) => {
            setTimeout(() => reject(new Error('SMTP: tiempo de espera agotado')), TIMEOUT_MS);
        });

        try {
            await Promise.race([
                sendSupportEmailOverSmtp(socket, {username, password}, input),
                timeout
            ]);
            return {kind: 'sent'};
        } catch (error) {
            console.error('OciSmtpMailGateway: fallo al enviar', error);
            return {kind: 'failed'};
        } finally {
            try {
                await socket.close();
            } catch {
                // best-effort: el socket puede ya estar cerrado por el propio error
            }
        }
    }
}

export function createOciSmtpMailGateway(): MailGateway {
    return new OciSmtpMailGateway();
}
