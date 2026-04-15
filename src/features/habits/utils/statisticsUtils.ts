import { getElapsedDaysInMonth } from '@/features/habits/utils/timeUtils';
import type {
  HabitAnalysisData,
  HabitState,
  HabitWithStates,
  WeekData,
} from '@/features/habits/types';

export interface MonthlyPieData {
  percentageT: number;
  percentageC: number;
  completedT: number;
  notCompletedT: number;
  completedC: number;
  notCompletedC: number;
}

export function calculateActual(states: HabitState[]) {
  return states.filter((state) => state === 'done').length;
}

export function calculateActualElapsed(states: HabitState[], elapsedDays: number) {
  return states.slice(0, elapsedDays).filter((state) => state === 'done').length;
}

export function calculateElapsedRecordedCount(states: HabitState[], elapsedDays: number) {
  return states.slice(0, elapsedDays).filter((state) => state !== 'empty').length;
}

export function calculatePercentageT(actual: number, goal: number) {
  if (goal === 0) return 0;
  return Math.round((actual / goal) * 100);
}

export function calculatePercentageC(actualElapsed: number, recordedElapsedCount: number) {
  if (recordedElapsedCount === 0) return 0;
  return Math.round((actualElapsed / recordedElapsedCount) * 100);
}

export function calculateHabitAnalysis(
  habitId: string,
  states: HabitState[],
  daysInMonth: number,
  year: number,
  month: number,
  referenceDate: Date,
): HabitAnalysisData {
  const actual = calculateActual(states);
  const elapsedDays = getElapsedDaysInMonth(year, month, daysInMonth, referenceDate);
  const actualElapsed = calculateActualElapsed(states, elapsedDays);
  const recordedElapsedCount = calculateElapsedRecordedCount(states, elapsedDays);

  return {
    habitId,
    goal: daysInMonth,
    actual,
    percentageT: calculatePercentageT(actual, daysInMonth),
    percentageC: calculatePercentageC(actualElapsed, recordedElapsedCount),
  };
}

export function calculateMonthlyGoal(habitCount: number, daysInMonth: number) {
  return habitCount * daysInMonth;
}

export function calculateMonthlyCompleted(habitsWithStates: HabitWithStates[]) {
  return habitsWithStates.reduce((sum, habit) => sum + calculateActual(habit.states), 0);
}

export function calculateMonthlyPercentageT(monthlyCompleted: number, monthlyGoal: number) {
  return calculatePercentageT(monthlyCompleted, monthlyGoal);
}

export function calculateMonthlyPercentageC(
  habitsWithStates: HabitWithStates[],
  year: number,
  month: number,
  daysInMonth: number,
  referenceDate: Date,
) {
  const elapsedDays = getElapsedDaysInMonth(year, month, daysInMonth, referenceDate);
  if (elapsedDays === 0) return 0;

  let totalDone = 0;
  let totalRecordedElapsed = 0;

  for (const habit of habitsWithStates) {
    totalDone += calculateActualElapsed(habit.states, elapsedDays);
    totalRecordedElapsed += calculateElapsedRecordedCount(habit.states, elapsedDays);
  }

  return calculatePercentageC(totalDone, totalRecordedElapsed);
}

export function calculateDailyProgress(habitsWithStates: HabitWithStates[]) {
  const dailyProgress = new Array<number>(31).fill(0);

  for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
    let doneCount = 0;

    for (const habit of habitsWithStates) {
      if (habit.states[dayIndex] === 'done') {
        doneCount += 1;
      }
    }

    dailyProgress[dayIndex] = habitsWithStates.length > 0
      ? Math.round((doneCount / habitsWithStates.length) * 100)
      : 0;
  }

  return dailyProgress;
}

export function calculateWeeklyProgress(
  habitsWithStates: HabitWithStates[],
  daysInMonth: number,
  getWeekNumberForDay: (dayOfMonth: number, firstDayOfWeek: number) => number,
  firstDayOfWeek: number,
): WeekData[] {
  if (habitsWithStates.length === 0) return [];

  const weekMap = new Map<number, number[]>();

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const weekNumber = getWeekNumberForDay(dayNumber, firstDayOfWeek);
    const days = weekMap.get(weekNumber) ?? [];
    days.push(dayNumber - 1);
    weekMap.set(weekNumber, days);
  }

  return Array.from(weekMap.entries()).map(([weekNumber, dayIndices]) => {
    let doneCount = 0;

    for (const dayIndex of dayIndices) {
      for (const habit of habitsWithStates) {
        if (habit.states[dayIndex] === 'done') {
          doneCount += 1;
        }
      }
    }

    const maxDone = habitsWithStates.length * dayIndices.length;
    return {
      weekNumber,
      percentage: maxDone > 0 ? Math.round((doneCount / maxDone) * 100) : 0,
      daysInWeek: dayIndices.length,
    };
  });
}

export function calculateMonthlyPieData(
  habitsWithStates: HabitWithStates[],
  year: number,
  month: number,
  daysInMonth: number,
  referenceDate: Date,
): MonthlyPieData {
  const monthlyGoal = calculateMonthlyGoal(habitsWithStates.length, daysInMonth);
  const monthlyCompleted = calculateMonthlyCompleted(habitsWithStates);
  const percentageT = calculateMonthlyPercentageT(monthlyCompleted, monthlyGoal);
  const elapsedDays = getElapsedDaysInMonth(year, month, daysInMonth, referenceDate);

  let completedC = 0;
  let recordedElapsedCount = 0;

  for (const habit of habitsWithStates) {
    completedC += calculateActualElapsed(habit.states, elapsedDays);
    recordedElapsedCount += calculateElapsedRecordedCount(habit.states, elapsedDays);
  }

  return {
    percentageT,
    percentageC: calculatePercentageC(completedC, recordedElapsedCount),
    completedT: monthlyCompleted,
    notCompletedT: Math.max(0, monthlyGoal - monthlyCompleted),
    completedC,
    notCompletedC: Math.max(0, recordedElapsedCount - completedC),
  };
}
