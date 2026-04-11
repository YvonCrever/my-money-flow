import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TRAITEURS_CATEGORY_ID,
  type CalendarExternalReference,
  type CalendarItem,
  type CalendarItemConversion,
  type CalendarState,
  type CalendarTaskCategory,
  type CalendarWeekPlan,
} from '@/types/calendar';

export const CALENDAR_STORAGE_KEY = 'ycaro_calendar_state_v1';
export const CALENDAR_STORE_EVENT = 'ycaro:calendar-store-updated';
export const CALENDAR_SCHEMA_VERSION = 3;
const MINUTES_PER_DAY = 24 * 60;

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toCalendarDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function fromCalendarDateKey(value: string) {
  return parseISO(`${value}T00:00:00`);
}

export function formatCalendarLongDate(value: string) {
  return format(fromCalendarDateKey(value), 'EEEE d MMMM yyyy', { locale: fr });
}

export function formatCalendarMonthLabel(value: string) {
  return format(fromCalendarDateKey(value), 'MMMM yyyy', { locale: fr });
}

export function formatCalendarWeekLabel(value: string) {
  const start = startOfWeek(fromCalendarDateKey(value), { weekStartsOn: 1 });
  const end = endOfWeek(fromCalendarDateKey(value), { weekStartsOn: 1 });
  const startMonth = format(start, 'MMMM', { locale: fr });
  const endMonth = format(end, 'MMMM', { locale: fr });

  if (startMonth === endMonth) {
    return `${format(start, 'd', { locale: fr })}–${format(end, 'd MMMM yyyy', { locale: fr })}`;
  }

  return `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`;
}

export function getCalendarWeekKey(value: string) {
  return format(startOfWeek(fromCalendarDateKey(value), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getCalendarMonthKey(value: string) {
  return value.slice(0, 7);
}

export function getWeekDays(value: string) {
  const weekStart = startOfWeek(fromCalendarDateKey(value), { weekStartsOn: 1 });

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);

    return {
      date: toCalendarDateKey(date),
      shortLabel: format(date, 'EEE', { locale: fr }),
      dayLabel: format(date, 'EEEE', { locale: fr }),
      dayNumber: format(date, 'd', { locale: fr }),
      isToday: toCalendarDateKey(date) === toCalendarDateKey(new Date()),
    };
  });
}

export function getMonthDays(value: string) {
  const date = fromCalendarDateKey(value);
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });

  return eachDayOfInterval({ start, end }).map((day) => ({
    date: toCalendarDateKey(day),
    isCurrentMonth: isSameMonth(day, date),
    dayNumber: format(day, 'd', { locale: fr }),
  }));
}

export function hoursToMinutes(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * 60);
}

export function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

export function minutesToTimeValue(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(value)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatTimeLabel(value: string | null | undefined) {
  if (!value) return 'Sans heure';
  return value;
}

function normalizeEndDayOffset(value: unknown): 0 | 1 {
  return value === 1 ? 1 : 0;
}

export function getEndTimeWithDayOffset(
  startTime: string | null | undefined,
  plannedMinutes: number,
): { endTime: string | null; endDayOffset: 0 | 1 } {
  const startMinutes = parseTimeToMinutes(startTime);
  const duration = Math.max(0, Math.round(plannedMinutes));

  if (startMinutes === null || duration <= 0) {
    return {
      endTime: null,
      endDayOffset: 0,
    };
  }

  const totalMinutes = startMinutes + duration;
  const endDayOffset = totalMinutes >= MINUTES_PER_DAY ? 1 : 0;
  const wrappedMinutes = totalMinutes % MINUTES_PER_DAY;

  return {
    endTime: minutesToTimeValue(wrappedMinutes),
    endDayOffset,
  };
}

export function getDurationBetweenTimes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  endDayOffset: 0 | 1 = 0,
) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const normalizedEndDayOffset = normalizeEndDayOffset(endDayOffset);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  const duration = endMinutes - startMinutes + (normalizedEndDayOffset * MINUTES_PER_DAY);

  if (duration <= 0) {
    return null;
  }

  return duration;
}

export function resolveCalendarItemPlannedMinutes(
  item: Pick<CalendarItem, 'plannedMinutes' | 'startTime' | 'endTime' | 'endDayOffset'>,
) {
  return getDurationBetweenTimes(item.startTime, item.endTime, item.endDayOffset ?? 0) ?? item.plannedMinutes;
}

