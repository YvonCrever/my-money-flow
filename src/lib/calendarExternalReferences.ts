import { sortCalendarExternalReferences } from '@/lib/calendar';
import {
  areCalendarExternalReferenceSetsEquivalent,
  ensureCalendarStoreReady,
  readCalendarState,
  updateCalendarState,
} from '@/lib/calendarStore';
import type { CalendarExternalReference, CalendarReferenceSource } from '@/types/calendar';
import type { ExpenseEntry, RevenueEntry } from '@/types/finance';
import type { JournalEntry } from '@/types/journal';
import type { ReadingEntry } from '@/types/reading';

let externalReferenceMutationQueue: Promise<void> = Promise.resolve();

function getReferenceKey(reference: Pick<CalendarExternalReference, 'source' | 'sourceRecordId'>) {
  return `${reference.source}:${reference.sourceRecordId}`;
}

function getSourceRecordKey(source: CalendarReferenceSource, sourceRecordId: string) {
  return `${source}:${sourceRecordId}`;
}

function getSyncTimestamp() {
  return new Date().toISOString();
}

function createFinanceRevenueReference(revenue: RevenueEntry): CalendarExternalReference {
  return {
    id: `finance-revenue:${revenue.id}`,
    source: 'finance-revenue',
    sourceRecordId: revenue.id,
    date: revenue.calendarMeta?.date ?? revenue.date,
    title: `${revenue.client} · ${revenue.service}`,
    summary: `${revenue.hours} ${revenue.unit}`,
    categoryLabel: revenue.client,
    linkedCalendarItemId: revenue.calendarMeta?.linkedCalendarItemId ?? null,
    metrics: {
      amount: revenue.amount,
      plannedMinutes: revenue.unit === 'heure'
        ? Math.round(revenue.hours * 60)
        : revenue.calendarMeta?.plannedMinutes,
    },
    createdAt: revenue.date,
    updatedAt: getSyncTimestamp(),
  };
}

function createFinanceExpenseReference(expense: ExpenseEntry): CalendarExternalReference {
  return {
    id: `finance-expense:${expense.id}`,
    source: 'finance-expense',
    sourceRecordId: expense.id,
    date: expense.calendarMeta?.date ?? expense.date,
    title: expense.description ? `Depense · ${expense.description}` : `Depense · ${expense.category}`,
    summary: expense.category,
    categoryLabel: expense.category,
    linkedCalendarItemId: expense.calendarMeta?.linkedCalendarItemId ?? null,
    metrics: {
      amount: expense.amount,
    },
    createdAt: expense.date,
    updatedAt: getSyncTimestamp(),
  };
}

function createReadingReference(book: ReadingEntry): CalendarExternalReference {
  return {
    id: `reading:${book.id}`,
    source: 'reading',
    sourceRecordId: book.id,
    date: book.calendarMeta?.date ?? book.addedAt.slice(0, 10),
    title: `${book.title} · ${book.author}`,
    summary: book.category,
    categoryLabel: book.category,
    linkedCalendarItemId: book.calendarMeta?.linkedCalendarItemId ?? null,
    metrics: {
      rating: book.rating,
    },
    createdAt: book.addedAt,
    updatedAt: getSyncTimestamp(),
  };
}

function createJournalReference(entry: JournalEntry): CalendarExternalReference {
  return {
    id: `journal:${entry.date}`,
    source: 'journal',
    sourceRecordId: entry.date,
    date: entry.calendarMeta?.date ?? entry.date,
    title: `Journal du ${entry.date}`,
    summary: [
      entry.somethingNew,
      entry.somethingLearnt,
      entry.didWell,
    ].filter(Boolean).join(' · ').slice(0, 180),
    linkedCalendarItemId: entry.calendarMeta?.linkedCalendarItemId ?? null,
    metrics: {
      plannedMinutes: entry.calendarMeta?.plannedMinutes,
    },
    createdAt: entry.date,
    updatedAt: entry.updatedAt,
  };
}

function queueCalendarExternalReferenceMutation<T>(mutation: () => Promise<T>) {
  const nextMutation = externalReferenceMutationQueue
    .then(() => mutation(), () => mutation());

  externalReferenceMutationQueue = nextMutation.then(
    () => undefined,
    () => undefined,
  );

  return nextMutation;
}

