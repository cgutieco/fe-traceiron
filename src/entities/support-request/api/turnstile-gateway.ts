export interface TurnstileGateway {
    verify(token: string, remoteIp: string | null): Promise<boolean>;
}
