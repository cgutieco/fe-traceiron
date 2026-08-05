import type {TurnstileGateway} from '../api/turnstile-gateway';

export function createFakeTurnstileGateway(outcome: boolean): TurnstileGateway {
    return {
        async verify() {
            return outcome;
        }
    };
}
