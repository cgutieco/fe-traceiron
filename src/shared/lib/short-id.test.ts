import {test, expect} from 'vitest';
import {SHORT_ID_PATTERN, isShortId} from './short-id.ts';

test('isShortId y SHORT_ID_PATTERN aceptan solo cadenas alfanuméricas de exactamente 6 caracteres', () => {
    const validIds = ['k9X2bQ', 'abc123', 'ABCDEF', '000000', 'z9Y8x7'];
    for (const id of validIds) {
        expect(SHORT_ID_PATTERN.test(id)).toBe(true);
        expect(isShortId(id)).toBe(true);
    }
});

test('isShortId rechaza cadenas de longitud incorrecta o con caracteres especiales', () => {
    const invalidIds = ['abc', 'abcdefg', 'abc-12', 'abc 12', 'ábc123', '', '../../x'];
    for (const id of invalidIds) {
        expect(SHORT_ID_PATTERN.test(id)).toBe(false);
        expect(isShortId(id)).toBe(false);
    }
});
