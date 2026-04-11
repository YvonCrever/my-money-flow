export const CALENDAR_VIEWS = ['day', 'week', 'month', 'year'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const CALENDAR_SYNC_TARGETS = [
  'finance-revenue',
  'finance-expense',
  'reading',
  'journal',
] as const;
export type CalendarSyncTarget = (typeof CALENDAR_SYNC_TARGETS)[number];

export const CALENDAR_CONVERSION_TARGETS = [
  'finance-revenue',
  'reading',
  'journal',
] as const;
export type CalendarConversionTarget = (typeof CALENDAR_CONVERSION_TARGETS)[number];

export const CALENDAR_REFERENCE_SOURCES = [
  'finance-revenue',
  'finance-expense',
  'reading',
  'journal',
] as const;
export type CalendarReferenceSource = (typeof CALENDAR_REFERENCE_SOURCES)[number];

export const CALENDAR_ITEM_STATUSES = [
  'todo',
  'scheduled',
  'in-progress',
  'done',
  'cancelled',
] as const;
export type CalendarItemStatus = (typeof CALENDAR_ITEM_STATUSES)[number];

export const CALENDAR_ITEM_PRIORITIES = ['low', 'medium', 'high'] as const;
export type CalendarItemPriority = (typeof CALENDAR_ITEM_PRIORITIES)[number];

export const CALENDAR_ITEM_SCOPES = ['day', 'week', 'month'] as const;
export type CalendarItemScope = (typeof CALENDAR_ITEM_SCOPES)[number];
export const TRAITEURS_CATEGORY_ID = 'traiteurs' as const;

export interface CalendarChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface CalendarTaskCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  targetHoursPerWeek: number;
  defaultSyncTarget: CalendarSyncTarget | null;
  isRevenueCategory: boolean;
  financeClientId: string | null;
  hourlyRate: number | null;
}

export interface CalendarLinkedMeta {
  date: string;
  linkedCalendarItemId?: string | null;
  plannedMinutes?: number;
  actualMinutes?: number;
  syncTarget?: CalendarSyncTarget | null;
}

export interface CalendarExternalReferenceMetrics {
  amount?: number;
  plannedMinutes?: number;
  actualMinutes?: number;
  rating?: number;
}

export interface CalendarExternalReference {
  id: string;
  source: CalendarReferenceSource;
  sourceRecordId: string;
  date: string;
  title: string;
  summary?: string;
  categoryLabel?: string;
  linkedCalendarItemId?: string | null;
  metrics?: CalendarExternalReferenceMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  endDayOffset?: 0 | 1;
  plannedMinutes: number;
  actualMinutes: number;
  categoryId: string;
  status: CalendarItemStatus;
  priority: CalendarItemPriority;
  scope: CalendarItemScope;
  syncTarget: CalendarSyncTarget | null;
  linkedRecordId: string | null;
  checklist: CalendarChecklistItem[];
  tags: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  financeClientIdOverride?: string | null;
}

export interface CalendarWeekPlan {
  weekKey: string;
  headline: string;
  focus: string;
  notes: string;
  targetHours: number;
  categoryGoals: Record<string, number>;
  review: string;
  updatedAt: string;
}

export interface CalendarItemConversion {
  id: string;
  itemId: string;
  target: CalendarConversionTarget;
  recordId: string;
  recordDate: string;
  summary: string;
  status: 'converted' | 'reverted';
  createdAt: string;
  revertedAt: string | null;
}

export interface CalendarPreferences {
  activeView: CalendarView;
  selectedDate: string;
  showCompleted: boolean;
  density: 'comfortable' | 'compact';
}

export interface CalendarState {
  schemaVersion: 3;
  categories: CalendarTaskCategory[];
  items: CalendarItem[];
  weekPlans: CalendarWeekPlan[];
  conversions: CalendarItemConversion[];
  externalReferences: CalendarExternalReference[];
  preferences: CalendarPreferences;
  lastUpdatedAt: string;
}

export interface CalendarQuickAddInput {
  title: string;
  description?: string;
  date: string;
  categoryId: string;
  plannedMinutes: number;
  actualMinutes?: number;
  startTime?: string | null;
  endTime?: string | null;
  endDayOffset?: 0 | 1;
  priority?: CalendarItemPriority;
  scope?: CalendarItemScope;
  syncTarget?: CalendarSyncTarget | null;
  tags?: string[];
  financeClientIdOverride?: string | null;
}
