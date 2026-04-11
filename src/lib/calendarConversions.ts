import type {
  CalendarConversionTarget,
  CalendarItem,
} from '@/types/calendar';
import type { BookCategory } from '@/types/reading';
import {
  addRevenueRecord,
  deleteRevenueRecord,
} from '@/lib/financeStore';
import {
  addReadingBook,
  deleteReadingBook,
} from '@/lib/readingStore';
import {
  deleteJournalEntry,
  putJournalEntry,
} from '@/lib/journalDb';

export interface RevenueConversionInput {
  date: string;
  client: string;
  service: string;
  hourlyRate: number;
  hours: number;
}

export interface RevenueAutoCreateInput {
  date: string;
  client: string;
  service: string;
  hourlyRate: number;
  hours: number;
}

export interface ReadingConversionInput {
  date: string;
  title: string;
  author: string;
  category: string;
  rating: number;
}

export interface JournalConversionInput {
  date: string;
  somethingNew: string;
  somethingLearnt: string;
  couldDoneBetter: string;
  didWell: string;
}

export async function convertCalendarItemToRevenue(item: CalendarItem, input: RevenueConversionInput) {
  const record = addRevenueRecord({
    date: input.date,
    client: input.client,
    service: input.service,
    hourlyRate: input.hourlyRate,
    hours: input.hours,
    unit: 'heure',
    calendarMeta: {
      date: input.date,
      linkedCalendarItemId: item.id,
      plannedMinutes: Math.round(input.hours * 60),
      syncTarget: 'finance-revenue',
    },
  });

  return {
    target: 'finance-revenue' as const,
    recordId: record.id,
    recordDate: record.date,
    summary: `${record.client} · ${record.service}`,
  };
}

export async function createRevenueFromCalendarItemSnapshot(input: RevenueAutoCreateInput) {
  return addRevenueRecord({
    date: input.date,
    client: input.client,
    service: input.service,
    hourlyRate: input.hourlyRate,
    hours: input.hours,
    unit: 'heure',
    calendarMeta: {
      date: input.date,
      plannedMinutes: Math.round(input.hours * 60),
      syncTarget: 'finance-revenue',
    },
  });
}

export async function convertCalendarItemToReading(item: CalendarItem, input: ReadingConversionInput) {
  const record = addReadingBook({
    title: input.title,
    author: input.author,
    category: input.category as BookCategory,
    rating: input.rating,
    addedAt: `${input.date}T12:00:00.000Z`,
    calendarMeta: {
      date: input.date,
      linkedCalendarItemId: item.id,
      plannedMinutes: item.plannedMinutes,
      syncTarget: 'reading',
    },
  });

  return {
    target: 'reading' as const,
    recordId: record.id,
    recordDate: input.date,
    summary: `${record.title} · ${record.author}`,
  };
}

export async function convertCalendarItemToJournal(item: CalendarItem, input: JournalConversionInput) {
  await putJournalEntry({
    date: input.date,
    somethingNew: input.somethingNew,
    somethingLearnt: input.somethingLearnt,
    couldDoneBetter: input.couldDoneBetter,
    didWell: input.didWell,
    moodId: null,
    mediaItems: [],
    updatedAt: new Date().toISOString(),
    calendarMeta: {
      date: input.date,
      linkedCalendarItemId: item.id,
      plannedMinutes: item.plannedMinutes,
      syncTarget: 'journal',
    },
  });

  return {
    target: 'journal' as const,
    recordId: input.date,
    recordDate: input.date,
    summary: `Journal du ${input.date}`,
  };
}

export async function revertCalendarConversion(target: CalendarConversionTarget, recordId: string) {
  if (target === 'finance-revenue') {
    deleteRevenueRecord(recordId);
    return;
  }

  if (target === 'reading') {
    deleteReadingBook(recordId);
    return;
  }

  await deleteJournalEntry(recordId);
}
