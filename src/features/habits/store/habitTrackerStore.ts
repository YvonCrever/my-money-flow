import { APP_STORE_NAMES } from '@/lib/appStorageDb';
import { createIndexedDatasetStore } from '@/lib/indexedDatasetStore';
import { storedHabitTrackerStateSchema } from '@/lib/storageSchemas';
import type { DatasetSource } from '@/types/storage';
import { createInitialHabitTrackerState } from '@/features/habits/store/habitTrackerSeed';
import {
  compareDateKeys,
  getDateKeyFromTimestamp,
  getReferenceDate,
  getReferenceDateKey,
  isDateKeyModifiable,
} from '@/features/habits/utils/timeUtils';
import type {
  DailyHabitEntry,
  HabitDefinition,
  HabitTrackerState,
  MoodEntry,
  SleepEntry,
} from '@/features/habits/types';

export const HABIT_TRACKER_STORE_EVENT = 'ycaro:habit-tracker-store-updated';

function normalizeHabit(habit: HabitDefinition): HabitDefinition {
  const name = habit.name.trim();
  const updatedAt = habit.updatedAt || habit.createdAt || new Date().toISOString();
  const archivedAt = habit.status === 'archived'
    ? habit.archivedAt ?? updatedAt
    : null;

  return {
    id: habit.id,
    name,
    kind: habit.kind,
    status: archivedAt ? 'archived' : 'active',
    createdAt: habit.createdAt,
    archivedAt,
    updatedAt,
  };
}

function isDailyEntryEligible(entry: DailyHabitEntry, habitsById: Map<string, HabitDefinition>) {
  const habit = habitsById.get(entry.habitId);
  if (!habit || habit.kind !== 'daily' || habit.name.trim() === '') return false;

  const createdDateKey = getDateKeyFromTimestamp(habit.createdAt);
  if (compareDateKeys(entry.dateKey, createdDateKey) < 0) return false;

  if (habit.archivedAt) {
    const archivedDateKey = getDateKeyFromTimestamp(habit.archivedAt);
    if (compareDateKeys(entry.dateKey, archivedDateKey) >= 0) return false;
  }

  return true;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>();

  for (const item of items) {
    map.set(getKey(item), item);
  }

  return Array.from(map.values());
}

function normalizeDateValueEntries<T extends MoodEntry | SleepEntry>(
  entries: T[],
  min: number,
  max: number,
) {
  return dedupeByKey(entries, (entry) => entry.dateKey)
    .map((entry) => ({
      ...entry,
      value: Math.max(min, Math.min(max, entry.value)),
    }))
    .sort((left, right) => compareDateKeys(left.dateKey, right.dateKey));
}

function normalizeHabitTrackerState(state: HabitTrackerState): HabitTrackerState {
  const referenceDate = getReferenceDate();
  const referenceDateKey = getReferenceDateKey(referenceDate);
  const habits = dedupeByKey(state.habits.map(normalizeHabit), (habit) => habit.id)
    .filter((habit) => habit.name !== '')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

  const dailyEntries = dedupeByKey(state.dailyEntries, (entry) => `${entry.habitId}:${entry.dateKey}`)
    .filter((entry) => (
      (entry.state === 'done' || entry.state === 'not-done')
      && compareDateKeys(entry.dateKey, referenceDateKey) <= 0
      && isDailyEntryEligible(entry, habitsById)
    ))
    .sort((left, right) => {
      const habitComparison = left.habitId.localeCompare(right.habitId);
      if (habitComparison !== 0) return habitComparison;
      return compareDateKeys(left.dateKey, right.dateKey);
    });

  return {
    schemaVersion: 1,
    habits,
    dailyEntries,
    moodEntries: normalizeDateValueEntries(state.moodEntries, 1, 10)
      .filter((entry) => compareDateKeys(entry.dateKey, referenceDateKey) <= 0),
    sleepEntries: normalizeDateValueEntries(state.sleepEntries, 1, 12)
      .filter((entry) => compareDateKeys(entry.dateKey, referenceDateKey) <= 0),
    lastUpdatedAt: state.lastUpdatedAt || referenceDate.toISOString(),
  };
}

let habitTrackerReadyPromise: Promise<void> | null = null;
const initialHabitTrackerState = createInitialHabitTrackerState();
const habitTrackerStore = createIndexedDatasetStore<HabitTrackerState>({
  eventName: HABIT_TRACKER_STORE_EVENT,
  getInitialValue: () => initialHabitTrackerState,
  normalize: normalizeHabitTrackerState,
  persistenceErrorLabel: 'Habit Tracker persistence failed.',
  schema: storedHabitTrackerStateSchema,
  storeName: APP_STORE_NAMES.habitTracker,
});

function writeNextState(nextState: HabitTrackerState, source: DatasetSource = 'app') {
  return habitTrackerStore.write({
    ...nextState,
    lastUpdatedAt: new Date().toISOString(),
  }, source);
}

