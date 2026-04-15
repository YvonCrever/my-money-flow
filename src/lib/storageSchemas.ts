import { z } from 'zod';
import {
  BOOK_CATEGORIES,
  type BookCategory,
} from '@/types/reading';
import {
  CALENDAR_CONVERSION_TARGETS,
  CALENDAR_ITEM_PRIORITIES,
  CALENDAR_ITEM_SCOPES,
  CALENDAR_ITEM_STATUSES,
  CALENDAR_REFERENCE_SOURCES,
  CALENDAR_SYNC_TARGETS,
  CALENDAR_VIEWS,
} from '@/types/calendar';
import {
  APP_BACKUP_VERSION,
  defaultInvoiceSettings,
  type StoredDataset,
} from '@/types/storage';
import { EXPENSE_CATEGORIES, REVENUE_UNITS, type ExpenseCategory, type RevenueUnit } from '@/types/finance';
import { type HabitTrackerState } from '@/features/habits/types';

const datasetSourceSchema = z.enum(['app', 'legacy-local-storage', 'backup-import']);
const revenueUnits = REVENUE_UNITS.map((unit) => unit.value) as unknown as [RevenueUnit, ...RevenueUnit[]];
const expenseCategories = EXPENSE_CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]];
const bookCategories = BOOK_CATEGORIES as unknown as [BookCategory, ...BookCategory[]];

export const personalDataSchema = z.object({
  companyName: z.string(),
  address: z.string(),
  city: z.string(),
  siret: z.string(),
  email: z.string(),
  phone: z.string(),
  bic: z.string(),
  iban: z.string(),
});

const invoicePeriodTrackingSchema = z.object({
  invoiceSent: z.boolean(),
  paymentReceived: z.boolean(),
  updatedAt: z.string(),
});

export const invoiceSettingsSchema = z.object({
  numbering: z.object({
    lastYear: z.number().int(),
    lastNumber: z.number().int().min(0),
  }),
  repair2026Applied: z.boolean(),
  invoiceTracking: z.record(invoicePeriodTrackingSchema).default({}),
});

const calendarLinkedMetaSchema = z.object({
  date: z.string(),
  linkedCalendarItemId: z.string().nullable().optional(),
  plannedMinutes: z.number().optional(),
  actualMinutes: z.number().optional(),
  syncTarget: z.enum(CALENDAR_SYNC_TARGETS).nullable().optional(),
});

export const revenueEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  client: z.string(),
  service: z.string(),
  unit: z.enum(revenueUnits),
  hourlyRate: z.number(),
  hours: z.number(),
  amount: z.number(),
  month: z.number().int(),
  year: z.number().int(),
  calendarMeta: calendarLinkedMetaSchema.optional(),
});

export const expenseEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.enum(expenseCategories),
  description: z.string(),
  amount: z.number(),
  isRecurring: z.boolean(),
  month: z.number().int(),
  year: z.number().int(),
  calendarMeta: calendarLinkedMetaSchema.optional(),
});

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  pseudo: z.string().optional(),
  address: z.string(),
  siren: z.string(),
  email: z.string().optional(),
});

export const financeBackupValueSchema = z.object({
  revenues: z.array(revenueEntrySchema),
  expenses: z.array(expenseEntrySchema),
  clients: z.array(clientSchema),
});

export const readingEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  category: z.enum(bookCategories),
  rating: z.number(),
  addedAt: z.string(),
  calendarMeta: calendarLinkedMetaSchema.optional(),
});

const calendarChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  done: z.boolean(),
});

const calendarTaskCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  icon: z.string(),
  targetHoursPerWeek: z.number(),
  defaultSyncTarget: z.enum(CALENDAR_SYNC_TARGETS).nullable(),
  isRevenueCategory: z.boolean(),
  financeClientId: z.string().nullable(),
  hourlyRate: z.number().nullable(),
});

