import type {MailDispatchResult, MailGateway} from '../api/mail-gateway';
import type {SupportRequestInput} from '../model/support-request';

export function createFakeMailGateway(outcome: MailDispatchResult['kind']): MailGateway & {
    sent: SupportRequestInput[];
} {
    const sent: SupportRequestInput[] = [];
    return {
        sent,
        async send(input) {
            sent.push(input);
            return {kind: outcome};
        }
    };
}
