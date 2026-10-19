import { beforeEach, describe, expect, mock, test } from 'bun:test';

let page: {
  id: string;
  isPublic: boolean;
  metadata: { visibilityVerified?: boolean } | null;
};
let updateValues: Record<string, unknown>;

mock.module('../src/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => ({ limit: async () => [page] }) }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updateValues = values;
        return { where: () => ({ returning: async () => [{ ...page, ...values }] }) };
      },
    }),
  },
}));

const { updateWikiPage } = await import('../src/lib/wiki/repository');

beforeEach(() => {
  updateValues = {};
});

describe('wiki page visibility after an edit', () => {
  test('does not publish a legacy page when its repository is now public', async () => {
    page = { id: 'legacy', isPublic: true, metadata: null };
    await updateWikiPage('owner', 'repo', 'intro', { title: 'Intro', content: 'Content', isPublic: true });
    expect(updateValues.isPublic).toBe(false);
    expect(updateValues.metadata).toEqual({ visibilityVerified: false });
  });

  test('keeps a page generated while private private after visibility changes', async () => {
    page = { id: 'private', isPublic: false, metadata: { visibilityVerified: true } };
    await updateWikiPage('owner', 'repo', 'intro', { title: 'Intro', content: 'Content', isPublic: true });
    expect(updateValues.isPublic).toBe(false);
  });

  test('keeps a verified public page public only while the repository is public', async () => {
    page = { id: 'public', isPublic: true, metadata: { visibilityVerified: true } };
    await updateWikiPage('owner', 'repo', 'intro', { title: 'Intro', content: 'Content', isPublic: true });
    expect(updateValues.isPublic).toBe(true);

    await updateWikiPage('owner', 'repo', 'intro', { title: 'Intro', content: 'Content', isPublic: false });
    expect(updateValues.isPublic).toBe(false);
  });
});
