import { describe, expect, test } from 'bun:test';
import {
  areRepositoriesCurrentlyPublic,
  filterCurrentlyPublicProfiles,
  withVerifiedPublicSources,
} from '../src/lib/profile/public-provenance';

const alice = { owner: 'Alice', name: 'Public' };
const bob = { owner: 'Bob', name: 'Private' };

describe('developer profile public provenance', () => {
  test('quarantines legacy profiles without verified sources', async () => {
    const legacy = { profileData: { summary: 'could contain private code' } };
    const visible = await filterCurrentlyPublicProfiles([legacy], async () => new Set(['alice/public']));
    expect(visible).toEqual([]);
  });

  test('requires every source repository to remain public', async () => {
    const profileData = withVerifiedPublicSources({ summary: 'profile' }, [alice, bob]);
    const row = { profileData };
    const hidden = await filterCurrentlyPublicProfiles([row], async () => new Set(['alice/public']));
    expect(hidden).toEqual([]);
    const visible = await filterCurrentlyPublicProfiles([row], async () => new Set(['alice/public', 'bob/private']));
    expect(visible).toEqual([row]);
  });

  test('fails closed when visibility is unknown before publication', async () => {
    expect(await areRepositoriesCurrentlyPublic([alice, bob], async () => new Set(['alice/public']))).toBe(false);
    expect(await areRepositoriesCurrentlyPublic([alice], async () => new Set(['alice/public']))).toBe(true);
  });
});
