import {
  getDayOfWeek,
  getDaysInMonth,
  getMonthDays,
  getWeekInternalMonth,
  getWeeksInMonth,
} from '@/features/habits/utils/calendarUtils';
import {
  calculateHabitAnalysis,
  calculateMonthlyCompleted,
  calculateMonthlyGoal,
  calculateMonthlyPieData,
  calculateDailyProgress,
  calculateWeeklyProgress,
} from '@/features/habits/utils/statisticsUtils';
import {
  calculateWeeklyHabitAnalysis,
  calculateWeeklyMonthlyStats,
} from '@/features/habits/utils/weeklyStatisticsUtils';
import {
  createDateKey,
  getDateKeyFromTimestamp,
  getMonthBoundaryDateKeys,
  isDayFuture,
  isDayModifiable,
  isWeekElapsed,
  isWeekFuture,
  isWeekModifiable,
  compareDateKeys,
} from '@/features/habits/utils/timeUtils';
import type {
  ChartSegment,
  DailyGridDayView,
  DailyStatisticsViewModel,
  DailyTrackerViewModel,
  HabitDefinition,
  HabitListItem,
  HabitTrackerState,
  HabitWithStates,
  MoodSleepValues,
  WeeklyGridWeekView,
  WeeklyHabitWithStates,
  WeeklyTrackerViewModel,
} from '@/features/habits/types';

function toHabitListItem(habit: HabitDefinition): HabitListItem {
  return {
    id: habit.id,
    name: habit.name,
  };
}

function createEntryMap<T extends { dateKey: string }>(entries: T[]) {
  return new Map(entries.map((entry) => [entry.dateKey, entry]));
}

function isHabitEligibleOnDate(habit: HabitDefinition, dateKey: string) {
  const createdDateKey = getDateKeyFromTimestamp(habit.createdAt);
  const archivedDateKey = habit.archivedAt ? getDateKeyFromTimestamp(habit.archivedAt) : null;

  if (compareDateKeys(dateKey, createdDateKey) < 0) return false;
  if (archivedDateKey && compareDateKeys(dateKey, archivedDateKey) >= 0) return false;
  return true;
}

function isHabitRelevantToMonth(habit: HabitDefinition, year: number, month: number, daysInMonth: number) {
  const { startDateKey, endDateKey } = getMonthBoundaryDateKeys(year, month, daysInMonth);
  const createdDateKey = getDateKeyFromTimestamp(habit.createdAt);
  const archivedDateKey = habit.archivedAt ? getDateKeyFromTimestamp(habit.archivedAt) : null;

  if (compareDateKeys(createdDateKey, endDateKey) > 0) return false;
  if (archivedDateKey && compareDateKeys(archivedDateKey, startDateKey) <= 0) return false;
  return true;
}

function buildDailyDays(year: number, month: number, referenceDate: Date): DailyGridDayView[] {
  return getMonthDays(year, month).map((day) => ({
    ...day,
    dateKey: day.exists && day.dayNumber ? createDateKey(year, month, day.dayNumber) : null,
    isFuture: day.exists && day.dayNumber ? isDayFuture(year, month, day.dayNumber, referenceDate) : false,
    isModifiable: day.exists && day.dayNumber ? isDayModifiable(year, month, day.dayNumber, referenceDate) : false,
  }));
}

function buildMoodSleepValues(
  days: DailyGridDayView[],
  entries: Array<{ dateKey: string; value: number }>,
): MoodSleepValues {
  const entryMap = createEntryMap(entries);

  return days.map((day) => {
    if (!day.exists || !day.dateKey) return null;
    return entryMap.get(day.dateKey)?.value ?? null;
  });
}

function buildDailyRows(
  habits: HabitDefinition[],
  state: HabitTrackerState,
  days: DailyGridDayView[],
): HabitWithStates[] {
  const entryMap = new Map(
    state.dailyEntries.map((entry) => [`${entry.habitId}:${entry.dateKey}`, entry.state]),
  );

  return habits.map((habit) => ({
    habit: toHabitListItem(habit),
    states: days.map((day) => {
      if (!day.exists || !day.dateKey) return 'empty';
      if (!isHabitEligibleOnDate(habit, day.dateKey)) return 'empty';
      return entryMap.get(`${habit.id}:${day.dateKey}`) ?? 'empty';
    }),
  }));
}

