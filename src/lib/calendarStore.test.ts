import { describe, expect, it } from 'vitest';

import { createDefaultCalendarState } from '@/lib/calendar';
import type { CalendarExternalReference } from '@/types/calendar';
import { areCalendarExternalReferenceSetsEquivalent, resolvePreferredCalendarState } from '@/lib/calendarStore';

function createCalendarState(lastUpdatedAt: string, title: string) {
  const state = createDefaultCalendarState('2026-03-20');

  return {
    ...state,
    items: [
      {
        ...state.items[0],
        id: `${title}-item`,
        title,
        date: '2026-03-20',
      },
    ],
    lastUpdatedAt,
  };
}

describe('calendar store persistence recovery', () => {
  it('keeps indexeddb state when no real legacy state exists', () => {
    const indexedState = createCalendarState('2026-03-20T10:00:00.000Z', 'IndexedDB');
    const fallbackState = createCalendarState('2026-03-21T10:00:00.000Z', 'Fallback');

    const preferred = resolvePreferredCalendarState(indexedState, null, fallbackState);

    expect(preferred.state.items[0]?.title).toBe('IndexedDB');
    expect(preferred.shouldPersist).toBe(false);
  });

  it('prefers legacy state when it is more recent than indexeddb', () => {
    const indexedState = createCalendarState('2026-03-20T10:00:00.000Z', 'IndexedDB');
    const legacyState = createCalendarState('2026-03-20T12:00:00.000Z', 'Legacy');

    const preferred = resolvePreferredCalendarState(indexedState, legacyState);

    expect(preferred.state.items[0]?.title).toBe('Legacy');
    expect(preferred.source).toBe('legacy-local-storage');
    expect(preferred.shouldPersist).toBe(true);
  });

  it('keeps indexeddb state when it is more recent than legacy', () => {
    const indexedState = createCalendarState('2026-03-20T12:00:00.000Z', 'IndexedDB');
    const legacyState = createCalendarState('2026-03-20T10:00:00.000Z', 'Legacy');

    const preferred = resolvePreferredCalendarState(indexedState, legacyState);

    expect(preferred.state.items[0]?.title).toBe('IndexedDB');
    expect(preferred.shouldPersist).toBe(false);
  });

  it('treats external references as unchanged when only updatedAt differs or order changes', () => {
    const left: CalendarExternalReference[] = [
      {
        id: 'finance-revenue:rev-1',
        source: 'finance-revenue',
        sourceRecordId: 'rev-1',
        date: '2026-03-20',
        title: 'Client A · Mission',
        summary: '2 heure',
        categoryLabel: 'Client A',
        linkedCalendarItemId: null,
        metrics: {
          amount: 200,
          plannedMinutes: 120,
        },
        createdAt: '2026-03-20',
        updatedAt: '2026-03-20T10:00:00.000Z',
      },
      {
        id: 'reading:book-1',
        source: 'reading',
        sourceRecordId: 'book-1',
        date: '2026-03-19',
        title: 'Livre · Auteur',
        summary: 'Essai',
        categoryLabel: 'Essai',
        linkedCalendarItemId: null,
        metrics: {
          rating: 4,
        },
        createdAt: '2026-03-19T10:00:00.000Z',
        updatedAt: '2026-03-20T10:00:00.000Z',
      },
    ];

    const right: CalendarExternalReference[] = [
      {
        ...left[1]!,
        updatedAt: '2026-03-21T09:00:00.000Z',
      },
      {
        ...left[0]!,
        updatedAt: '2026-03-21T09:00:00.000Z',
      },
    ];

    expect(areCalendarExternalReferenceSetsEquivalent(left, right)).toBe(true);
  });

  it('treats external references as changed when persisted content changes', () => {
    const left: CalendarExternalReference[] = [{
      id: 'journal:2026-03-20',
      source: 'journal',
      sourceRecordId: '2026-03-20',
      date: '2026-03-20',
      title: 'Journal du 2026-03-20',
      summary: 'Ancien resume',
      linkedCalendarItemId: null,
      metrics: {
        plannedMinutes: 60,
      },
      createdAt: '2026-03-20',
      updatedAt: '2026-03-20T10:00:00.000Z',
    }];

    const right: CalendarExternalReference[] = [{
      ...left[0]!,
      summary: 'Nouveau resume',
      updatedAt: '2026-03-21T09:00:00.000Z',
    }];

    expect(areCalendarExternalReferenceSetsEquivalent(left, right)).toBe(false);
  });
});
