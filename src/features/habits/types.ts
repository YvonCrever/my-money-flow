import type { MonthDayInfo } from '@/features/habits/utils/calendarUtils';

export type PersistedHabitState = 'done' | 'not-done';
export type HabitState = 'empty' | PersistedHabitState;
export type HabitKind = 'daily' | 'weekly';
export type HabitStatus = 'active' | 'archived';
export type MoodSleepValues = Array<number | null>;

export interface HabitListItem {
  id: string;
  name: string;
}

export interface HabitDefinition {
  id: string;
  name: string;
  kind: HabitKind;
  status: HabitStatus;
  createdAt: string;
  archivedAt: string | null;
  updatedAt: string;
}

export interface DailyHabitEntry {
  id: string;
  habitId: string;
  dateKey: string;
  state: PersistedHabitState;
  updatedAt: string;
}

export interface MoodEntry {
  dateKey: string;
  value: number;
  updatedAt: string;
}

export interface SleepEntry {
  dateKey: string;
  value: number;
  updatedAt: string;
}

export interface HabitTrackerState {
  schemaVersion: 1;
  habits: HabitDefinition[];
  dailyEntries: DailyHabitEntry[];
  moodEntries: MoodEntry[];
  sleepEntries: SleepEntry[];
  lastUpdatedAt: string;
}

export interface HabitWithStates {
  habit: HabitListItem;
  states: HabitState[];
}

export interface HabitAnalysisData {
  habitId: string;
  goal: number;
  actual: number;
  percentageT: number;
  percentageC: number;
}

export interface WeekData {
  weekNumber: number;
  percentage: number;
  daysInWeek: number;
}

export interface DailyProgressPoint {
  day: number;
  value: number;
}

export interface ChartSegment {
  name: string;
  value: number;
  color: string;
}

export interface DailyStatisticsViewModel {
  monthlyGoal: number;
  monthlyCompleted: number;
  percentageT: number;
  percentageC: number;
  dailyProgressData: DailyProgressPoint[];
  weeklyProgress: WeekData[];
  pieDataT: ChartSegment[];
  pieDataC: ChartSegment[];
}

export interface DailyGridDayView extends MonthDayInfo {
  dateKey: string | null;
  isFuture: boolean;
  isModifiable: boolean;
}

export interface DailyTrackerViewModel {
  days: DailyGridDayView[];
  habits: HabitWithStates[];
  habitAnalyses: HabitAnalysisData[];
  statistics: DailyStatisticsViewModel;
  mood: MoodSleepValues;
  sleep: MoodSleepValues;
  managerHabits: HabitListItem[];
}

export interface WeeklyHabitWithStates {
  habit: HabitListItem;
  states: HabitState[];
}

export interface WeeklyHabitAnalysisData {
  habitId: string;
  goal: number;
  actual: number;
  percentageT: number;
  percentageC: number;
}

export interface WeeklyMonthlyStats {
  goal: number;
  completed: number;
  percentageT: number;
  percentageC: number;
}

export interface WeeklyGridWeekView {
  weekNumber: number;
  label: string;
  isFuture: boolean;
  isElapsed: boolean;
  isModifiable: boolean;
}

export interface WeeklyTrackerViewModel {
  weeks: WeeklyGridWeekView[];
  habits: WeeklyHabitWithStates[];
  analyses: WeeklyHabitAnalysisData[];
  monthlyStats: WeeklyMonthlyStats;
  managerHabits: HabitListItem[];
}
