import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFeatureStorageLoadErrorMessage } from '@/lib/storageLoadErrors';
import { createInitialWeeklyHabits } from '@/features/habits/store/habitTrackerSeed';
import {
  addDailyHabit,
  archiveDailyHabit,
  ensureHabitTrackerStoreReady,
  readHabitTrackerState,
  renameDailyHabit,
  setMood,
  setSleep,
  subscribeHabitTrackerStore,
  toggleDailyEntry,
} from '@/features/habits/store/habitTrackerStore';
import type {
  HabitListItem,
  HabitTrackerState,
  WeeklyHabitWithStates,
} from '@/features/habits/types';
import { getReferenceDate } from '@/features/habits/utils/timeUtils';
import {
  buildDailyTrackerViewModel,
  buildWeeklyTrackerViewModel,
} from '@/features/habits/utils/viewModelUtils';

function syncHabitTrackerState(setState: (value: HabitTrackerState) => void) {
  setState(readHabitTrackerState());
}

function createWeeklyHabit(id: string, name: string): WeeklyHabitWithStates {
  return {
    habit: { id, name },
    states: Array(6).fill('empty'),
  };
}

export function useHabitTrackerData(year: number, month: number) {
  const [state, setState] = useState<HabitTrackerState>(() => readHabitTrackerState());
  const [weeklyHabits, setWeeklyHabits] = useState<WeeklyHabitWithStates[]>(() => createInitialWeeklyHabits());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const referenceDate = getReferenceDate();

  useEffect(() => {
    void ensureHabitTrackerStoreReady()
      .then(() => {
        syncHabitTrackerState(setState);
        setLoadError(null);
      })
      .catch((error) => {
        setLoadError(getFeatureStorageLoadErrorMessage('Habit Tracker', error));
      })
      .finally(() => {
        setIsLoaded(true);
      });

    return subscribeHabitTrackerStore(() => {
      syncHabitTrackerState(setState);
      setLoadError(null);
    });
  }, []);

  const addWeeklyHabit = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setWeeklyHabits((currentHabits) => [
      ...currentHabits,
      createWeeklyHabit(crypto.randomUUID(), trimmedName),
    ]);
  }, []);

  const renameWeeklyHabit = useCallback((id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setWeeklyHabits((currentHabits) => currentHabits.map((habit) => (
      habit.habit.id === id
        ? {
            ...habit,
            habit: {
              ...habit.habit,
              name: trimmedName,
            },
          }
        : habit
    )));
  }, []);

  const removeWeeklyHabit = useCallback((id: string) => {
    setWeeklyHabits((currentHabits) => currentHabits.filter((habit) => habit.habit.id !== id));
  }, []);

  const toggleWeeklyHabit = useCallback((habitId: string, weekNumber: number) => {
    const weekIndex = weekNumber - 1;

    setWeeklyHabits((currentHabits) => currentHabits.map((habit) => {
      if (habit.habit.id !== habitId) return habit;

      const nextStates = [...habit.states];
      const currentState = nextStates[weekIndex] ?? 'empty';
      nextStates[weekIndex] = currentState === 'done' ? 'not-done' : 'done';

      return {
        ...habit,
        states: nextStates,
      };
    }));
  }, []);

  const dailyView = useMemo(
    () => buildDailyTrackerViewModel(state, year, month, referenceDate),
    [state, year, month, referenceDate],
  );

  const weeklyView = useMemo(
    () => buildWeeklyTrackerViewModel(weeklyHabits, year, month, referenceDate),
    [weeklyHabits, year, month, referenceDate],
  );

  const managerHabitsDaily: HabitListItem[] = dailyView.managerHabits;
  const managerHabitsWeekly: HabitListItem[] = weeklyView.managerHabits;

  return {
    isLoaded,
    loadError,
    dailyView,
    weeklyView,
    managerHabitsDaily,
    managerHabitsWeekly,
    addDailyHabit,
    renameDailyHabit,
    archiveDailyHabit,
    toggleDailyEntry,
    setMood,
    setSleep,
    addWeeklyHabit,
    renameWeeklyHabit,
    removeWeeklyHabit,
    toggleWeeklyHabit,
  };
}
