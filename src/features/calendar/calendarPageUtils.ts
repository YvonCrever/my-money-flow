import { BookOpenText, Coins, NotebookPen } from 'lucide-react';

import {
  getCalendarItemVisualRange,
  getEndTimeWithDayOffset,
} from '@/lib/calendar';
import type { CalendarExternalReference, CalendarItem, CalendarTaskCategory, CalendarConversionTarget, CalendarView } from '@/types/calendar';
import type { BookCategory } from '@/types/reading';

export const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'week', label: 'Semaine' },
  { value: 'day', label: 'Jour' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

export const SOURCE_LABELS: Record<CalendarExternalReference['source'], string> = {
  'finance-revenue': 'Revenus',
  'finance-expense': 'Depenses',
  reading: 'Lecture',
  journal: 'Journal',
};

export const CONVERSION_LABELS: Record<CalendarConversionTarget, string> = {
  'finance-revenue': 'Revenu',
  reading: 'Lecture',
  journal: 'Journal',
};

export const TIMELINE_BASE_START_HOUR = 7;
export const TIMELINE_BASE_END_HOUR = 22;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT = 34;

export interface DropIndicator {
  kind: 'slot' | 'backlog';
  date: string;
  startTime?: string;
  position?: number;
}

export interface RevenueDraft {
  date: string;
  client: string;
  service: string;
  hourlyRate: string;
  hours: string;
}

export interface ReadingDraft {
  date: string;
  title: string;
  author: string;
  category: BookCategory;
  rating: string;
}

export interface JournalDraft {
  date: string;
  somethingNew: string;
  somethingLearnt: string;
  couldDoneBetter: string;
  didWell: string;
}

export type WeekSecondaryPanel = 'unscheduled' | 'references';

export interface CategoryDraft {
  name: string;
  color: string;
  isRevenueCategory: boolean;
  financeClientId: string;
  hourlyRate: string;
}

export const CATEGORY_COLOR_PRESETS = [
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#9333EA',
  '#DB2777',
  '#E11D48',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#CA8A04',
  '#65A30D',
  '#16A34A',
  '#0F766E',
  '#0891B2',
  '#0284C7',
  '#64748B',
] as const;

export function buildCategoryDraft(category: CalendarTaskCategory): CategoryDraft {
  return {
    name: category.name,
    color: category.color,
    isRevenueCategory: category.isRevenueCategory,
    financeClientId: category.financeClientId ?? '',
    hourlyRate: category.hourlyRate ? String(category.hourlyRate) : '',
  };
}

export function isHexColorValue(value: string) {
  return /^#(?:[0-9A-F]{6})$/.test(value.trim().toUpperCase());
}

export function normalizeHexColor(value: string) {
  const normalized = value.trim().toUpperCase();
  if (/^#(?:[0-9A-F]{3})$/.test(normalized)) {
    const [hash, r, g, b] = normalized;
    return `${hash}${r}${r}${g}${g}${b}${b}`;
  }
  return normalized;
}

export function getReferenceIcon(source: CalendarExternalReference['source']) {
  if (source === 'finance-revenue' || source === 'finance-expense') return Coins;
  if (source === 'reading') return BookOpenText;
  return NotebookPen;
}

export function getTaskTone(item: CalendarItem, isConflicting: boolean) {
  if (isConflicting) return 'border-rose-500/40 bg-rose-500/12';
  if (item.status === 'done') return 'border-emerald-500/30 bg-emerald-500/12';
  if (item.status === 'in-progress') return 'border-sky-500/30 bg-sky-500/12';
  return 'border-border/70 bg-background/70';
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = normalizeHexColor(hex).replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getCategoryOutlineStyle(color: string) {
  return {
    borderColor: hexToRgba(color, 0.42),
    backgroundImage: `linear-gradient(90deg, ${hexToRgba(color, 0.92)} 0, ${hexToRgba(color, 0.92)} 2px, transparent 2px, transparent 100%)`,
  };
}

export function getBlockStyle(item: CalendarItem, timelineStartHour: number) {
  const visibleRange = getCalendarItemVisualRange(item);
  if (!visibleRange) return null;

  const top = ((visibleRange.startMinutes - (timelineStartHour * 60)) / SLOT_MINUTES) * SLOT_HEIGHT;
  const height = Math.max(
    SLOT_HEIGHT - 6,
    ((visibleRange.endMinutes - visibleRange.startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT - 6,
  );

  return {
    top: `${top}px`,
    height: `${height}px`,
  };
}

export function getTimelineWindow(items: CalendarItem[]) {
  const visibleScheduledItems = items.filter((item) => item.startTime && item.endTime);
  if (visibleScheduledItems.length === 0) {
    return {
      startHour: TIMELINE_BASE_START_HOUR,
      endHour: TIMELINE_BASE_END_HOUR,
    };
  }

  const earliestStart = visibleScheduledItems.reduce((min, item) => (
    Math.min(min, getCalendarItemVisualRange(item)?.startMinutes ?? (TIMELINE_BASE_START_HOUR * 60))
  ), Number.POSITIVE_INFINITY);
  const latestEnd = visibleScheduledItems.reduce((max, item) => (
    Math.max(max, getCalendarItemVisualRange(item)?.endMinutes ?? (TIMELINE_BASE_END_HOUR * 60))
  ), Number.NEGATIVE_INFINITY);

  return {
    startHour: Math.min(TIMELINE_BASE_START_HOUR, Math.floor(earliestStart / 60)),
    endHour: Math.max(TIMELINE_BASE_END_HOUR, Math.ceil(latestEnd / 60)),
  };
}

export function formatHoursInputValue(minutes: number) {
  if (!minutes) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
}

export function buildRevenueDraft(item: CalendarItem): RevenueDraft {
  return {
    date: item.date,
    client: '',
    service: item.title,
    hourlyRate: '85',
    hours: ((Math.max(item.plannedMinutes, 60)) / 60).toFixed(1),
  };
}

export function buildReadingDraft(item: CalendarItem): ReadingDraft {
  return {
    date: item.date,
    title: item.title,
    author: '',
    category: 'Essai',
    rating: '4',
  };
}

export function buildJournalDraft(item: CalendarItem): JournalDraft {
  return {
    date: item.date,
    somethingNew: item.title,
    somethingLearnt: item.description,
    couldDoneBetter: '',
    didWell: item.status === 'done' ? `Tache completee: ${item.title}` : '',
  };
}
