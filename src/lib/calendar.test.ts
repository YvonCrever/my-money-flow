import { describe, expect, it } from 'vitest';

import {
  createDefaultCalendarState,
  detectCalendarConflicts,
  formatCalendarItemTimeRange,
  getDurationBetweenTimes,
  getEndTimeWithDayOffset,
  normalizeCalendarState,
} from '@/lib/calendar';
import { calendarStateSchema } from '@/lib/storageSchemas';

describe('calendar categories', () => {
  it('initializes revenue fields on default categories', () => {
    const state = createDefaultCalendarState('2026-03-20');
    const masterBooking = state.categories.find((category) => category.id === 'master-booking');

    expect(masterBooking).toMatchObject({
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    });
  });

  it('preserves editable category settings during normalization', () => {
    const state = normalizeCalendarState({
      categories: [
        {
          id: 'master-booking',
          name: 'MB Client',
          color: '#ff6600',
          isRevenueCategory: true,
          financeClientId: 'client-1',
          hourlyRate: 22,
        },
      ],
      items: [],
      weekPlans: [],
      conversions: [],
      externalReferences: [],
      preferences: {
        activeView: 'week',
        selectedDate: '2026-03-20',
        showCompleted: true,
        density: 'comfortable',
      },
    }, '2026-03-20');

    const masterBooking = state.categories.find((category) => category.id === 'master-booking');

    expect(masterBooking).toMatchObject({
      name: 'MB Client',
      color: '#FF6600',
      isRevenueCategory: true,
      financeClientId: 'client-1',
      hourlyRate: 22,
    });
  });

  it('keeps calendar items compatible with or without a finance client override', () => {
    const state = normalizeCalendarState({
      categories: [],
      items: [
        {
          id: 'item-with-override',
          title: 'Mission traiteur',
          description: '',
          date: '2026-03-20',
          startTime: null,
          endTime: null,
          endDayOffset: 1,
          plannedMinutes: 120,
          actualMinutes: 0,
          categoryId: 'traiteurs',
          status: 'todo',
          priority: 'medium',
          scope: 'week',
          syncTarget: 'finance-revenue',
          linkedRecordId: null,
          checklist: [],
          tags: [],
          position: 0,
          createdAt: '2026-03-20T10:00:00.000Z',
          updatedAt: '2026-03-20T10:00:00.000Z',
          completedAt: null,
          financeClientIdOverride: 'client-1',
        },
        {
          id: 'item-without-override',
          title: 'Mission traiteur 2',
          description: '',
          date: '2026-03-21',
          startTime: null,
          endTime: null,
          plannedMinutes: 90,
          actualMinutes: 0,
          categoryId: 'traiteurs',
          status: 'todo',
          priority: 'medium',
          scope: 'week',
          syncTarget: 'finance-revenue',
          linkedRecordId: null,
          checklist: [],
          tags: [],
          position: 1,
          createdAt: '2026-03-21T10:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z',
          completedAt: null,
        },
      ],
      weekPlans: [],
      conversions: [],
      externalReferences: [],
      preferences: {
        activeView: 'week',
        selectedDate: '2026-03-20',
        showCompleted: true,
        density: 'comfortable',
      },
    }, '2026-03-20');

    expect(state.items.find((item) => item.id === 'item-with-override')?.financeClientIdOverride).toBe('client-1');
    expect(state.items.find((item) => item.id === 'item-with-override')?.endDayOffset).toBe(1);
    expect(state.items.find((item) => item.id === 'item-without-override')?.financeClientIdOverride).toBeNull();
    expect(state.items.find((item) => item.id === 'item-without-override')?.endDayOffset).toBe(0);
    expect(calendarStateSchema.safeParse(state).success).toBe(true);
  });
});

describe('calendar overnight helpers', () => {
  it('derives overnight end times from start time and duration', () => {
    expect(getEndTimeWithDayOffset('15:00', 13 * 60)).toEqual({
      endTime: '04:00',
      endDayOffset: 1,
    });

    expect(getEndTimeWithDayOffset('15:00', 3 * 60)).toEqual({
      endTime: '18:00',
      endDayOffset: 0,
    });
  });

  it('computes durations with a next-day offset', () => {
    expect(getDurationBetweenTimes('15:00', '04:00', 1)).toBe(13 * 60);
    expect(getDurationBetweenTimes('15:00', '18:00', 0)).toBe(3 * 60);
  });

  it('formats overnight time ranges with the real end time', () => {
    expect(formatCalendarItemTimeRange({
      startTime: '15:00',
      endTime: '04:00',
    })).toBe('15:00 - 04:00');
  });

  it('detects conflicts on the following day for overnight events', () => {
    const conflictIds = detectCalendarConflicts([
      {
        id: 'overnight',
        title: 'Mission soirée',
        description: '',
        date: '2026-04-04',
        startTime: '15:00',
        endTime: '04:00',
        endDayOffset: 1,
        plannedMinutes: 780,
        actualMinutes: 0,
        categoryId: 'master-booking',
        status: 'scheduled',
        priority: 'high',
        scope: 'week',
        syncTarget: 'finance-revenue',
        linkedRecordId: null,
        checklist: [],
        tags: [],
        position: 0,
        createdAt: '2026-04-04T10:00:00.000Z',
        updatedAt: '2026-04-04T10:00:00.000Z',
        completedAt: null,
        financeClientIdOverride: null,
      },
      {
        id: 'next-day-overlap',
        title: 'Mission dimanche',
        description: '',
        date: '2026-04-05',
        startTime: '01:00',
        endTime: '02:00',
        endDayOffset: 0,
        plannedMinutes: 60,
        actualMinutes: 0,
        categoryId: 'master-booking',
        status: 'scheduled',
        priority: 'medium',
        scope: 'week',
        syncTarget: 'finance-revenue',
        linkedRecordId: null,
        checklist: [],
        tags: [],
        position: 0,
        createdAt: '2026-04-05T10:00:00.000Z',
        updatedAt: '2026-04-05T10:00:00.000Z',
        completedAt: null,
        financeClientIdOverride: null,
      },
    ] as const);

    expect(conflictIds.has('overnight')).toBe(true);
    expect(conflictIds.has('next-day-overlap')).toBe(true);
  });
});
