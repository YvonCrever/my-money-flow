import { createContext, useContext, type Context } from 'react';

import type {
  CalendarExternalReference,
  CalendarItem,
  CalendarItemConversion,
  CalendarQuickAddInput,
  CalendarState,
  CalendarTaskCategory,
  CalendarView,
  CalendarWeekPlan,
} from '@/types/calendar';
import type {
  JournalConversionInput,
  ReadingConversionInput,
  RevenueConversionInput,
} from '@/lib/calendarConversions';

export interface CalendarDataContextValue {
  isLoaded: boolean;
  state: CalendarState;
  activeView: CalendarView;
  selectedDate: string;
  categories: CalendarTaskCategory[];
  items: CalendarItem[];
  conversions: CalendarItemConversion[];
  weekPlans: CalendarWeekPlan[];
  externalReferences: CalendarExternalReference[];
  currentWeekPlan: CalendarWeekPlan | null;
  setSelectedDate: (date: string) => void;
  setActiveView: (view: CalendarView) => void;
  setShowCompleted: (value: boolean) => void;
  addItem: (input: CalendarQuickAddInput) => Promise<{
    itemId: string;
    revenueRecordId: string | null;
    revenueStatus: 'created' | 'not-applicable' | 'missing-hourly-rate' | 'missing-category-client' | 'missing-item-client' | 'invalid-client';
  }>;
  updateItem: (itemId: string, updates: Partial<CalendarItem>) => void;
  updateCategory: (categoryId: string, updates: Partial<CalendarTaskCategory>) => void;
  deleteItem: (itemId: string) => void;
  toggleItemComplete: (itemId: string) => void;
  moveItemToDate: (itemId: string, date: string) => void;
  reorderItem: (itemId: string, date: string, position: number) => void;
  scheduleItem: (itemId: string, date: string, startTime: string, endTime: string, endDayOffset?: 0 | 1) => void;
  convertItemToRevenue: (itemId: string, input: RevenueConversionInput) => Promise<boolean>;
  convertItemToReading: (itemId: string, input: ReadingConversionInput) => Promise<boolean>;
  convertItemToJournal: (itemId: string, input: JournalConversionInput) => Promise<boolean>;
  revertItemConversion: (conversionId: string) => Promise<boolean>;
  updateWeekPlan: (updates: Partial<Omit<CalendarWeekPlan, 'weekKey'>>) => void;
}

export type CalendarAddItemResult = Awaited<ReturnType<CalendarDataContextValue['addItem']>>;

declare global {
  var __ycaroCalendarDataContext__: Context<CalendarDataContextValue | null> | undefined;
}

// Keep one shared context instance across HMR updates so the hook and provider stay aligned in dev.
export const CalendarDataContext = globalThis.__ycaroCalendarDataContext__
  ?? createContext<CalendarDataContextValue | null>(null);

if (!globalThis.__ycaroCalendarDataContext__) {
  globalThis.__ycaroCalendarDataContext__ = CalendarDataContext;
}

CalendarDataContext.displayName = 'CalendarDataContext';

export function useCalendarData() {
  const context = useContext(CalendarDataContext);

  if (!context) {
    throw new Error('useCalendarData must be used inside CalendarDataProvider.');
  }

  return context;
}