export function formatCalendarItemTimeRange(item: Pick<CalendarItem, 'startTime' | 'endTime'>) {
  if (!item.startTime || !item.endTime) return 'Sans horaire';
  return `${formatTimeLabel(item.startTime)} - ${formatTimeLabel(item.endTime)}`;
}

export function getCalendarItemVisualRange(item: Pick<CalendarItem, 'startTime' | 'endTime' | 'endDayOffset'>) {
  const startMinutes = parseTimeToMinutes(item.startTime);
  const endMinutes = parseTimeToMinutes(item.endTime);
  const normalizedEndDayOffset = normalizeEndDayOffset(item.endDayOffset);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  if (normalizedEndDayOffset === 1) {
    return {
      startMinutes,
      endMinutes: MINUTES_PER_DAY,
    };
  }

  if (endMinutes <= startMinutes) {
    return null;
  }

  return {
    startMinutes,
    endMinutes,
  };
}

export function getCalendarItemOccupiedSegments(
  item: Pick<CalendarItem, 'date' | 'startTime' | 'endTime' | 'endDayOffset'>,
) {
  const startMinutes = parseTimeToMinutes(item.startTime);
  const endMinutes = parseTimeToMinutes(item.endTime);
  const normalizedEndDayOffset = normalizeEndDayOffset(item.endDayOffset);

  if (startMinutes === null || endMinutes === null) {
    return [];
  }

  if (normalizedEndDayOffset === 1) {
    const segments = [
      {
        date: item.date,
        startMinutes,
        endMinutes: MINUTES_PER_DAY,
      },
    ];

    if (endMinutes > 0) {
      segments.push({
        date: toCalendarDateKey(addDays(fromCalendarDateKey(item.date), 1)),
        startMinutes: 0,
        endMinutes,
      });
    }

    return segments;
  }

  if (endMinutes <= startMinutes) {
    return [];
  }

  return [
    {
      date: item.date,
      startMinutes,
      endMinutes,
    },
  ];
}

export function getTimeSlots(startHour = 6, endHour = 22, stepMinutes = 30) {
  const slots: Array<{ value: string; minutes: number; label: string }> = [];

  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    const value = minutesToTimeValue(minutes);
    slots.push({
      value,
      minutes,
      label: value,
    });
  }

  return slots;
}

export function detectCalendarConflicts(items: CalendarItem[]) {
  const byDate = new Map<string, Array<{
    itemId: string;
    startMinutes: number;
    endMinutes: number;
  }>>();

  items.forEach((item) => {
    getCalendarItemOccupiedSegments(item).forEach((segment) => {
      const dayItems = byDate.get(segment.date) ?? [];
      dayItems.push({
        itemId: item.id,
        startMinutes: segment.startMinutes,
        endMinutes: segment.endMinutes,
      });
      byDate.set(segment.date, dayItems);
    });
  });

  const conflictIds = new Set<string>();

  byDate.forEach((dayItems) => {
    const sortedItems = dayItems.slice().sort((left, right) => (
      left.startMinutes - right.startMinutes
    ));

    sortedItems.forEach((item, index) => {
      for (let cursor = index + 1; cursor < sortedItems.length; cursor += 1) {
        const nextItem = sortedItems[cursor];
        if (nextItem.startMinutes >= item.endMinutes) break;

        conflictIds.add(item.itemId);
        conflictIds.add(nextItem.itemId);
      }
    });
  });

  return conflictIds;
}

export function minutesToHoursLabel(minutes: number) {
  if (!minutes) return '0 h';
  const hours = minutes / 60;
  return `${hours.toLocaleString('fr-FR', {
    minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
    maximumFractionDigits: 1,
  })} h`;
}

export function sortCalendarItems(items: CalendarItem[]) {
  return items.slice().sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);
    if (dateComparison !== 0) return dateComparison;

    if (left.position !== right.position) return left.position - right.position;

    const startTimeLeft = left.startTime ?? '99:99';
    const startTimeRight = right.startTime ?? '99:99';
    const timeComparison = startTimeLeft.localeCompare(startTimeRight);
    if (timeComparison !== 0) return timeComparison;

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function sortCalendarExternalReferences(references: CalendarExternalReference[]) {
  return references.slice().sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);
    if (dateComparison !== 0) return dateComparison;
    return left.title.localeCompare(right.title, 'fr');
  });
}

