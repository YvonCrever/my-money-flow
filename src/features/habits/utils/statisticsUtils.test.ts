import { describe, expect, it } from 'vitest';
import { calculateHabitAnalysis } from '@/features/habits/utils/statisticsUtils';

describe('habit statistics', () => {
  it('keeps %T as a whole-month progress gauge', () => {
    const referenceDate = new Date(2026, 3, 10);
    const states = [
      'done', 'done', 'done', 'done', 'done',
      'done', 'done', 'done', 'done', 'done',
      ...Array(20).fill('empty'),
    ] as const;

    const analysis = calculateHabitAnalysis(
      'habit-1',
      [...states],
      30,
      2026,
      3,
      referenceDate,
    );

    expect(analysis.percentageT).toBe(33);
    expect(analysis.percentageC).toBe(100);
  });

  it('excludes empty cells from %C but keeps not-done in the denominator', () => {
    const referenceDate = new Date(2026, 3, 10);
    const states = [
      'done', 'done', 'done', 'done', 'done',
      'done', 'done', 'done', 'not-done', 'not-done',
      ...Array(20).fill('empty'),
    ] as const;

    const analysis = calculateHabitAnalysis(
      'habit-2',
      [...states],
      30,
      2026,
      3,
      referenceDate,
    );

    expect(analysis.percentageT).toBe(27);
    expect(analysis.percentageC).toBe(80);
  });
});
