import {test, expect} from 'vitest';
import {
    LIMITS,
    VISIBLE_EXERCISE_LIMIT,
    buildMetrics,
    buildRows,
    parseContentPack
} from './content-pack.ts';

const template = (overrides = {}) => ({
    exerciseName: 'Bench Press',
    muscleGroup: 'Chest',
    isIsometric: false,
    order: 0,
    defaultSets: 4,
    restSeconds: 90,
    ...overrides
});

const payload = (overrides = {}) => ({
    contentTypeRaw: 'routine',
    title: 'Push Day',
    routineSnapshots: [{routineName: 'Push', templates: [template()]}],
    exerciseSnapshots: [],
    ...overrides
});

/* ── Estados de validación ──────────────────────────────────────────────── */

test('un payload válido devuelve OK', () => {
    const result = parseContentPack(payload());
    expect(result.state).toBe('OK');
    if (result.state === 'OK') {
        expect(result.pack.title).toBe('Push Day');
        expect(result.pack.contentType).toBe('routine');
    }
});

test('MALFORMED cuando falta el título', () => {
    expect(parseContentPack(payload({title: ''})).state).toBe('MALFORMED');
    expect(parseContentPack(payload({title: '   '})).state).toBe('MALFORMED');
    expect(parseContentPack(payload({title: undefined})).state).toBe('MALFORMED');
});

test('MALFORMED cuando el contentType no es uno de los tres válidos', () => {
    expect(parseContentPack(payload({contentTypeRaw: 'workout'})).state).toBe('MALFORMED');
    expect(parseContentPack(payload({contentTypeRaw: 42})).state).toBe('MALFORMED');
});

test('MALFORMED ante entradas que no son un objeto', () => {
    for (const junk of [null, undefined, 'texto', 42, []]) {
        expect(parseContentPack(junk).state).toBe('MALFORMED');
    }
});

test('MALFORMED cuando no queda nada que enseñar', () => {
    const result = parseContentPack(payload({routineSnapshots: [], exerciseSnapshots: []}));
    expect(result.state).toBe('MALFORMED');
});

/* ── Defensa contra "payload bomb" ─────────────────────────────────────── */

test('devuelve estado OVERSIZED y trunca al tope de rutinas permitido', () => {
    const many = Array.from({length: LIMITS.sharedPackMaxRoutines + 10}, (_, i) => ({
        routineName: `Rutina ${i}`,
        templates: [template()]
    }));
    const result = parseContentPack(payload({routineSnapshots: many}));

    expect(result.state).toBe('OVERSIZED');
    if (result.state === 'OVERSIZED') {
        expect(result.pack.routines.length).toBe(LIMITS.sharedPackMaxRoutines);
    }
});

test('devuelve estado OVERSIZED y trunca al tope de ejercicios por rutina', () => {
    const templates = Array.from({length: LIMITS.sharedPackMaxExercisesPerRoutine + 5}, (_, i) =>
        template({order: i})
    );
    const result = parseContentPack(
        payload({routineSnapshots: [{routineName: 'Grande', templates}]})
    );

    expect(result.state).toBe('OVERSIZED');
    if (result.state === 'OVERSIZED') {
        expect(result.pack.routines[0].templates.length).toBe(
            LIMITS.sharedPackMaxExercisesPerRoutine
        );
    }
});

test('devuelve estado OVERSIZED y trunca al tope de ejercicios sueltos', () => {
    const exercises = Array.from({length: LIMITS.sharedPackMaxExerciseSnapshots + 7}, (_, i) => ({
        name: `Ejercicio ${i}`,
        muscleGroup: 'Pecho',
        isIsometric: false
    }));
    const result = parseContentPack(
        payload({contentTypeRaw: 'pack', exerciseSnapshots: exercises})
    );

    expect(result.state).toBe('OVERSIZED');
    if (result.state === 'OVERSIZED') {
        expect(result.pack.exercises.length).toBe(LIMITS.sharedPackMaxExerciseSnapshots);
    }
});

test('el título se acota a sharedPackTitleMaxLength', () => {
    const long = 'A'.repeat(LIMITS.sharedPackTitleMaxLength + 50);
    const result = parseContentPack(payload({title: long}));
    if (result.state === 'OK' || result.state === 'OVERSIZED') {
        expect(result.pack.title.length).toBe(LIMITS.sharedPackTitleMaxLength);
    }
});

/* ── Saneado de contenido no confiable ──────────────────────────────────── */

test('las notas del emisor NUNCA llegan al modelo renderizado', () => {
    const result = parseContentPack(
        payload({
            contentTypeRaw: 'exercise',
            exerciseSnapshots: [
                {
                    name: 'Curl',
                    muscleGroup: 'Bíceps',
                    isIsometric: false,
                    notes: 'Lesión de hombro desde 2019 — información privada'
                }
            ]
        })
    );

    if (result.state === 'OK' || result.state === 'OVERSIZED') {
        const serialised = JSON.stringify(result.pack);
        expect(serialised.includes('Lesión')).toBe(false);
        expect('notes' in result.pack.exercises[0]).toBe(false);
    }
});

