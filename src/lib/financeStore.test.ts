import { beforeEach, describe, expect, it, vi } from 'vitest';

const financeStoreTestState = vi.hoisted(() => ({
  backupMetadata: new Map<string, unknown>(),
  notifyAppStorageMutation: vi.fn(),
  replaceFinanceExpenseReferencesInCalendar: vi.fn(async () => undefined),
  replaceFinanceReferencesInCalendar: vi.fn(async () => undefined),
  replaceFinanceRevenueReferencesInCalendar: vi.fn(async () => undefined),
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
  getStoreRecord: vi.fn(async (storeName: string) => financeStoreTestState.storeRecords.get(storeName) ?? null),
  putStoreRecord: vi.fn(async (storeName: string, value: unknown) => {
    financeStoreTestState.storeRecords.set(storeName, value);
  }),
  getBackupMetadata: vi.fn(async (key: string) => financeStoreTestState.backupMetadata.get(key) ?? null),
  setBackupMetadata: vi.fn(async (key: string, value: unknown) => {
    financeStoreTestState.backupMetadata.set(key, value);
  }),
}));

vi.mock('@/lib/backupScheduler', () => ({
  notifyAppStorageMutation: financeStoreTestState.notifyAppStorageMutation,
}));

vi.mock('@/lib/calendarExternalReferences', () => ({
  replaceFinanceExpenseReferencesInCalendar: financeStoreTestState.replaceFinanceExpenseReferencesInCalendar,
  replaceFinanceReferencesInCalendar: financeStoreTestState.replaceFinanceReferencesInCalendar,
  replaceFinanceRevenueReferencesInCalendar: financeStoreTestState.replaceFinanceRevenueReferencesInCalendar,
}));

async function flushPersistence() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('finance store', () => {
  beforeEach(() => {
    vi.resetModules();
    financeStoreTestState.storeRecords.clear();
    financeStoreTestState.backupMetadata.clear();
    financeStoreTestState.notifyAppStorageMutation.mockReset();
    financeStoreTestState.replaceFinanceExpenseReferencesInCalendar.mockReset();
    financeStoreTestState.replaceFinanceReferencesInCalendar.mockReset();
    financeStoreTestState.replaceFinanceRevenueReferencesInCalendar.mockReset();
    localStorage.clear();
  });

  it('hydrates and persists the finance collections without changing the public API', async () => {
    const financeStore = await import('@/lib/financeStore');

    await financeStore.ensureFinanceStoreReady();

    financeStore.writeFinanceClients([
      {
        id: 'client-1',
        name: 'Alice',
        address: 'Paris',
        siren: '123456789',
        email: 'alice@example.com',
      },
    ]);
    financeStore.writeFinanceRevenues([
      {
        id: 'rev-1',
        date: '2026-04-01',
        client: 'Alice',
        service: 'Mission',
        unit: 'heure',
        hourlyRate: 120,
        hours: 2,
        amount: 240,
        month: 3,
        year: 2026,
      },
    ]);
    financeStore.writeFinanceExpenses([
      {
        id: 'exp-1',
        date: '2026-04-02',
        category: 'Transport',
        description: 'Train',
        amount: 45,
        isRecurring: false,
        month: 3,
        year: 2026,
      },
    ]);

    await flushPersistence();

    expect(financeStore.readFinanceClients()).toHaveLength(1);
    expect(financeStore.readFinanceRevenues()[0]).toMatchObject({
      id: 'rev-1',
      amount: 240,
      month: 3,
      year: 2026,
    });
    expect(financeStore.readFinanceExpenses()[0]).toMatchObject({
      id: 'exp-1',
      category: 'Transport',
    });
    expect(financeStoreTestState.notifyAppStorageMutation).toHaveBeenCalled();
    expect(financeStoreTestState.replaceFinanceRevenueReferencesInCalendar).toHaveBeenCalledTimes(1);
    expect(financeStoreTestState.replaceFinanceExpenseReferencesInCalendar).toHaveBeenCalledTimes(1);
  });
});
