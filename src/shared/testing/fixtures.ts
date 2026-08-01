export const validRoutinePayload = {
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
                },
                {
                    exerciseName: 'Incline Dumbbell Press',
                    muscleGroup: 'Chest',
                    isIsometric: false,
                    order: 1,
                    defaultSets: 3,
                    restSeconds: 90
                }
            ]
        }
    ],
    exerciseSnapshots: []
};

export const validExercisePayload = {
    contentTypeRaw: 'exercise',
    title: 'Pull Up',
    routineSnapshots: [],
    exerciseSnapshots: [
        {
            name: 'Pull Up',
            muscleGroup: 'Back',
            isIsometric: false
        }
    ]
};

export const payloadWithNotes = {
    contentTypeRaw: 'exercise',
    title: 'Curl de Bíceps',
    routineSnapshots: [],
    exerciseSnapshots: [
        {
            name: 'Curl con Barra W',
            muscleGroup: 'Bíceps',
            isIsometric: false,
            notes: 'INFORMACIÓN PRIVADA - Lesión en muñeca izquierda desde 2022'
        }
    ]
};

export const oversizedPayload = {
    contentTypeRaw: 'routine',
    title: 'Rutina Gigante',
    routineSnapshots: [
        {
            routineName: 'Super Routine',
            templates: Array.from({length: 105}, (_, i) => ({
                exerciseName: `Ejercicio Ultra ${i + 1}`,
                muscleGroup: 'Full Body',
                isIsometric: false,
                order: i,
                defaultSets: 4,
                restSeconds: 60
            }))
        }
    ],
    exerciseSnapshots: []
};

export const malformedPayload = {
    title: '',
    contentTypeRaw: 'invalid_type'
};