function mutateHabitTrackerState(
  producer: (state: HabitTrackerState, referenceDate: Date) => HabitTrackerState,
  source: DatasetSource = 'app',
) {
  const referenceDate = getReferenceDate();
  const currentState = habitTrackerStore.getSnapshot();
  return writeNextState(producer(currentState, referenceDate), source);
}

export async function ensureHabitTrackerStoreReady() {
  if (habitTrackerReadyPromise) {
    return habitTrackerReadyPromise;
  }

  habitTrackerReadyPromise = habitTrackerStore.ensureReady()
    .then((): void => undefined)
    .catch((error) => {
      habitTrackerReadyPromise = null;
      throw error;
    });

  return habitTrackerReadyPromise;
}

export function readHabitTrackerState() {
  return habitTrackerStore.getSnapshot();
}

export function writeHabitTrackerState(state: HabitTrackerState, source: DatasetSource = 'app') {
  return writeNextState(state, source);
}

export function subscribeHabitTrackerStore(onSync: () => void) {
  return habitTrackerStore.subscribe(onSync);
}

export function addDailyHabit(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const now = new Date().toISOString();
  const nextHabit: HabitDefinition = {
    id: crypto.randomUUID(),
    name: trimmedName,
    kind: 'daily',
    status: 'active',
    createdAt: now,
    archivedAt: null,
    updatedAt: now,
  };

  mutateHabitTrackerState((state) => ({
    ...state,
    habits: [...state.habits, nextHabit],
  }));

  return nextHabit;
}

export function renameDailyHabit(id: string, name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  mutateHabitTrackerState((state) => ({
    ...state,
    habits: state.habits.map((habit) => (
      habit.id === id && habit.kind === 'daily' && habit.name !== trimmedName
        ? { ...habit, name: trimmedName, updatedAt: new Date().toISOString() }
        : habit
    )),
  }));
}

export function archiveDailyHabit(id: string) {
  mutateHabitTrackerState((state, referenceDate) => {
    const archivedAt = referenceDate.toISOString();
    const archivedDateKey = getReferenceDateKey(referenceDate);

    return {
      ...state,
      habits: state.habits.map((habit) => (
        habit.id === id && habit.kind === 'daily' && habit.status !== 'archived'
          ? { ...habit, status: 'archived', archivedAt, updatedAt: archivedAt }
          : habit
      )),
      dailyEntries: state.dailyEntries.filter((entry) => (
        entry.habitId !== id || compareDateKeys(entry.dateKey, archivedDateKey) < 0
      )),
    };
  });
}

export function toggleDailyEntry(habitId: string, dateKey: string) {
  mutateHabitTrackerState((state, referenceDate) => {
    if (!isDateKeyModifiable(dateKey, referenceDate)) {
      return state;
    }

    const habit = state.habits.find((entry) => entry.id === habitId && entry.kind === 'daily');
    if (!habit) return state;

    const createdDateKey = getDateKeyFromTimestamp(habit.createdAt);
    if (compareDateKeys(dateKey, createdDateKey) < 0) return state;

    if (habit.archivedAt) {
      const archivedDateKey = getDateKeyFromTimestamp(habit.archivedAt);
      if (compareDateKeys(dateKey, archivedDateKey) >= 0) return state;
    }

    const existingEntry = state.dailyEntries.find((entry) => entry.habitId === habitId && entry.dateKey === dateKey);
    const updatedAt = referenceDate.toISOString();

    if (!existingEntry) {
      return {
        ...state,
        dailyEntries: [
          ...state.dailyEntries,
          {
            id: `${habitId}:${dateKey}`,
            habitId,
            dateKey,
            state: 'done',
            updatedAt,
          },
        ],
      };
    }

    return {
      ...state,
      dailyEntries: state.dailyEntries.map((entry) => (
        entry.habitId === habitId && entry.dateKey === dateKey
          ? {
              ...entry,
              state: entry.state === 'done' ? 'not-done' : 'done',
              updatedAt,
            }
          : entry
      )),
    };
  });
}

function upsertDateValueEntry<T extends MoodEntry | SleepEntry>(
  entries: T[],
  dateKey: string,
  value: number | null,
  maxValue: number,
  referenceDate: Date,
) {
  if (!isDateKeyModifiable(dateKey, referenceDate)) {
    return entries;
  }

  const nextEntries = entries.filter((entry) => entry.dateKey !== dateKey);
  if (value == null) return nextEntries;

  return [
    ...nextEntries,
    {
      dateKey,
      value: Math.max(1, Math.min(maxValue, value)),
      updatedAt: referenceDate.toISOString(),
    } as T,
  ];
}

export function setMood(dateKey: string, value: number | null) {
  mutateHabitTrackerState((state, referenceDate) => ({
    ...state,
    moodEntries: upsertDateValueEntry(state.moodEntries, dateKey, value, 10, referenceDate),
  }));
}

export function setSleep(dateKey: string, value: number | null) {
  mutateHabitTrackerState((state, referenceDate) => ({
    ...state,
    sleepEntries: upsertDateValueEntry(state.sleepEntries, dateKey, value, 12, referenceDate),
  }));
}
