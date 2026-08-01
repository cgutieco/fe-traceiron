export type ContentPackLookup =
    | {kind: 'found'; payload: unknown}
    | {kind: 'not-found'}
    | {kind: 'malformed'}
    | {kind: 'service-down'};

export interface ContentPackRepository {
    findByShortId(shortId: string): Promise<ContentPackLookup>;
}
