import type {ContentPackLookup, ContentPackRepository} from '../api/content-pack-repository.ts';

export class FakeContentPackRepository implements ContentPackRepository {
    constructor(private readonly lookupResult: ContentPackLookup) {}

    async findByShortId(): Promise<ContentPackLookup> {
        return this.lookupResult;
    }
}

export function createFakeContentPackRepository(
    lookupResult: ContentPackLookup
): ContentPackRepository {
    return new FakeContentPackRepository(lookupResult);
}
