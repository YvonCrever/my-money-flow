import { beforeEach, describe, expect, it, vi } from 'vitest';

const calendarExternalReferencesTestState = vi.hoisted(() => ({
  currentState: null as any,
  ensureCalendarStoreReady: vi.fn(async () => undefined),
}));

vi.mock('@/lib/calendarStore', async () => {
  const { createDefaultCalendarState, sortCalendarExternalReferences } = await import('@/lib/calendar');
  const areEquivalent = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

  return {
    areCalendarExternalReferenceSetsEquivalent: vi.fn(areEquivalent),
    ensureCalendarStoreReady: calendarExternalReferencesTestState.ensureCalendarStoreReady,
    readCalendarState: vi.fn(() => (
      calendarExternalReferencesTestState.currentState ?? createDefaultCalendarState('2026-04-11')
    )),
    updateCalendarState: vi.fn((updater: (state: any) => any) => {
      const currentState = calendarExternalReferencesTestState.currentState ?? createDefaultCalendarState('2026-04-11');
      const nextState = updater(currentState);
      calendarExternalReferencesTestState.currentState = {
        ...nextState,
        externalReferences: sortCalendarExternalReferences(nextState.externalReferences),
      };
      return calendarExternalReferencesTestState.currentState;
    }),
  };
});

describe('calendarExternalReferences', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const { createDefaultCalendarState } = await import('@/lib/calendar');
    calendarExternalReferencesTestState.currentState = createDefaultCalendarState('2026-04-11');
  });

  it('upserts a finance reference without duplicating the source record', async () => {
    const { upsertFinanceReferenceInCalendar } = await import('@/lib/calendarExternalReferences');

    await upsertFinanceReferenceInCalendar('finance-revenue', {
      amount: 240,
      calendarMeta: { date: '2026-04-11', syncTarget: 'finance-revenue' },
      client: 'Alice',
      date: '2026-04-11',
      hours: 2,
      hourlyRate: 120,
      id: 'rev-1',
      month: 3,
      service: 'Mission',
      unit: 'heure',
      year: 2026,
    });

    await upsertFinanceReferenceInCalendar('finance-revenue', {
      amount: 360,
      calendarMeta: { date: '2026-04-12', syncTarget: 'finance-revenue' },
      client: 'Alice',
      date: '2026-04-12',
      hours: 3,
      hourlyRate: 120,
      id: 'rev-1',
      month: 3,
      service: 'Mission',
      unit: 'heure',
      year: 2026,
    });

    expect(calendarExternalReferencesTestState.currentState?.externalReferences).toHaveLength(1);
    expect(calendarExternalReferencesTestState.currentState?.externalReferences[0]).toMatchObject({
      date: '2026-04-12',
      metrics: { amount: 360, plannedMinutes: 180 },
      source: 'finance-revenue',
      sourceRecordId: 'rev-1',
    });
  });

  it('removes only the targeted reading reference', async () => {
    const {
      removeReadingReferenceFromCalendar,
      replaceReadingReferencesInCalendar,
    } = await import('@/lib/calendarExternalReferences');

    await replaceReadingReferencesInCalendar([
      {
        addedAt: '2026-04-10T09:00:00.000Z',
        author: 'Auteur A',
        category: 'Essai',
        id: 'book-1',
        rating: 4,
        title: 'Livre A',
      },
      {
        addedAt: '2026-04-11T09:00:00.000Z',
        author: 'Auteur B',
        category: 'Roman',
        id: 'book-2',
        rating: 5,
        title: 'Livre B',
      },
    ]);

    await removeReadingReferenceFromCalendar('book-1');

    expect(calendarExternalReferencesTestState.currentState?.externalReferences).toHaveLength(1);
    expect(calendarExternalReferencesTestState.currentState?.externalReferences[0]).toMatchObject({
      source: 'reading',
      sourceRecordId: 'book-2',
    });
  });

  it('updates only the journal dates included in a bulk upsert', async () => {
    const {
      replaceJournalReferencesInCalendar,
      upsertJournalReferencesInCalendar,
    } = await import('@/lib/calendarExternalReferences');

    await replaceJournalReferencesInCalendar([
      {
        date: '2026-04-09',
        didWell: 'Ancien',
        mediaItems: [],
        moodId: null,
        somethingLearnt: '',
        somethingNew: 'Ancien',
        updatedAt: '2026-04-09T10:00:00.000Z',
        couldDoneBetter: '',
      },
      {
        date: '2026-04-10',
        didWell: 'Milieu',
        mediaItems: [],
        moodId: null,
        somethingLearnt: '',
        somethingNew: 'Milieu',
        updatedAt: '2026-04-10T10:00:00.000Z',
        couldDoneBetter: '',
      },
    ]);

    await upsertJournalReferencesInCalendar([
      {
        date: '2026-04-10',
        didWell: 'Maj',
        mediaItems: [],
        moodId: null,
        somethingLearnt: 'Lecture',
        somethingNew: 'Maj',
        updatedAt: '2026-04-10T12:00:00.000Z',
        couldDoneBetter: '',
      },
      {
        date: '2026-04-11',
        didWell: 'Nouveau',
        mediaItems: [],
        moodId: null,
        somethingLearnt: '',
        somethingNew: 'Nouveau',
        updatedAt: '2026-04-11T12:00:00.000Z',
        couldDoneBetter: '',
      },
    ]);

    expect(calendarExternalReferencesTestState.currentState?.externalReferences).toHaveLength(3);
    expect(calendarExternalReferencesTestState.currentState?.externalReferences.find((reference) => reference.sourceRecordId === '2026-04-09')).toMatchObject({
      sourceRecordId: '2026-04-09',
      summary: 'Ancien · Ancien',
    });
    expect(calendarExternalReferencesTestState.currentState?.externalReferences.find((reference) => reference.sourceRecordId === '2026-04-10')).toMatchObject({
      sourceRecordId: '2026-04-10',
      summary: 'Maj · Lecture · Maj',
    });
    expect(calendarExternalReferencesTestState.currentState?.externalReferences.find((reference) => reference.sourceRecordId === '2026-04-11')).toMatchObject({
      sourceRecordId: '2026-04-11',
    });
  });
});