function buildDailyStatistics(
  habits: HabitWithStates[],
  year: number,
  month: number,
  daysInMonth: number,
  referenceDate: Date,
): DailyStatisticsViewModel {
  const monthlyGoal = calculateMonthlyGoal(habits.length, daysInMonth);
  const monthlyCompleted = calculateMonthlyCompleted(habits);
  const pieData = calculateMonthlyPieData(habits, year, month, daysInMonth, referenceDate);
  const firstDayOfWeek = getDayOfWeek(new Date(year, month, 1));
  const dailyProgressData = calculateDailyProgress(habits)
    .slice(0, daysInMonth)
    .map((percentage, dayIndex) => ({
      day: dayIndex + 1,
      value: percentage,
    }));

  const createChartSegments = (completed: number, notCompleted: number): ChartSegment[] => ([
    { name: 'Done', value: completed, color: '#94a3b8' },
    { name: 'Not Done', value: notCompleted, color: '#cbd5e1' },
  ]);

  return {
    monthlyGoal,
    monthlyCompleted,
    percentageT: pieData.percentageT,
    percentageC: pieData.percentageC,
    dailyProgressData,
    weeklyProgress: calculateWeeklyProgress(habits, daysInMonth, getWeekInternalMonth, firstDayOfWeek),
    pieDataT: createChartSegments(pieData.completedT, pieData.notCompletedT),
    pieDataC: createChartSegments(pieData.completedC, pieData.notCompletedC),
  };
}

export function buildDailyTrackerViewModel(
  state: HabitTrackerState,
  year: number,
  month: number,
  referenceDate: Date,
): DailyTrackerViewModel {
  const daysInMonth = getDaysInMonth(year, month);
  const days = buildDailyDays(year, month, referenceDate);
  const visibleHabits = state.habits.filter((habit) => (
    habit.kind === 'daily' && isHabitRelevantToMonth(habit, year, month, daysInMonth)
  ));
  const habits = buildDailyRows(visibleHabits, state, days);
  const habitAnalyses = habits.map((habit) => (
    calculateHabitAnalysis(habit.habit.id, habit.states, daysInMonth, year, month, referenceDate)
  ));

  return {
    days,
    habits,
    habitAnalyses,
    statistics: buildDailyStatistics(habits, year, month, daysInMonth, referenceDate),
    mood: buildMoodSleepValues(days, state.moodEntries),
    sleep: buildMoodSleepValues(days, state.sleepEntries),
    managerHabits: state.habits
      .filter((habit) => habit.kind === 'daily' && habit.status === 'active')
      .map(toHabitListItem),
  };
}

function buildWeeklyWeeks(year: number, month: number, referenceDate: Date): WeeklyGridWeekView[] {
  const monthDays = getMonthDays(year, month);
  const weeksInMonth = getWeeksInMonth(year, month);

  return Array.from({ length: weeksInMonth }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      label: `Week ${weekNumber}`,
      isFuture: isWeekFuture(year, month, weekNumber, monthDays, referenceDate),
      isElapsed: isWeekElapsed(year, month, weekNumber, monthDays, referenceDate),
      isModifiable: isWeekModifiable(year, month, weekNumber, monthDays, referenceDate),
    };
  });
}

export function buildWeeklyTrackerViewModel(
  habits: WeeklyHabitWithStates[],
  year: number,
  month: number,
  referenceDate: Date,
): WeeklyTrackerViewModel {
  const monthDays = getMonthDays(year, month);
  const weeksInMonth = getWeeksInMonth(year, month);

  return {
    weeks: buildWeeklyWeeks(year, month, referenceDate),
    habits,
    analyses: habits.map((habit) => (
      calculateWeeklyHabitAnalysis(
        habit.habit.id,
        habit.states,
        weeksInMonth,
        year,
        month,
        monthDays,
        referenceDate,
      )
    )),
    monthlyStats: calculateWeeklyMonthlyStats(habits, weeksInMonth, year, month, monthDays, referenceDate),
    managerHabits: habits.map((habit) => habit.habit),
  };
}
