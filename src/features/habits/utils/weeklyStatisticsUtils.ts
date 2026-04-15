import { getElapsedWeeksInMonth } from '@/features/habits/utils/timeUtils';
import type {
  HabitState,
  WeeklyHabitAnalysisData,
  WeeklyHabitWithStates,
  WeeklyMonthlyStats,
} from '@/features/habits/types';
import type { MonthDayInfo } from '@/features/habits/utils/calendarUtils';

export function calculateWeeklyHabitAnalysis(
  habitId: string,
  states: HabitState[],
  weeksInMonth: number,
  year: number,
  month: number,
  monthDays: MonthDayInfo[],
  referenceDate: Date,
): WeeklyHabitAnalysisData {
  const actual = states.slice(0, weeksInMonth).filter((state) => state === 'done').length;
  const elapsedWeeks = getElapsedWeeksInMonth(weeksInMonth, year, month, monthDays, referenceDate);
  const statesInElapsed = states.slice(0, elapsedWeeks);
  const doneInElapsed = statesInElapsed.filter((state) => state === 'done').length;
  const recordedInElapsed = statesInElapsed.filter((state) => state !== 'empty').length;

  return {
    habitId,
    goal: weeksInMonth,
    actual,
    percentageT: weeksInMonth > 0 ? Math.round((actual / weeksInMonth) * 100) : 0,
    percentageC: recordedInElapsed > 0 ? Math.round((doneInElapsed / recordedInElapsed) * 100) : 0,
  };
}

export function calculateWeeklyMonthlyStats(
  habits: WeeklyHabitWithStates[],
  weeksInMonth: number,
  year: number,
  month: number,
  monthDays: MonthDayInfo[],
  referenceDate: Date,
): WeeklyMonthlyStats {
  const goal = habits.length * weeksInMonth;
  const completed = habits.reduce(
    (sum, habit) => sum + habit.states.slice(0, weeksInMonth).filter((state) => state === 'done').length,
    0,
  );
  const elapsedWeeks = getElapsedWeeksInMonth(weeksInMonth, year, month, monthDays, referenceDate);

  let doneInElapsed = 0;
  let recordedInElapsed = 0;

  for (const habit of habits) {
    const statesInElapsed = habit.states.slice(0, elapsedWeeks);
    doneInElapsed += statesInElapsed.filter((state) => state === 'done').length;
    recordedInElapsed += statesInElapsed.filter((state) => state !== 'empty').length;
  }

  return {
    goal,
    completed,
    percentageT: goal > 0 ? Math.round((completed / goal) * 100) : 0,
    percentageC: recordedInElapsed > 0 ? Math.round((doneInElapsed / recordedInElapsed) * 100) : 0,
  };
}
