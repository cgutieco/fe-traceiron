export const LIMITS = {
    nameMaxLength: 100,
    emailMaxLength: 254,
    messageMinLength: 10,
    messageMaxLength: 2000
} as const;

export interface SupportRequestInput {
    name: string | null;
    email: string;
    message: string;
}

export type SupportRequestFieldError = 'required' | 'invalid_format' | 'too_short' | 'too_long';

export type SupportRequestFieldErrors = Partial<
    Record<'name' | 'email' | 'message', SupportRequestFieldError>
>;

export type SupportRequestValidation =
    | {kind: 'valid'; value: SupportRequestInput}
    | {kind: 'invalid'; fields: SupportRequestFieldErrors};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseSupportRequest(raw: unknown): SupportRequestValidation {
    const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const fields: SupportRequestFieldErrors = {};

    const rawName = cleanText(source.name);
    let name: string | null = null;
    if (rawName.length > LIMITS.nameMaxLength) {
        fields.name = 'too_long';
    } else if (rawName.length > 0) {
        name = rawName;
    }

    const rawEmail = cleanText(source.email);
    let email = '';
    if (rawEmail.length === 0) {
        fields.email = 'required';
    } else if (rawEmail.length > LIMITS.emailMaxLength || !EMAIL_PATTERN.test(rawEmail)) {
        fields.email = 'invalid_format';
    } else {
        email = rawEmail;
    }

    const rawMessage = cleanText(source.message);
    let message = '';
    if (rawMessage.length === 0) {
        fields.message = 'required';
    } else if (rawMessage.length < LIMITS.messageMinLength) {
        fields.message = 'too_short';
    } else if (rawMessage.length > LIMITS.messageMaxLength) {
        fields.message = 'too_long';
    } else {
        message = rawMessage;
    }

    if (Object.keys(fields).length > 0) {
        return {kind: 'invalid', fields};
    }

    return {kind: 'valid', value: {name, email, message}};
}
