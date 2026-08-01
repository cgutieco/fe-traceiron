export const LIMITS = {
    nameMaxLength: 60,
    sharedPackTitleMaxLength: 80,
    sharedPackMaxRoutines: 50,
    sharedPackMaxExercisesPerRoutine: 100,
    sharedPackMaxExerciseSnapshots: 200
} as const;

export const VISIBLE_EXERCISE_LIMIT = 12;

export type ContentType = 'routine' | 'exercise' | 'pack';

export interface TemplateSnapshot {
    exerciseName: string;
    muscleGroup: string;
    isIsometric: boolean;
    order: number;
    defaultSets: number;
    restSeconds: number;
}

export interface RoutineSnapshot {
    routineName: string;
    templates: TemplateSnapshot[];
}

export interface ExerciseSnapshot {
    name: string;
    muscleGroup: string;
    isIsometric: boolean;
}

export interface ContentPack {
    contentType: ContentType;
    title: string;
    authorName: string | null;
    routines: RoutineSnapshot[];
    exercises: ExerciseSnapshot[];
}

export type ShareState = 'OK' | 'BAD_ID' | 'NOT_FOUND' | 'MALFORMED' | 'SERVICE_DOWN' | 'OVERSIZED';

export type ParseResult =
    {state: 'OK' | 'OVERSIZED'; pack: ContentPack} | {state: 'MALFORMED'; pack: null};

function asString(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;

    const cleaned = value
        .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (cleaned.length === 0) return null;
    return cleaned.slice(0, maxLength);
}

function asInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = typeof value === 'number' ? value : Number.NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}

function asBool(value: unknown): boolean {
    return value === true;
}

function asContentType(value: unknown): ContentType | null {
    return value === 'routine' || value === 'exercise' || value === 'pack' ? value : null;
}

export function parseContentPack(raw: unknown): ParseResult {
    if (typeof raw !== 'object' || raw === null) return {state: 'MALFORMED', pack: null};

    const source = raw as Record<string, unknown>;

    const contentType = asContentType(source.contentTypeRaw ?? source.contentType);
    const title = asString(source.title, LIMITS.sharedPackTitleMaxLength);
    if (!contentType || !title) return {state: 'MALFORMED', pack: null};

    let oversized = false;

    const authorName = asString(source.authorName, LIMITS.nameMaxLength);

    const rawRoutines = Array.isArray(source.routineSnapshots) ? source.routineSnapshots : [];
    if (rawRoutines.length > LIMITS.sharedPackMaxRoutines) oversized = true;

    const routines: RoutineSnapshot[] = [];
    for (const entry of rawRoutines.slice(0, LIMITS.sharedPackMaxRoutines)) {
        if (typeof entry !== 'object' || entry === null) continue;
        const routine = entry as Record<string, unknown>;

        const routineName = asString(routine.routineName, LIMITS.nameMaxLength);
        if (!routineName) continue;

        const rawTemplates = Array.isArray(routine.templates) ? routine.templates : [];
        if (rawTemplates.length > LIMITS.sharedPackMaxExercisesPerRoutine) oversized = true;

        const templates: TemplateSnapshot[] = [];
        for (const templateEntry of rawTemplates.slice(
            0,
            LIMITS.sharedPackMaxExercisesPerRoutine
        )) {
            if (typeof templateEntry !== 'object' || templateEntry === null) continue;
            const template = templateEntry as Record<string, unknown>;

            const exerciseName = asString(template.exerciseName, LIMITS.nameMaxLength);
            if (!exerciseName) continue;

            templates.push({
                exerciseName,
                muscleGroup: asString(template.muscleGroup, LIMITS.nameMaxLength) ?? '',
                isIsometric: asBool(template.isIsometric),
                order: asInt(template.order, 0, 9999, templates.length),
                defaultSets: asInt(template.defaultSets, 0, 999, 0),
                restSeconds: asInt(template.restSeconds, 0, 86400, 0)
            });
        }

        templates.sort((a, b) => a.order - b.order);

        routines.push({routineName, templates});
    }

    const rawExercises = Array.isArray(source.exerciseSnapshots) ? source.exerciseSnapshots : [];
    if (rawExercises.length > LIMITS.sharedPackMaxExerciseSnapshots) oversized = true;

    const exercises: ExerciseSnapshot[] = [];
    for (const entry of rawExercises.slice(0, LIMITS.sharedPackMaxExerciseSnapshots)) {
        if (typeof entry !== 'object' || entry === null) continue;
        const exercise = entry as Record<string, unknown>;

        const name = asString(exercise.name, LIMITS.nameMaxLength);
        if (!name) continue;

        exercises.push({
            name,
            muscleGroup: asString(exercise.muscleGroup, LIMITS.nameMaxLength) ?? '',
            isIsometric: asBool(exercise.isIsometric)
        });
    }

    if (routines.length === 0 && exercises.length === 0) {
        return {state: 'MALFORMED', pack: null};
    }

    return {
        state: oversized ? 'OVERSIZED' : 'OK',
        pack: {contentType, title, authorName, routines, exercises}
    };
}

export interface ShareMetrics {
    routines: number;
    exercises: number;
    sets: number;
    avgRest: number | null;
}

export function buildMetrics(pack: ContentPack): ShareMetrics {
    const templates = pack.routines.flatMap((routine) => routine.templates);
    const sets = templates.reduce((total, template) => total + template.defaultSets, 0);
    const restTotal = templates.reduce((total, template) => total + template.restSeconds, 0);

    return {
        routines: pack.routines.length,
        exercises: templates.length + pack.exercises.length,
        sets,
        avgRest: templates.length > 0 ? Math.round(restTotal / templates.length) : null
    };
}

export interface DisplayRow {
    order: number;
    name: string;
    muscleGroup: string;
    isIsometric: boolean;
    sets: number | null;
    restSeconds: number | null;
    routineName: string | null;
}

export function buildRows(pack: ContentPack): {rows: DisplayRow[]; hidden: number} {
    const multiRoutine = pack.routines.length > 1;
    const all: DisplayRow[] = [];

    for (const routine of pack.routines) {
        for (const template of routine.templates) {
            all.push({
                order: all.length + 1,
                name: template.exerciseName,
                muscleGroup: template.muscleGroup,
                isIsometric: template.isIsometric,
                sets: template.defaultSets,
                restSeconds: template.restSeconds,
                routineName: multiRoutine ? routine.routineName : null
            });
        }
    }

    for (const exercise of pack.exercises) {
        all.push({
            order: all.length + 1,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            isIsometric: exercise.isIsometric,
            sets: null,
            restSeconds: null,
            routineName: null
        });
    }

    return {
        rows: all.slice(0, VISIBLE_EXERCISE_LIMIT),
        hidden: Math.max(0, all.length - VISIBLE_EXERCISE_LIMIT)
    };
}
