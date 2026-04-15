import { describe, expect, it } from 'vitest';
import { getMonthDays } from '@/features/habits/utils/calendarUtils';
import {
  getElapsedDaysInMonth,
  getElapsedWeeksInMonth,
  isDayModifiable,
  isWeekElapsed,
  isWeekFuture,
  isWeekModifiable,
} from '@/features/habits/utils/timeUtils';

describe('habit time utils', () => {
  it('treats past, current, and future days consistently', () => {
    const referenceDate = new Date(2026, 3, 15);

    expect(getElapsedDaysInMonth(2026, 3, 30, referenceDate)).toBe(15);
    expect(isDayModifiable(2026, 3, 15, referenceDate)).toBe(true);
    expect(isDayModifiable(2026, 3, 16, referenceDate)).toBe(false);
    expect(isDayModifiable(2026, 2, 31, referenceDate)).toBe(true);
    expect(isDayModifiable(2026, 4, 1, referenceDate)).toBe(false);
  });

  it('centralizes week elapsed and modifiable rules from the same reference date', () => {
    const referenceDate = new Date(2026, 3, 15);
    const monthDays = getMonthDays(2026, 3);

    expect(isWeekElapsed(2026, 3, 2, monthDays, referenceDate)).toBe(true);
    expect(isWeekElapsed(2026, 3, 3, monthDays, referenceDate)).toBe(false);
    expect(isWeekFuture(2026, 3, 4, monthDays, referenceDate)).toBe(true);
    expect(isWeekModifiable(2026, 3, 3, monthDays, referenceDate)).toBe(true);
    expect(getElapsedWeeksInMonth(5, 2026, 3, monthDays, referenceDate)).toBe(2);
  });
});
