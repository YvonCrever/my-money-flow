import { beforeEach, describe, expect, it, vi } from 'vitest';

const readingStoreTestState = vi.hoisted(() => ({
  backupMetadata: new Map<string, unknown>(),
  notifyAppStorageMutation: vi.fn(),
  replaceReadingReferencesInCalendar: vi.fn(async () => undefined),
  storeRecords: new Map<string, unknown>(),
}));

vi.mock('@/lib/appStorageDb', () => ({
  APP_STORE_NAMES: {
    journalEntries: 'today_everyday_entries',
    appSettings: 'app_settings',
    financeRevenues: 'finance_revenues',
    financeExpenses: 'finance_expenses',
    financeClients: 'finance_clients',
    readingBooks: 'reading_books',
    calendarState: 'calendar_state',
    personalData: 'personal_data',
    invoiceSettings: 'invoice_settings',
    backupMetadata: 'backup_metadata',
  },
  getStoreRecord: vi.fn(async (storeName: string) => readingStoreTestState.storeRecords.get(storeName) ?? null),
  putStoreRecord: vi.fn(async (storeName: string, value: unknown) => {
    readingStoreTestState.storeRecords.set(storeName, value);
  }),
  getBackupMetadata: vi.fn(async (key: string) => readingStoreTestState.backupMetadata.get(key) ?? null),
  setBackupMetadata: vi.fn(async (key: string, value: unknown) => {
    readingStoreTestState.backupMetadata.set(key, value);
  }),
}));

vi.mock('@/lib/backupScheduler', () => ({
  notifyAppStorageMutation: readingStoreTestState.notifyAppStorageMutation,
}));

vi.mock('@/lib/calendarExternalReferences', () => ({
  replaceReadingReferencesInCalendar: readingStoreTestState.replaceReadingReferencesInCalendar,
}));

async function flushPersistence() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('reading store', () => {
  beforeEach(() => {
    vi.resetModules();
    readingStoreTestState.storeRecords.clear();
    readingStoreTestState.backupMetadata.clear();
    readingStoreTestState.notifyAppStorageMutation.mockReset();
    readingStoreTestState.replaceReadingReferencesInCalendar.mockReset();
    localStorage.clear();
  });

  it('hydrates and persists the reading collection without changing the public API', async () => {
    const readingStore = await import('@/lib/readingStore');

    await readingStore.ensureReadingStoreReady();

    readingStore.writeReadingBooks([
      {
        id: 'book-1',
        title: 'Le livre',
        author: 'Auteur',
        category: 'Essai',
        rating: 5,
        addedAt: '2026-04-09T10:00:00.000Z',
      },
    ]);

    await flushPersistence();

    expect(readingStore.readReadingBooks()).toHaveLength(1);
    expect(readingStore.readReadingBooks()[0]).toMatchObject({
      id: 'book-1',
      category: 'Essai',
      rating: 5,
    });
    expect(readingStoreTestState.notifyAppStorageMutation).toHaveBeenCalled();
    expect(readingStoreTestState.replaceReadingReferencesInCalendar).toHaveBeenCalledTimes(1);
  });
});