async function mutateCalendarExternalReferences(
  updater: (references: CalendarExternalReference[]) => CalendarExternalReference[],
) {
  return queueCalendarExternalReferenceMutation(async () => {
    try {
      await ensureCalendarStoreReady();
    } catch {
      return readCalendarState();
    }

    return updateCalendarState((state) => {
      const nextReferences = sortCalendarExternalReferences(updater(state.externalReferences));

      if (areCalendarExternalReferenceSetsEquivalent(state.externalReferences, nextReferences)) {
        return state;
      }

      return {
        ...state,
        externalReferences: nextReferences,
      };
    });
  });
}

export function replaceFinanceRevenueReferencesInCalendar(revenues: RevenueEntry[]) {
  const financeRevenueReferences = revenues.map(createFinanceRevenueReference);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => reference.source !== 'finance-revenue'),
    ...financeRevenueReferences,
  ]);
}

export function replaceFinanceExpenseReferencesInCalendar(expenses: ExpenseEntry[]) {
  const financeExpenseReferences = expenses.map(createFinanceExpenseReference);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => reference.source !== 'finance-expense'),
    ...financeExpenseReferences,
  ]);
}

export function replaceFinanceReferencesInCalendar(input: {
  revenues: RevenueEntry[];
  expenses: ExpenseEntry[];
}) {
  const financeRevenueReferences = input.revenues.map(createFinanceRevenueReference);
  const financeExpenseReferences = input.expenses.map(createFinanceExpenseReference);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => (
      reference.source !== 'finance-revenue'
      && reference.source !== 'finance-expense'
    )),
    ...financeRevenueReferences,
    ...financeExpenseReferences,
  ]);
}

export function upsertFinanceReferenceInCalendar(
  source: 'finance-revenue' | 'finance-expense',
  record: RevenueEntry | ExpenseEntry,
) {
  const nextReference = source === 'finance-revenue'
    ? createFinanceRevenueReference(record as RevenueEntry)
    : createFinanceExpenseReference(record as ExpenseEntry);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => getReferenceKey(reference) !== getReferenceKey(nextReference)),
    nextReference,
  ]);
}

export function removeFinanceReferenceFromCalendar(
  source: 'finance-revenue' | 'finance-expense',
  sourceRecordId: string,
) {
  return mutateCalendarExternalReferences((references) => (
    references.filter((reference) => getReferenceKey(reference) !== getSourceRecordKey(source, sourceRecordId))
  ));
}

export function replaceReadingReferencesInCalendar(books: ReadingEntry[]) {
  const readingReferences = books.map(createReadingReference);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => reference.source !== 'reading'),
    ...readingReferences,
  ]);
}

export function upsertReadingReferenceInCalendar(book: ReadingEntry) {
  const nextReference = createReadingReference(book);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => getReferenceKey(reference) !== getReferenceKey(nextReference)),
    nextReference,
  ]);
}

export function removeReadingReferenceFromCalendar(bookId: string) {
  return mutateCalendarExternalReferences((references) => (
    references.filter((reference) => getReferenceKey(reference) !== getSourceRecordKey('reading', bookId))
  ));
}

export function replaceJournalReferencesInCalendar(entries: JournalEntry[]) {
  const journalReferences = entries.map(createJournalReference);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => reference.source !== 'journal'),
    ...journalReferences,
  ]);
}

export function upsertJournalReferenceInCalendar(entry: JournalEntry) {
  const nextReference = createJournalReference(entry);

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => getReferenceKey(reference) !== getReferenceKey(nextReference)),
    nextReference,
  ]);
}

export function upsertJournalReferencesInCalendar(entries: JournalEntry[]) {
  const nextReferences = entries.map(createJournalReference);
  const nextReferenceKeys = new Set(nextReferences.map((reference) => getReferenceKey(reference)));

  return mutateCalendarExternalReferences((references) => [
    ...references.filter((reference) => !nextReferenceKeys.has(getReferenceKey(reference))),
    ...nextReferences,
  ]);
}

export function removeJournalReferenceFromCalendar(date: string) {
  return mutateCalendarExternalReferences((references) => (
    references.filter((reference) => getReferenceKey(reference) !== getSourceRecordKey('journal', date))
  ));
}