export function getDefaultCalendarCategories(): CalendarTaskCategory[] {
  return [
    {
      id: 'master-booking',
      name: 'Master Booking',
      description: 'Booking, production client et rendez-vous commerciaux prioritaires.',
      color: '#3b82f6',
      icon: 'BriefcaseBusiness',
      targetHoursPerWeek: 0,
      defaultSyncTarget: 'finance-revenue',
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: TRAITEURS_CATEGORY_ID,
      name: 'Traiteurs',
      description: 'Coordination, gestion et execution des sujets traiteurs.',
      color: '#f97316',
      icon: 'UtensilsCrossed',
      targetHoursPerWeek: 0,
      defaultSyncTarget: null,
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'creation',
      name: 'Création',
      description: 'Creation, experimentation et production creative.',
      color: '#8b5cf6',
      icon: 'Sparkles',
      targetHoursPerWeek: 0,
      defaultSyncTarget: null,
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'apprentissage',
      name: 'Apprentissage',
      description: 'Apprentissage structure, recherche et progression active.',
      color: '#14b8a6',
      icon: 'GraduationCap',
      targetHoursPerWeek: 0,
      defaultSyncTarget: 'reading',
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Organisation, mails, finance et maintenance operationnelle.',
      color: '#94a3b8',
      icon: 'FolderCog',
      targetHoursPerWeek: 0,
      defaultSyncTarget: null,
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Prospection, suivi commercial et closing.',
      color: '#10b981',
      icon: 'BadgeDollarSign',
      targetHoursPerWeek: 0,
      defaultSyncTarget: 'finance-revenue',
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'gym',
      name: 'Gym',
      description: 'Sport, condition physique et recuperation active.',
      color: '#22c55e',
      icon: 'Dumbbell',
      targetHoursPerWeek: 0,
      defaultSyncTarget: null,
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'personal-reading',
      name: 'Personal reading',
      description: 'Lecture personnelle, curiosite et respiration intellectuelle.',
      color: '#f59e0b',
      icon: 'BookMarked',
      targetHoursPerWeek: 0,
      defaultSyncTarget: 'reading',
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'connexion',
      name: 'Connexion',
      description: 'Relations, reseau, discussions et temps de connexion choisi.',
      color: '#06b6d4',
      icon: 'MessagesSquare',
      targetHoursPerWeek: 0,
      defaultSyncTarget: null,
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'psychanalyse-introspection',
      name: 'Psychanalyse + Introspection',
      description: 'Introspection, soin mental, journal et recul personnel.',
      color: '#ec4899',
      icon: 'BrainCircuit',
      targetHoursPerWeek: 0,
      defaultSyncTarget: 'journal',
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
    {
      id: 'art',
      name: 'Art',
      description: 'Pratique artistique, inspiration et culture.',
      color: '#ef4444',
      icon: 'Palette',
      targetHoursPerWeek: 0,
      defaultSyncTarget: null,
      isRevenueCategory: false,
      financeClientId: null,
      hourlyRate: null,
    },
  ];
}

export function getDefaultCategoryGoals(categories: CalendarTaskCategory[]) {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.targetHoursPerWeek]),
  ) as Record<string, number>;
}

function resolveLegacyCategoryId(
  categoryId: string | undefined,
  syncTarget: CalendarItem['syncTarget'],
  title: string,
) {
  const normalizedTitle = title.toLowerCase();

  switch (categoryId) {
    case 'client-work':
      return 'master-booking';
    case 'reading':
      return normalizedTitle.includes('personal') ? 'personal-reading' : 'apprentissage';
    case 'strategy':
      return 'connexion';
    case 'journal':
      return 'psychanalyse-introspection';
    case 'wellbeing':
      return 'gym';
    case 'admin':
      return 'admin';
    default:
      break;
  }

  if (syncTarget === 'finance-revenue') return 'master-booking';
  if (syncTarget === 'reading') return 'apprentissage';
  if (syncTarget === 'journal') return 'psychanalyse-introspection';
  if (normalizedTitle.includes('gym') || normalizedTitle.includes('sport')) return 'gym';
  if (normalizedTitle.includes('art')) return 'art';

  return 'admin';
}

