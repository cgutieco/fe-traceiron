import {test, expect} from 'vitest';
import {
    buildMimeMessage,
    readSmtpResponse,
    sendSupportEmailOverSmtp,
    type SmtpSocketLike
} from './oci-smtp-mail-gateway.ts';

const input = {name: 'Ada Lovelace', email: 'ada@example.com', message: 'Necesito ayuda.'};

function fakeReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
    const queue = [...chunks];
    return {
        async read() {
            const chunk = queue.shift();
            if (chunk === undefined) return {value: undefined, done: true};
            return {value: new TextEncoder().encode(chunk), done: false};
        },
        releaseLock() {},
        cancel: async () => undefined,
        closed: Promise.resolve(undefined)
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

test('readSmtpResponse arma una respuesta multilínea hasta la línea final con espacio', async () => {
    const reader = fakeReader(['250-PIPELINING\r\n250-AUTH LOGIN\r\n250 STARTTLS\r\n']);
    const result = await readSmtpResponse(reader, {buffer: ''});
    expect(result.code).toBe(250);
    expect(result.message).toContain('AUTH LOGIN');
});

test('readSmtpResponse recompone líneas partidas entre chunks', async () => {
    const reader = fakeReader(['220 smtp.', 'email.oci.oraclecloud.com ESMTP\r\n']);
    const result = await readSmtpResponse(reader, {buffer: ''});
    expect(result.code).toBe(220);
});

test('readSmtpResponse lanza si la conexión se cierra sin línea completa', async () => {
    const reader = fakeReader([]);
    await expect(readSmtpResponse(reader, {buffer: ''})).rejects.toThrow(/cerrada inesperadamente/);
});

test('buildMimeMessage incluye remitente, destinatario, reply-to y el mensaje', () => {
    const mime = buildMimeMessage(input);
    expect(mime).toContain('Reply-To: ada@example.com');
    expect(mime).toContain('Ada Lovelace');
    expect(mime).toContain('Necesito ayuda.');
});

test('buildMimeMessage aplica dot-stuffing a líneas que empiezan con punto', () => {
    const mime = buildMimeMessage({...input, message: '.oculto\r\nresto'});
    expect(mime).toContain('..oculto');
});

test('name ausente se refleja como (not provided)', () => {
    const mime = buildMimeMessage({...input, name: null});
    expect(mime).toContain('(not provided)');
});

function scriptedSocket(responses: string[]): {
    socket: SmtpSocketLike;
    written: string[];
    startTlsCalled: boolean;
} {
    const written: string[] = [];
    let startTlsCalled = false;
    const decoder = new TextDecoder();

    // Un solo flujo continuo de bytes, igual que una conexión TCP real: startTls()
    // sigue leyendo/escribiendo sobre el mismo readable/writable, solo con un nuevo
    // reader/writer, no una conexión nueva desde cero.
    const readable = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const response of responses) {
                controller.enqueue(new TextEncoder().encode(response));
            }
            controller.close();
        }
    });
    const writable = new WritableStream<Uint8Array>({
        write(chunk) {
            written.push(decoder.decode(chunk));
        }
    });

    const socket: SmtpSocketLike = {
        readable,
        writable,
        startTls() {
            startTlsCalled = true;
            return socket;
        }
    };

    return {
        socket,
        written,
        get startTlsCalled() {
            return startTlsCalled;
        }
    };
}

test('sendSupportEmailOverSmtp sigue la secuencia completa del protocolo con credenciales correctas', async () => {
    const scripted = scriptedSocket([
        '220 ready\r\n',
        '250 EHLO ok\r\n',
        '220 starttls ok\r\n',
        '250 EHLO ok\r\n',
        '235 auth ok\r\n',
        '250 mail from ok\r\n',
        '250 rcpt to ok\r\n',
        '354 send data\r\n',
        '250 queued\r\n'
    ]);
    const {socket, written} = scripted;

    await sendSupportEmailOverSmtp(socket, {username: 'user', password: 'pass'}, input);

    expect(scripted.startTlsCalled).toBe(true);
    const authLine = written.find((line) => line.startsWith('AUTH PLAIN'));
    expect(authLine).toBeDefined();
    const [, , payload] = authLine!.trim().split(' ');
    expect(atob(payload)).toBe('\0user\0pass');
    expect(written.some((line) => line.startsWith('MAIL FROM:'))).toBe(true);
    expect(written.some((line) => line.includes('Reply-To: ada@example.com'))).toBe(true);
    expect(written.some((line) => line.startsWith('QUIT'))).toBe(true);
});

test('sendSupportEmailOverSmtp lanza si la autenticación es rechazada', async () => {
    const {socket} = scriptedSocket([
        '220 ready\r\n',
        '250 EHLO ok\r\n',
        '220 starttls ok\r\n',
        '250 EHLO ok\r\n',
        '535 auth failed\r\n'
    ]);

    await expect(
        sendSupportEmailOverSmtp(socket, {username: 'user', password: 'wrong'}, input)
    ).rejects.toThrow(/esperaba 235/);
});
