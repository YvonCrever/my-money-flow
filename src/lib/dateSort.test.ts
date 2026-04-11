import { describe, expect, it } from 'vitest';
import { sortEntriesByIsoDate } from '@/lib/dateSort';

describe('sortEntriesByIsoDate', () => {
  const entries = [
    { id: 'a', date: '2026-03-05' },
    { id: 'b', date: '2026-03-31' },
    { id: 'c', date: '2026-03-12' },
  ];

  it('sorts entries in descending date order by default use case', () => {
    expect(sortEntriesByIsoDate(entries, 'desc').map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts entries in ascending date order', () => {
    expect(sortEntriesByIsoDate(entries, 'asc').map((entry) => entry.id)).toEqual(['a', 'c', 'b']);
  });

  it('preserves the original relative order when two entries share the same date', () => {
    const sameDayEntries = [
      { id: 'first', date: '2026-03-20' },
      { id: 'second', date: '2026-03-20' },
      { id: 'third', date: '2026-03-21' },
    ];

    expect(sortEntriesByIsoDate(sameDayEntries, 'desc').map((entry) => entry.id)).toEqual(['third', 'first', 'second']);
    expect(sortEntriesByIsoDate(sameDayEntries, 'asc').map((entry) => entry.id)).toEqual(['first', 'second', 'third']);
  });
});
