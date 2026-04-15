import { describe, expect, it } from 'vitest';
import { buildDailyTrackerViewModel } from '@/features/habits/utils/viewModelUtils';
import type { HabitTrackerState } from '@/features/habits/types';

describe('habit tracker view model', () => {
  it('projects a 30-day month into a 31-column grid without storing ghost slots', () => {
    const state: HabitTrackerState = {
      schemaVersion: 1,
      habits: [
        {
          id: 'habit-1',
          name: 'Hydration',
          kind: 'daily',
          status: 'active',
          createdAt: '2026-04-10T12:00:00.000Z',
          archivedAt: null,
          updatedAt: '2026-04-10T12:00:00.000Z',
        },
      ],
      dailyEntries: [
        {
          id: 'habit-1:2026-04-10',
          habitId: 'habit-1',
          dateKey: '2026-04-10',
          state: 'done',
          updatedAt: '2026-04-10T12:00:00.000Z',
        },
      ],
      moodEntries: [
        {
          dateKey: '2026-04-10',
          value: 8,
          updatedAt: '2026-04-10T12:00:00.000Z',
        },
      ],
      sleepEntries: [
        {
          dateKey: '2026-04-10',
          value: 7,
          updatedAt: '2026-04-10T12:00:00.000Z',
        },
      ],
      lastUpdatedAt: '2026-04-10T12:00:00.000Z',
    };

    const viewModel = buildDailyTrackerViewModel(state, 2026, 3, new Date(2026, 3, 15));

    expect(viewModel.days).toHaveLength(31);
    expect(viewModel.days[29]).toMatchObject({ exists: true, dateKey: '2026-04-30' });
    expect(viewModel.days[30]).toMatchObject({ exists: false, dateKey: null });
    expect(viewModel.habits[0].states[8]).toBe('empty');
    expect(viewModel.habits[0].states[9]).toBe('done');
    expect(viewModel.mood[9]).toBe(8);
    expect(viewModel.sleep[9]).toBe(7);
    expect(viewModel.mood[30]).toBeNull();
    expect(viewModel.statistics.dailyProgressData).toHaveLength(30);
  });
});
