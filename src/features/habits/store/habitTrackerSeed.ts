import { getDaysInMonth } from '@/features/habits/utils/calendarUtils';
import { createDateKey, getReferenceDate } from '@/features/habits/utils/timeUtils';
import type {
  DailyHabitEntry,
  HabitDefinition,
  HabitState,
  HabitTrackerState,
  WeeklyHabitWithStates,
} from '@/features/habits/types';

interface SeededDailyHabit {
  id: string;
  name: string;
  states: HabitState[];
}

function createSeedTimestamp(year: number, month: number, dayNumber: number) {
  return new Date(year, month, dayNumber, 12, 0, 0, 0).toISOString();
}

const INITIAL_DAILY_HABITS: SeededDailyHabit[] = [
  {
    id: 'daily-1',
    name: 'Faire son lit',
    states: [
      'done', 'done', 'empty', 'done', 'done',
      'not-done', 'done', 'done', 'done', 'empty',
      'empty', 'done', 'done', 'done', 'empty',
      'done', 'done', 'empty', 'done', 'done',
      'not-done', 'done', 'done', 'done', 'not-done',
      'done', 'done', 'done', 'done', 'empty',
      'empty',
    ],
  },
  {
    id: 'daily-2',
    name: 'Douche froide',
    states: [
      'empty', 'done', 'done', 'empty', 'done',
      'done', 'not-done', 'done', 'empty', 'done',
      'done', 'done', 'empty', 'done', 'done',
      'done', 'empty', 'done', 'done', 'done',
      'done', 'done', 'done', 'empty', 'done',
      'done', 'empty', 'done', 'done', 'done',
      'empty',
    ],
  },
  {
    id: 'daily-3',
    name: 'Meditation 10min',
    states: [
      'done', 'empty', 'done', 'done', 'done',
      'done', 'done', 'done', 'done', 'done',
      'done', 'empty', 'done', 'done', 'done',
      'done', 'done', 'done', 'done', 'empty',
      'done', 'done', 'empty', 'done', 'done',
      'done', 'done', 'done', 'done', 'not-done',
      'empty',
    ],
  },
  {
    id: 'daily-4',
    name: 'Lecture 30min',
    states: [
      'empty', 'empty', 'empty', 'done', 'not-done',
      'done', 'done', 'empty', 'done', 'done',
      'empty', 'done', 'not-done', 'done', 'done',
      'empty', 'done', 'done', 'empty', 'done',
      'done', 'empty', 'done', 'done', 'done',
      'done', 'done', 'empty', 'done', 'not-done',
      'empty',
    ],
  },
];

export function createInitialHabitTrackerState(referenceDate = getReferenceDate()): HabitTrackerState {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const elapsedDays = Math.min(referenceDate.getDate(), daysInMonth);
  const createdAt = createSeedTimestamp(year, month, 1);

  const habits: HabitDefinition[] = INITIAL_DAILY_HABITS.map<HabitDefinition>((habit) => ({
    id: habit.id,
    name: habit.name,
    kind: 'daily',
    status: 'active',
    createdAt,
    archivedAt: null,
    updatedAt: createdAt,
  }));

  const dailyEntries: DailyHabitEntry[] = INITIAL_DAILY_HABITS.flatMap((habit) => (
    habit.states.slice(0, elapsedDays).flatMap((state, dayIndex) => {
      if (state === 'empty') return [];

      const dateKey = createDateKey(year, month, dayIndex + 1);
      return [{
        id: `${habit.id}:${dateKey}`,
        habitId: habit.id,
        dateKey,
        state,
        updatedAt: createSeedTimestamp(year, month, dayIndex + 1),
      }];
    })
  ));

  return {
    schemaVersion: 1,
    habits,
    dailyEntries,
    moodEntries: [],
    sleepEntries: [],
    lastUpdatedAt: referenceDate.toISOString(),
  };
}

function createWeeklyHabit(id: string, name: string): WeeklyHabitWithStates {
  return {
    habit: { id, name },
    states: Array(6).fill('empty'),
  };
}

export function createInitialWeeklyHabits() {
  return [
    createWeeklyHabit('weekly-1', 'Faire 3 activites Cardio intensive'),
    createWeeklyHabit('weekly-2', 'Faire 3 seances de muscu'),
    createWeeklyHabit('weekly-3', 'Faire 1 dessin majeur'),
    createWeeklyHabit('weekly-4', 'Lire un livre'),
    createWeeklyHabit('weekly-5', 'Fermer sa gueule'),
  ];
}
