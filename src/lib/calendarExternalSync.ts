import {
  replaceFinanceReferencesInCalendar,
  replaceJournalReferencesInCalendar,
  replaceReadingReferencesInCalendar,
} from '@/lib/calendarExternalReferences';
import { readFinanceExpenses, readFinanceRevenues } from '@/lib/financeStore';
import { readReadingBooks } from '@/lib/readingStore';
import { getJournalEntries } from '@/lib/journalDb';

export async function syncFinanceReferencesToCalendar() {
  const revenues = readFinanceRevenues();
  const expenses = readFinanceExpenses();

  await replaceFinanceReferencesInCalendar({ expenses, revenues });
}

export async function syncReadingReferencesToCalendar() {
  const books = readReadingBooks();

  await replaceReadingReferencesInCalendar(books);
}

export async function syncJournalReferencesToCalendar() {
  const entries = await getJournalEntries();

  await replaceJournalReferencesInCalendar(entries);
}

export async function syncAllExternalReferencesToCalendar() {
  await syncFinanceReferencesToCalendar();
  await syncReadingReferencesToCalendar();
  await syncJournalReferencesToCalendar();
}