test('authorName vacío o ausente se normaliza a null', () => {
    const res1 = parseContentPack(payload());
    const res2 = parseContentPack(payload({authorName: ''}));
    const res3 = parseContentPack(payload({authorName: '   '}));
    const res4 = parseContentPack(payload({authorName: 'Cesar'}));
    if (res1.state === 'OK') expect(res1.pack.authorName).toBeNull();
    if (res2.state === 'OK') expect(res2.pack.authorName).toBeNull();
    if (res3.state === 'OK') expect(res3.pack.authorName).toBeNull();
    if (res4.state === 'OK') expect(res4.pack.authorName).toBe('Cesar');
});

test('los caracteres de control se eliminan de los nombres', () => {
    const result = parseContentPack(payload({title: 'Push  Day\n\n  Extra'}));
    if (result.state === 'OK') {
        expect(result.pack.title).toBe('Push Day Extra');
    }
});

test('los números fuera de rango se acotan en vez de propagarse', () => {
    const result = parseContentPack(
        payload({
            routineSnapshots: [
                {
                    routineName: 'Rara',
                    templates: [template({defaultSets: -5, restSeconds: 999999, order: Number.NaN})]
                }
            ]
        })
    );

    if (result.state === 'OK') {
        const t = result.pack.routines[0].templates[0];
        expect(t.defaultSets).toBe(0);
        expect(t.restSeconds).toBe(86400);
        expect(Number.isFinite(t.order)).toBe(true);
    }
});

test('los ítems de un lote con nombre inválido se descartan en silencio', () => {
    const result = parseContentPack(
        payload({
            routineSnapshots: [
                {routineName: 'Buena', templates: [template(), template({exerciseName: '  '})]},
                {routineName: '', templates: [template()]}
            ]
        })
    );

    if (result.state === 'OK') {
        expect(result.pack.routines.length).toBe(1);
        expect(result.pack.routines[0].templates.length).toBe(1);
    }
});

/* ── Orden y derivados de UI ────────────────────────────────────────────── */

test('las plantillas se ordenan por order antes de renderizar', () => {
    const result = parseContentPack(
        payload({
            routineSnapshots: [
                {
                    routineName: 'Desordenada',
                    templates: [
                        template({exerciseName: 'Tercero', order: 2}),
                        template({exerciseName: 'Primero', order: 0}),
                        template({exerciseName: 'Segundo', order: 1})
                    ]
                }
            ]
        })
    );

    if (result.state === 'OK') {
        expect(result.pack.routines[0].templates.map((t) => t.exerciseName)).toEqual([
            'Primero',
            'Segundo',
            'Tercero'
        ]);
    }
});

test('las métricas suman series y promedian el descanso', () => {
    const result = parseContentPack(
        payload({
            routineSnapshots: [
                {
                    routineName: 'Push',
                    templates: [
                        template({defaultSets: 4, restSeconds: 60}),
                        template({exerciseName: 'Fly', defaultSets: 3, restSeconds: 120, order: 1})
                    ]
                }
            ]
        })
    );

    if (result.state === 'OK') {
        const metrics = buildMetrics(result.pack);
        expect(metrics.exercises).toBe(2);
        expect(metrics.sets).toBe(7);
        expect(metrics.avgRest).toBe(90);
        expect(metrics.routines).toBe(1);
    }
});

test('avgRest es null cuando no hay plantillas', () => {
    const result = parseContentPack(
        payload({
            contentTypeRaw: 'exercise',
            routineSnapshots: [],
            exerciseSnapshots: [{name: 'Plancha', muscleGroup: 'Core', isIsometric: true}]
        })
    );

    if (result.state === 'OK') {
        expect(buildMetrics(result.pack).avgRest).toBeNull();
    }
});

test('la lista visible se trunca a 12 con el resto contabilizado', () => {
    const templates = Array.from({length: 20}, (_, i) =>
        template({exerciseName: `Ejercicio ${i}`, order: i})
    );
    const result = parseContentPack(
        payload({routineSnapshots: [{routineName: 'Larga', templates}]})
    );

    if (result.state === 'OK') {
        const {rows, hidden} = buildRows(result.pack);
        expect(rows.length).toBe(VISIBLE_EXERCISE_LIMIT);
        expect(hidden).toBe(20 - VISIBLE_EXERCISE_LIMIT);
        expect(rows[0].order).toBe(1);
    }
});

test('el nombre de rutina solo se etiqueta cuando el pack trae varias', () => {
    const one = parseContentPack(payload());
    if (one.state === 'OK') {
        expect(buildRows(one.pack).rows[0].routineName).toBeNull();
    }

    const many = parseContentPack(
        payload({
            contentTypeRaw: 'pack',
            routineSnapshots: [
                {routineName: 'Push', templates: [template()]},
                {routineName: 'Pull', templates: [template({exerciseName: 'Row'})]}
            ]
        })
    );
    if (many.state === 'OK') {
        expect(buildRows(many.pack).rows[0].routineName).toBe('Push');
    }
});
