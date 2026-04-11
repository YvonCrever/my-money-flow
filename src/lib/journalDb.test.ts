import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultMigrationState } from '@/types/storage';

const journalDbTestState = vi.hoisted(() => ({
  backupMetadata: new Map<string, unknown>(),
  notifyAppStorageMutation: vi.fn(),
  records: new Map<string, unknown>(),
  removeJournalReferenceFromCalendar: vi.fn(async () => undefined),
  replaceJournalReferencesInCalendar: vi.fn(async () => undefined),
  upsertJournalReferenceInCalendar: vi.fn(async () => undefined),
  upsertJournalReferencesInCalendar: vi.fn(async () => undefined),
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
  clearStore: vi.fn(async () => {
    journalDbTestState.records.clear();
  }),
  getBackupMetadata: vi.fn(async (key: string) => journalDbTestState.backupMetadata.get(key) ?? null),
  requestToPromise: vi.fn(async (request: { __run: () => Promise<unknown> }) => request.__run()),
  setBackupMetadata: vi.fn(async (key: string, value: unknown) => {
    journalDbTestState.backupMetadata.set(key, value);
  }),
  waitForTransaction: vi.fn(async () => undefined),
}));

vi.mock('@/lib/backupScheduler', () => ({
  notifyAppStorageMutation: journalDbTestState.notifyAppStorageMutation,
}));

vi.mock('@/lib/calendarExternalReferences', () => ({
  removeJournalReferenceFromCalendar: journalDbTestState.removeJournalReferenceFromCalendar,
  replaceJournalReferencesInCalendar: journalDbTestState.replaceJournalReferencesInCalendar,
  upsertJournalReferenceInCalendar: journalDbTestState.upsertJournalReferenceInCalendar,
  upsertJournalReferencesInCalendar: journalDbTestState.upsertJournalReferencesInCalendar,
}));

function installIndexedDbMock() {
  const database = {
    close: vi.fn(),
    transaction: vi.fn(() => ({
      error: null,
      objectStore: vi.fn(() => ({
        delete: vi.fn((key: string) => ({
          __run: async () => {
            journalDbTestState.records.delete(key);
            return undefined;
          },
        })),
        getAll: vi.fn(() => ({
          __run: async () => Array.from(journalDbTestState.records.values()),
        })),
        put: vi.fn((value: { date: string }) => ({
          __run: async () => {
            journalDbTestState.records.set(value.date, value);
            return value.date;
          },
        })),
      })),
    })),
  };

  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      const request: {
        error: Error | null;
        onsuccess: null | (() => void);
        onerror: null | (() => void);
        result: typeof database;
      } = {
        error: null,
        onsuccess: null,
        onerror: null,
        result: database,
      };

      queueMicrotask(() => {
        request.onsuccess?.();
      });

      return request;
    }),
  });
}

describe('journalDb migration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    journalDbTestState.backupMetadata.clear();
    journalDbTestState.records.clear();
    localStorage.clear();
    installIndexedDbMock();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      blob: async () => new Blob(['legacy-media'], { type: 'image/jpeg' }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns immediately when the journal migration is already complete', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    journalDbTestState.backupMetadata.set('migration_state', {
      ...defaultMigrationState,
      journal: true,
      lastMigratedAt: '2026-04-11T08:00:00.000Z',
    });

    const { migrateLegacyJournalEntries } = await import('@/lib/journalDb');
    await migrateLegacyJournalEntries();

    expect(getItemSpy).not.toHaveBeenCalledWith('today_everyday_entries');
  });

  it('removes the legacy source after a successful migration', async () => {
    localStorage.setItem('today_everyday_entries', JSON.stringify([
      {
        date: '2026-04-10',
        didWell: 'Sortie',
        media: {
          dataUrl: 'data:image/jpeg;base64,AAAA',
          name: 'sortie.jpg',
          type: 'image',
        },
        somethingLearnt: 'Patience',
        somethingNew: 'Balade',
        updatedAt: '2026-04-10T10:00:00.000Z',
      },
    ]));

    const { migrateLegacyJournalEntries } = await import('@/lib/journalDb');
    await migrateLegacyJournalEntries();

    expect(localStorage.getItem('today_everyday_entries')).toBeNull();
    expect(journalDbTestState.records.size).toBe(1);
    expect(journalDbTestState.upsertJournalReferencesInCalendar).toHaveBeenCalledTimes(1);
    expect(journalDbTestState.backupMetadata.get('migration_state')).toMatchObject({
      journal: true,
    });
  });

  it('keeps the legacy source untouched when migration fails', async () => {
    localStorage.setItem('today_everyday_entries', '{invalid-json');

    const { migrateLegacyJournalEntries } = await import('@/lib/journalDb');
    await migrateLegacyJournalEntries();

    expect(localStorage.getItem('today_everyday_entries')).toBe('{invalid-json');
    expect(journalDbTestState.backupMetadata.get('migration_state')).toBeUndefined();
  });
});
