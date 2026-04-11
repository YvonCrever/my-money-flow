import type { ReadingEntry } from '@/types/reading';
import { APP_STORE_NAMES } from '@/lib/appStorageDb';
import { replaceReadingReferencesInCalendar } from '@/lib/calendarExternalReferences';
import { createIndexedDatasetStore } from '@/lib/indexedDatasetStore';
import { storedReadingBooksSchema } from '@/lib/storageSchemas';
import { type DatasetSource } from '@/types/storage';

export const READING_BOOKS_STORAGE_KEY = 'reading_books';
export const READING_STORE_EVENT = 'ycaro:reading-store-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readLegacyCollectionSnapshot<T>(key: string, fallback: T) {
  if (!canUseStorage()) {
    return {
      value: fallback,
      hasStoredValue: false,
    };
  }

  try {
    const raw = localStorage.getItem(key);
    return {
      value: raw ? JSON.parse(raw) as T : fallback,
      hasStoredValue: Boolean(raw),
    };
  } catch {
    return {
      value: fallback,
      hasStoredValue: false,
    };
  }
}

function getCalendarDateFromTimestamp(value: string) {
  return value.slice(0, 10);
}

function normalizeReadingEntry(book: ReadingEntry): ReadingEntry {
  return {
    ...book,
    calendarMeta: book.calendarMeta ?? {
      date: getCalendarDateFromTimestamp(book.addedAt),
      syncTarget: 'reading',
    },
  };
}

const initialReadingBooksSnapshot = readLegacyCollectionSnapshot<ReadingEntry[]>(READING_BOOKS_STORAGE_KEY, []);
const readingBooksStore = createIndexedDatasetStore<ReadingEntry[]>({
  eventName: READING_STORE_EVENT,
  getInitialValue: () => initialReadingBooksSnapshot.value.map(normalizeReadingEntry),
  loadLegacy: () => {
    const snapshot = readLegacyCollectionSnapshot<ReadingEntry[]>(READING_BOOKS_STORAGE_KEY, []);
    return {
      ...snapshot,
      source: 'legacy-local-storage' as const,
      value: snapshot.value.map(normalizeReadingEntry),
    };
  },
  migrationModule: 'reading',
  normalize: (books) => books.map(normalizeReadingEntry),
  persistenceErrorLabel: 'Reading persistence failed.',
  schema: storedReadingBooksSchema,
  storeName: APP_STORE_NAMES.readingBooks,
});

export async function ensureReadingStoreReady() {
  await readingBooksStore.ensureReady();
}

export function readReadingBooks() {
  return readingBooksStore.getSnapshot();
}

export function writeReadingBooks(books: ReadingEntry[], source: DatasetSource = 'app') {
  const nextBooks = readingBooksStore.write(books, source);
  void replaceReadingReferencesInCalendar(nextBooks);
}

export function addReadingBook(entry: Omit<ReadingEntry, 'id' | 'addedAt'> & { addedAt?: string }) {
  const addedAt = entry.addedAt ?? new Date().toISOString();
  const book: ReadingEntry = normalizeReadingEntry({
    ...entry,
    id: crypto.randomUUID(),
    addedAt,
  });

  writeReadingBooks([book, ...readReadingBooks()]);
  return book;
}

export function editReadingBook(
  id: string,
  updated: Partial<Omit<ReadingEntry, 'id' | 'addedAt'>>,
) {
  writeReadingBooks(readReadingBooks().map((book) => (
    book.id === id
      ? normalizeReadingEntry({
          ...book,
          ...updated,
          calendarMeta: {
            ...(book.calendarMeta ?? {}),
            date: book.calendarMeta?.date ?? getCalendarDateFromTimestamp(book.addedAt),
            syncTarget: 'reading',
          },
        })
      : book
  )));
}

export function deleteReadingBook(id: string) {
  writeReadingBooks(readReadingBooks().filter((book) => book.id !== id));
}

export function replaceReadingBooks(books: ReadingEntry[], source: DatasetSource = 'backup-import') {
  const nextBooks = readingBooksStore.replace(books, source);
  void replaceReadingReferencesInCalendar(nextBooks);
}

export function subscribeReadingStore(onSync: () => void) {
  return readingBooksStore.subscribe(onSync);
}
