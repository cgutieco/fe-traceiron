export const SHORT_ID_PATTERN = /^[A-Za-z0-9]{6}$/;

export function isShortId(id: string): boolean {
    return SHORT_ID_PATTERN.test(id);
}
