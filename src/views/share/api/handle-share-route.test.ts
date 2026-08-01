import {test, expect} from 'vitest';
import {
    resolveSharePage,
    resolveGenericAlias,
    sharePath,
    CANONICAL_PREFIX
} from './handle-share-route.ts';
import type {
    ContentPackLookup,
    ContentPackRepository
} from '@entities/content-pack/api/content-pack-repository.ts';

function request(headers: Record<string, string> = {}) {
    return new Request('https://traceiron.com/r/k9X2bQ', {headers});
}

class MockContentPackRepository implements ContentPackRepository {
    constructor(private lookupResult: ContentPackLookup) {}

    async findByShortId(): Promise<ContentPackLookup> {
        return this.lookupResult;
    }
}

const routinePayload = {
    contentTypeRaw: 'routine',
    title: 'Push Day',
    routineSnapshots: [
        {
            routineName: 'Push',
            templates: [
                {
                    exerciseName: 'Bench Press',
                    muscleGroup: 'Chest',
                    isIsometric: false,
                    order: 0,
                    defaultSets: 4,
                    restSeconds: 90
                }
            ]
        }
    ],
    exerciseSnapshots: []
};

test('sharePath cae a la raíz en BAD_ID o sin id', () => {
    expect(sharePath('r', 'k9X2bQ', 'BAD_ID')).toBe('/');
    expect(sharePath('r', undefined, 'OK')).toBe('/');
});

test('sharePath compone prefijo/id para el resto de estados', () => {
    expect(sharePath('r', 'k9X2bQ', 'OK')).toBe('/r/k9X2bQ');
    expect(sharePath('e', 'k9X2bQ', 'NOT_FOUND')).toBe('/e/k9X2bQ');
});

test('un id ausente o mal formado da BAD_ID sin consultar el repositorio', async () => {
    let repoCalled = false;
    const mockRepo: ContentPackRepository = {
        async findByShortId() {
            repoCalled = true;
            return {kind: 'found', payload: routinePayload};
        }
    };

    for (const bad of [undefined, '', 'abc', 'abc-12']) {
        const result = await resolveSharePage(bad, request(), null, mockRepo);
        expect(result.state).toBe('BAD_ID');
        expect(result.status).toBe(404);
        expect(result.pack).toBeNull();
    }
    expect(repoCalled).toBe(false);
});

test('repositorio en SERVICE_DOWN da estado SERVICE_DOWN con status 200', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'service-down'});

    const result = await resolveSharePage('k9X2bQ', request(), null, mockRepo);
    expect(result.state).toBe('SERVICE_DOWN');
    expect(result.status).toBe(200);
});

test('NOT_FOUND de repositorio → 404', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'not-found'});

    const result = await resolveSharePage('k9X2bQ', request(), null, mockRepo);
    expect(result.state).toBe('NOT_FOUND');
    expect(result.status).toBe(404);
});

test('un registro con payload indecodificable (MALFORMED) → MALFORMED con 200', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'malformed'});

    const result = await resolveSharePage('k9X2bQ', request(), null, mockRepo);
    expect(result.state).toBe('MALFORMED');
    expect(result.status).toBe(200);
});

test('un payload decodificado que no pasa el esquema de share.ts → MALFORMED', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'found', payload: {title: ''}});

    const result = await resolveSharePage('k9X2bQ', request(), null, mockRepo);
    expect(result.state).toBe('MALFORMED');
    expect(result.status).toBe(200);
});

test('un payload válido → OK con 200, pack presente y caché de larga duración', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'found', payload: routinePayload});

    const result = await resolveSharePage('k9X2bQ', request(), null, mockRepo);
    expect(result.state).toBe('OK');
    expect(result.status).toBe(200);
    expect(result.pack?.title).toBe('Push Day');
    expect(result.cacheControl).toMatch(/max-age=300/);
});

test('el locale se resuelve por Accept-Language/cookie, no por prefijo de URL', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'found', payload: routinePayload});

    const byCookie = await resolveSharePage('k9X2bQ', request(), 'es', mockRepo);
    expect(byCookie.locale).toBe('es');

    const byHeader = await resolveSharePage(
        'k9X2bQ',
        request({'accept-language': 'es-MX,es;q=0.9'}),
        null,
        mockRepo
    );
    expect(byHeader.locale).toBe('es');
});

test('OK/OVERSIZED redirige al prefijo canónico del contentType', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'found', payload: routinePayload});

    const outcome = await resolveGenericAlias('k9X2bQ', request(), null, mockRepo);
    expect(outcome).toEqual({redirectTo: `/${CANONICAL_PREFIX.routine}/k9X2bQ`});
});

test('un estado que no es OK/OVERSIZED devuelve la resolución completa, sin redirigir', async () => {
    const mockRepo = new MockContentPackRepository({kind: 'not-found'});

    const outcome = await resolveGenericAlias('k9X2bQ', request(), null, mockRepo);
    expect('resolution' in outcome).toBe(true);
    if ('resolution' in outcome) {
        expect(outcome.resolution.state).toBe('NOT_FOUND');
    }
});
