import type {SupportRequestInput} from '../model/support-request';

export type MailDispatchResult = {kind: 'sent'} | {kind: 'failed'};

export interface MailGateway {
    send(input: SupportRequestInput): Promise<MailDispatchResult>;
}