function normalizeCategoryGoals(
  goals: Record<string, number> | undefined,
  categories: CalendarTaskCategory[],
) {
  const defaults = getDefaultCategoryGoals(categories);
  if (!goals || typeof goals !== 'object') {
    return defaults;
  }

  return Object.fromEntries(
    categories.map((category) => {
      const value = goals[category.id];
      return [category.id, Number.isFinite(value) ? value : defaults[category.id]];
    }),
  ) as Record<string, number>;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeCategoryName(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function normalizeCategoryColor(value: unknown, fallback: string) {
  if (!isHexColor(value)) return fallback;
  const normalized = value.trim();
  if (normalized.length === 4) {
    const [hash, r, g, b] = normalized;
    return `${hash}${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return normalized.toUpperCase();
}

function normalizeCalendarCategories(
  sourceCategories: unknown,
  defaults: CalendarTaskCategory[],
) {
  if (!Array.isArray(sourceCategories)) {
    return defaults;
  }

  const sourceMap = new Map(
    sourceCategories
      .filter((category): category is Partial<CalendarTaskCategory> & { id: string } => (
        Boolean(category)
        && typeof category === 'object'
        && typeof (category as CalendarTaskCategory).id === 'string'
      ))
      .map((category) => [category.id, category]),
  );

  return defaults.map((fallbackCategory) => {
    const sourceCategory = sourceMap.get(fallbackCategory.id);
    if (!sourceCategory) return fallbackCategory;

    const hourlyRate = Number(sourceCategory.hourlyRate);

    return {
      ...fallbackCategory,
      name: normalizeCategoryName(sourceCategory.name, fallbackCategory.name),
      description: normalizeCategoryName(sourceCategory.description, fallbackCategory.description),
      color: normalizeCategoryColor(sourceCategory.color, fallbackCategory.color),
      targetHoursPerWeek: Number.isFinite(sourceCategory.targetHoursPerWeek)
        ? Number(sourceCategory.targetHoursPerWeek)
        : fallbackCategory.targetHoursPerWeek,
      defaultSyncTarget: sourceCategory.defaultSyncTarget ?? fallbackCategory.defaultSyncTarget,
      isRevenueCategory: Boolean(sourceCategory.isRevenueCategory),
      financeClientId: typeof sourceCategory.financeClientId === 'string' && sourceCategory.financeClientId.trim()
        ? sourceCategory.financeClientId
        : null,
      hourlyRate: Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : null,
    };
  });
}

function createSeedItem({
  title,
  description,
  date,
  categoryId,
  plannedMinutes,
  actualMinutes,
  startTime,
  endTime,
  endDayOffset,
  status,
  priority,
  position,
  syncTarget,
  tags,
  financeClientIdOverride,
}: {
  title: string;
  description: string;
  date: string;
  categoryId: string;
  plannedMinutes: number;
  actualMinutes: number;
  startTime: string | null;
  endTime: string | null;
  endDayOffset?: 0 | 1;
  status: CalendarItem['status'];
  priority: CalendarItem['priority'];
  position: number;
  syncTarget: CalendarItem['syncTarget'];
  tags: string[];
  financeClientIdOverride?: string | null;
}): CalendarItem {
  const now = new Date().toISOString();

  return {
    id: createId('calendar-item'),
    title,
    description,
    date,
    startTime,
    endTime,
    endDayOffset: normalizeEndDayOffset(endDayOffset),
    plannedMinutes,
    actualMinutes,
    categoryId,
    status,
    priority,
    scope: 'week',
    syncTarget,
    linkedRecordId: null,
    checklist: [],
    tags,
    position,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'done' ? now : null,
    financeClientIdOverride: financeClientIdOverride ?? null,
  };
}

function createSeedWeekPlan(weekKey: string, categories: CalendarTaskCategory[]): CalendarWeekPlan {
  const now = new Date().toISOString();

  return {
    weekKey,
    headline: 'Semaine centrale',
    focus: 'Consolider le planning hebdomadaire et relier les donnees importantes au calendrier.',
    notes: 'Utiliser la vue semaine comme cockpit principal. Laisser les autres modules remonter leurs donnees ici.',
    targetHours: 34,
    categoryGoals: getDefaultCategoryGoals(categories),
    review: '',
    updatedAt: now,
  };
}

export function createDefaultCalendarState(today = toCalendarDateKey(new Date())): CalendarState {
  const categories = getDefaultCalendarCategories();
  const weekDays = getWeekDays(today);
  const weekKey = getCalendarWeekKey(today);
  const now = new Date().toISOString();

  return {
    schemaVersion: CALENDAR_SCHEMA_VERSION,
    categories,
    items: sortCalendarItems([
      createSeedItem({
        title: 'Bloc deep work client',
        description: 'Prototype, production et temps facturable concentre.',
        date: weekDays[1]?.date ?? today,
        categoryId: 'master-booking',
        plannedMinutes: 150,
        actualMinutes: 0,
        startTime: '09:30',
        endTime: '12:00',
        status: 'scheduled',
        priority: 'high',
        position: 0,
        syncTarget: 'finance-revenue',
        tags: ['facturable', 'focus'],
        endDayOffset: 0,
        financeClientIdOverride: null,
      }),
      createSeedItem({
        title: 'Lecture de recherche',
        description: 'Lecture orientee notes et synthese pour les projets en cours.',
        date: weekDays[2]?.date ?? today,
        categoryId: 'apprentissage',
        plannedMinutes: 75,
        actualMinutes: 0,
        startTime: '14:00',
        endTime: '15:15',
        status: 'todo',
        priority: 'medium',
        position: 0,
        syncTarget: 'reading',
        tags: ['apprentissage'],
        endDayOffset: 0,
        financeClientIdOverride: null,
      }),
      createSeedItem({
        title: 'Revue hebdomadaire',
        description: 'Verifier les objectifs, les heures, les taches et les notes de la semaine.',
        date: weekDays[4]?.date ?? today,
        categoryId: 'connexion',
        plannedMinutes: 60,
        actualMinutes: 20,
        startTime: '17:00',
        endTime: '18:00',
        status: 'in-progress',
        priority: 'high',
        position: 0,
        syncTarget: 'journal',
        tags: ['pilotage'],
        endDayOffset: 0,
        financeClientIdOverride: null,
      }),
    ]),
    weekPlans: [createSeedWeekPlan(weekKey, categories)],
    conversions: [],
    externalReferences: [],
    preferences: {
      activeView: 'week',
      selectedDate: today,
      showCompleted: true,
      density: 'comfortable',
    },
    lastUpdatedAt: now,
  };
}

export function normalizeCalendarState(value: unknown, today = toCalendarDateKey(new Date())): CalendarState {
  const fallback = createDefaultCalendarState(today);

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const source = value as Partial<CalendarState>;
  const categories = normalizeCalendarCategories(source.categories, fallback.categories);
  const categoryIds = new Set(categories.map((category) => category.id));

  return {
    schemaVersion: CALENDAR_SCHEMA_VERSION,
    categories,
    items: Array.isArray(source.items)
      ? sortCalendarItems((source.items as CalendarItem[]).map((item) => ({
          ...item,
          categoryId: categoryIds.has(item.categoryId)
            ? item.categoryId
            : resolveLegacyCategoryId(item.categoryId, item.syncTarget, item.title),
          endDayOffset: normalizeEndDayOffset(item.endDayOffset),
          financeClientIdOverride: typeof item.financeClientIdOverride === 'string' && item.financeClientIdOverride.trim()
            ? item.financeClientIdOverride
            : null,
        })))
      : fallback.items,
    weekPlans: Array.isArray(source.weekPlans)
      ? (source.weekPlans as CalendarWeekPlan[]).map((weekPlan) => ({
          ...weekPlan,
          categoryGoals: normalizeCategoryGoals(weekPlan.categoryGoals, categories),
        }))
      : fallback.weekPlans,
    conversions: Array.isArray(source.conversions)
      ? source.conversions as CalendarItemConversion[]
      : fallback.conversions,
    externalReferences: Array.isArray(source.externalReferences)
      ? sortCalendarExternalReferences(source.externalReferences as CalendarExternalReference[])
      : fallback.externalReferences,
    preferences: {
      activeView: source.preferences?.activeView ?? fallback.preferences.activeView,
      selectedDate: source.preferences?.selectedDate ?? fallback.preferences.selectedDate,
      showCompleted: source.preferences?.showCompleted ?? fallback.preferences.showCompleted,
      density: source.preferences?.density ?? fallback.preferences.density,
    },
    lastUpdatedAt: source.lastUpdatedAt ?? fallback.lastUpdatedAt,
  };
}

export function getWeekPlanForDate(weekPlans: CalendarWeekPlan[], date: string) {
  const weekKey = getCalendarWeekKey(date);
  return weekPlans.find((weekPlan) => weekPlan.weekKey === weekKey) ?? null;
}
