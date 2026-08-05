export function connect(): never {
    throw new Error(
        'cloudflare:sockets stub: connect() no debería llamarse directamente en tests — prueba la lógica de protocolo (sendSupportEmailOverSmtp, readSmtpResponse) con un socket falso en vez de instanciar OciSmtpMailGateway.'
    );
}