const calendarExternalReferenceSchema = z.object({
  id: z.string(),
  source: z.enum(CALENDAR_REFERENCE_SOURCES),
  sourceRecordId: z.string(),
  date: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  categoryLabel: z.string().optional(),
  linkedCalendarItemId: z.string().nullable().optional(),
  metrics: z.object({
    amount: z.number().optional(),
    plannedMinutes: z.number().optional(),
    actualMinutes: z.number().optional(),
    rating: z.number().optional(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const calendarItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  endDayOffset: z.union([z.literal(0), z.literal(1)]).optional(),
  plannedMinutes: z.number(),
  actualMinutes: z.number(),
  categoryId: z.string(),
  status: z.enum(CALENDAR_ITEM_STATUSES),
  priority: z.enum(CALENDAR_ITEM_PRIORITIES),
  scope: z.enum(CALENDAR_ITEM_SCOPES),
  syncTarget: z.enum(CALENDAR_SYNC_TARGETS).nullable(),
  linkedRecordId: z.string().nullable(),
  checklist: z.array(calendarChecklistItemSchema),
  tags: z.array(z.string()),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  financeClientIdOverride: z.string().nullable().optional(),
});

const calendarWeekPlanSchema = z.object({
  weekKey: z.string(),
  headline: z.string(),
  focus: z.string(),
  notes: z.string(),
  targetHours: z.number(),
  categoryGoals: z.record(z.string(), z.number()),
  review: z.string(),
  updatedAt: z.string(),
});

const calendarConversionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  target: z.enum(CALENDAR_CONVERSION_TARGETS),
  recordId: z.string(),
  recordDate: z.string(),
  summary: z.string(),
  status: z.enum(['converted', 'reverted']),
  createdAt: z.string(),
  revertedAt: z.string().nullable(),
});

export const calendarStateSchema = z.object({
  schemaVersion: z.literal(3),
  categories: z.array(calendarTaskCategorySchema),
  items: z.array(calendarItemSchema),
  weekPlans: z.array(calendarWeekPlanSchema),
  conversions: z.array(calendarConversionSchema),
  externalReferences: z.array(calendarExternalReferenceSchema),
  preferences: z.object({
    activeView: z.enum(CALENDAR_VIEWS),
    selectedDate: z.string(),
    showCompleted: z.boolean(),
    density: z.enum(['comfortable', 'compact']),
  }),
  lastUpdatedAt: z.string(),
});

export const habitTrackerStateSchema = z.object({
  schemaVersion: z.literal(1),
  habits: z.array(z.object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(['daily', 'weekly']),
    status: z.enum(['active', 'archived']),
    createdAt: z.string(),
    archivedAt: z.string().nullable(),
    updatedAt: z.string(),
  })),
  dailyEntries: z.array(z.object({
    id: z.string(),
    habitId: z.string(),
    dateKey: z.string(),
    state: z.enum(['done', 'not-done']),
    updatedAt: z.string(),
  })),
  moodEntries: z.array(z.object({
    dateKey: z.string(),
    value: z.number(),
    updatedAt: z.string(),
  })),
  sleepEntries: z.array(z.object({
    dateKey: z.string(),
    value: z.number(),
    updatedAt: z.string(),
  })),
  lastUpdatedAt: z.string(),
}) as z.ZodType<HabitTrackerState>;

export const journalBackupMediaItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'video']),
  mimeType: z.string(),
  lastModified: z.number().optional(),
  source: z.enum(['manual', 'import']).optional(),
  dataUrl: z.string(),
});

export const journalBackupEntrySchema = z.object({
  date: z.string(),
  somethingNew: z.string(),
  somethingLearnt: z.string(),
  couldDoneBetter: z.string(),
  didWell: z.string(),
  moodId: z.string().nullable(),
  updatedAt: z.string(),
  mediaItems: z.array(journalBackupMediaItemSchema),
  calendarMeta: calendarLinkedMetaSchema.optional(),
});

export function createStoredDatasetSchema<T>(valueSchema: z.ZodType<T>) {
  return z.object({
    key: z.string(),
    schemaVersion: z.number().int().min(1),
    updatedAt: z.string(),
    source: datasetSourceSchema,
    value: valueSchema,
  }) as z.ZodType<StoredDataset<T>>;
}

export const storedPersonalDataSchema = createStoredDatasetSchema(personalDataSchema);
export const storedInvoiceSettingsSchema = createStoredDatasetSchema(invoiceSettingsSchema);
export const storedFinanceRevenuesSchema = createStoredDatasetSchema(z.array(revenueEntrySchema));
export const storedFinanceExpensesSchema = createStoredDatasetSchema(z.array(expenseEntrySchema));
export const storedFinanceClientsSchema = createStoredDatasetSchema(z.array(clientSchema));
export const storedReadingBooksSchema = createStoredDatasetSchema(z.array(readingEntrySchema));
export const storedHabitTrackerStateSchema = createStoredDatasetSchema(habitTrackerStateSchema);
export const storedCalendarStateSchema = createStoredDatasetSchema(calendarStateSchema);
export const storedJournalBackupSchema = createStoredDatasetSchema(z.array(journalBackupEntrySchema));
export const storedFinanceBackupSchema = createStoredDatasetSchema(financeBackupValueSchema);

export const appBackupEnvelopeSchema = z.object({
  version: z.literal(APP_BACKUP_VERSION),
  createdAt: z.string(),
  appVersion: z.string(),
  datasets: z.object({
    finance: storedFinanceBackupSchema,
    reading: createStoredDatasetSchema(z.array(readingEntrySchema)),
    calendar: storedCalendarStateSchema,
    journal: storedJournalBackupSchema,
    personalData: storedPersonalDataSchema,
    invoiceSettings: storedInvoiceSettingsSchema,
  }),
  stats: z.object({
    revenuesCount: z.number().int().min(0),
    expensesCount: z.number().int().min(0),
    clientsCount: z.number().int().min(0),
    readingBooksCount: z.number().int().min(0),
    calendarItemsCount: z.number().int().min(0),
    journalEntriesCount: z.number().int().min(0),
    journalMediaCount: z.number().int().min(0),
  }),
});

export function coerceInvoiceSettings(value: unknown, currentYear = new Date().getFullYear()) {
  const parsed = invoiceSettingsSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return defaultInvoiceSettings(currentYear);
}
