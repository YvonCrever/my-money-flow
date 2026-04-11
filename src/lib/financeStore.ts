import type { Client, ExpenseEntry, RevenueEntry } from '@/types/finance';
import { APP_STORE_NAMES } from '@/lib/appStorageDb';
import { createIndexedDatasetStore } from '@/lib/indexedDatasetStore';
import {
  storedFinanceClientsSchema,
  storedFinanceExpensesSchema,
  storedFinanceRevenuesSchema,
} from '@/lib/storageSchemas';
import {
  type DatasetSource,
} from '@/types/storage';
import {
  replaceFinanceExpenseReferencesInCalendar,
  replaceFinanceReferencesInCalendar,
  replaceFinanceRevenueReferencesInCalendar,
} from '@/lib/calendarExternalReferences';

export const FINANCE_REVENUES_STORAGE_KEY = 'finance_revenues';
export const FINANCE_EXPENSES_STORAGE_KEY = 'finance_expenses';
export const FINANCE_CLIENTS_STORAGE_KEY = 'finance_clients';
export const FINANCE_STORE_EVENT = 'ycaro:finance-store-updated';

const DEFAULT_REVENUE_UNIT = 'heure' as const;

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

function getDateParts(value: string) {
  const date = new Date(value);
  return {
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

function normalizeRevenueEntry(revenue: RevenueEntry): RevenueEntry {
  const { month, year } = getDateParts(revenue.date);
  const unit = revenue.unit ?? DEFAULT_REVENUE_UNIT;

  return {
    ...revenue,
    unit,
    month,
    year,
    amount: revenue.hourlyRate * revenue.hours,
    calendarMeta: revenue.calendarMeta ?? {
      date: revenue.date,
      plannedMinutes: unit === 'heure' ? Math.round(revenue.hours * 60) : undefined,
      syncTarget: 'finance-revenue',
    },
  };
}

function normalizeExpenseEntry(expense: ExpenseEntry): ExpenseEntry {
  const { month, year } = getDateParts(expense.date);

  return {
    ...expense,
    month,
    year,
    calendarMeta: expense.calendarMeta ?? {
      date: expense.date,
      syncTarget: 'finance-expense',
    },
  };
}

function normalizeClientRecord(client: Client): Client {
  const pseudo = client.pseudo?.trim();

  return {
    ...client,
    pseudo: pseudo ? pseudo : undefined,
  };
}

let financeReadyPromise: Promise<void> | null = null;
const initialRevenueSnapshot = readLegacyCollectionSnapshot<RevenueEntry[]>(FINANCE_REVENUES_STORAGE_KEY, []);
const initialExpenseSnapshot = readLegacyCollectionSnapshot<ExpenseEntry[]>(FINANCE_EXPENSES_STORAGE_KEY, []);
const initialClientSnapshot = readLegacyCollectionSnapshot<Client[]>(FINANCE_CLIENTS_STORAGE_KEY, []);
const financeRevenuesStore = createIndexedDatasetStore<RevenueEntry[]>({
  eventName: FINANCE_STORE_EVENT,
  getInitialValue: () => initialRevenueSnapshot.value.map(normalizeRevenueEntry),
  loadLegacy: () => {
    const snapshot = readLegacyCollectionSnapshot<RevenueEntry[]>(FINANCE_REVENUES_STORAGE_KEY, []);
    return {
      ...snapshot,
      source: 'legacy-local-storage' as const,
      value: snapshot.value.map(normalizeRevenueEntry),
    };
  },
  migrationModule: 'finance',
  normalize: (revenues) => revenues.map(normalizeRevenueEntry),
  persistenceErrorLabel: 'Finance revenue persistence failed.',
  schema: storedFinanceRevenuesSchema,
  storeName: APP_STORE_NAMES.financeRevenues,
});
const financeExpensesStore = createIndexedDatasetStore<ExpenseEntry[]>({
  eventName: FINANCE_STORE_EVENT,
  getInitialValue: () => initialExpenseSnapshot.value.map(normalizeExpenseEntry),
  loadLegacy: () => {
    const snapshot = readLegacyCollectionSnapshot<ExpenseEntry[]>(FINANCE_EXPENSES_STORAGE_KEY, []);
    return {
      ...snapshot,
      source: 'legacy-local-storage' as const,
      value: snapshot.value.map(normalizeExpenseEntry),
    };
  },
  migrationModule: 'finance',
  normalize: (expenses) => expenses.map(normalizeExpenseEntry),
  persistenceErrorLabel: 'Finance expense persistence failed.',
  schema: storedFinanceExpensesSchema,
  storeName: APP_STORE_NAMES.financeExpenses,
});
const financeClientsStore = createIndexedDatasetStore<Client[]>({
  eventName: FINANCE_STORE_EVENT,
  getInitialValue: () => initialClientSnapshot.value.map(normalizeClientRecord),
  loadLegacy: () => {
    const snapshot = readLegacyCollectionSnapshot<Client[]>(FINANCE_CLIENTS_STORAGE_KEY, []);
    return {
      ...snapshot,
      source: 'legacy-local-storage' as const,
      value: snapshot.value.map(normalizeClientRecord),
    };
  },
  migrationModule: 'finance',
  normalize: (clients) => clients.map(normalizeClientRecord),
  persistenceErrorLabel: 'Finance client persistence failed.',
  schema: storedFinanceClientsSchema,
  storeName: APP_STORE_NAMES.financeClients,
});

export async function ensureFinanceStoreReady() {
  if (financeReadyPromise) {
    return financeReadyPromise;
  }

  financeReadyPromise = (async () => {
    await Promise.all([
      financeRevenuesStore.ensureReady(),
      financeExpensesStore.ensureReady(),
      financeClientsStore.ensureReady(),
    ]);
  })().catch((error) => {
    financeReadyPromise = null;
    throw error;
  });

  return financeReadyPromise;
}

export function readFinanceRevenues() {
  return financeRevenuesStore.getSnapshot();
}

export function readFinanceExpenses() {
  return financeExpensesStore.getSnapshot();
}

export function readFinanceClients() {
  return financeClientsStore.getSnapshot();
}

export function writeFinanceRevenues(revenues: RevenueEntry[]) {
  const nextRevenues = financeRevenuesStore.write(revenues);
  void replaceFinanceRevenueReferencesInCalendar(nextRevenues);
}

export function writeFinanceExpenses(expenses: ExpenseEntry[]) {
  const nextExpenses = financeExpensesStore.write(expenses);
  void replaceFinanceExpenseReferencesInCalendar(nextExpenses);
}

export function writeFinanceClients(clients: Client[]) {
  financeClientsStore.write(clients);
}

export function addRevenueRecord(entry: Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>) {
  const revenue: RevenueEntry = normalizeRevenueEntry({
    ...entry,
    id: crypto.randomUUID(),
    month: 0,
    year: 0,
    amount: 0,
  });

  writeFinanceRevenues([revenue, ...readFinanceRevenues()]);
  return revenue;
}

export function editRevenueRecord(
  id: string,
  updated: Partial<Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>>,
) {
  const nextRevenues = readFinanceRevenues().map((revenue) => {
    if (revenue.id !== id) return revenue;

    const nextDate = updated.date ?? revenue.date;
    const nextUnit = updated.unit ?? revenue.unit ?? DEFAULT_REVENUE_UNIT;
    const nextHours = updated.hours ?? revenue.hours;
    const nextHourlyRate = updated.hourlyRate ?? revenue.hourlyRate;

    return normalizeRevenueEntry({
      ...revenue,
      ...updated,
      date: nextDate,
      unit: nextUnit,
      hours: nextHours,
      hourlyRate: nextHourlyRate,
      amount: nextHourlyRate * nextHours,
      calendarMeta: {
        ...(revenue.calendarMeta ?? {}),
        date: nextDate,
        plannedMinutes: nextUnit === 'heure' ? Math.round(nextHours * 60) : revenue.calendarMeta?.plannedMinutes,
        syncTarget: 'finance-revenue',
      },
    });
  });

  writeFinanceRevenues(nextRevenues);
}

export function deleteRevenueRecord(id: string) {
  writeFinanceRevenues(readFinanceRevenues().filter((revenue) => revenue.id !== id));
}

export function addExpenseRecord(entry: Omit<ExpenseEntry, 'id' | 'month' | 'year'>) {
  const expense: ExpenseEntry = normalizeExpenseEntry({
    ...entry,
    id: crypto.randomUUID(),
    month: 0,
    year: 0,
  });

  writeFinanceExpenses([expense, ...readFinanceExpenses()]);
  return expense;
}

export function editExpenseRecord(
  id: string,
  updated: Partial<Omit<ExpenseEntry, 'id' | 'month' | 'year'>>,
) {
  const nextExpenses = readFinanceExpenses().map((expense) => (
    expense.id === id
      ? normalizeExpenseEntry({
          ...expense,
          ...updated,
          date: updated.date ?? expense.date,
          calendarMeta: {
            ...(expense.calendarMeta ?? {}),
            date: updated.date ?? expense.date,
            syncTarget: 'finance-expense',
          },
        })
      : expense
  ));

  writeFinanceExpenses(nextExpenses);
}

export function deleteExpenseRecord(id: string) {
  writeFinanceExpenses(readFinanceExpenses().filter((expense) => expense.id !== id));
}

export function addFinanceClient(client: Omit<Client, 'id'>) {
  const normalizedClient = normalizeClientRecord({
    ...client,
    id: 'pending-client-id',
  });

  const currentClients = readFinanceClients();
  if (currentClients.some((entry) => entry.name === normalizedClient.name && entry.siren === normalizedClient.siren)) {
    return null;
  }

  const nextClient: Client = {
    ...normalizedClient,
    id: crypto.randomUUID(),
  };
  writeFinanceClients([...currentClients, nextClient]);
  return nextClient;
}

export function editFinanceClient(id: string, updated: Partial<Omit<Client, 'id'>>) {
  const normalizedUpdated = 'pseudo' in updated
    ? {
        ...updated,
        pseudo: updated.pseudo?.trim() ? updated.pseudo.trim() : undefined,
      }
    : updated;

  writeFinanceClients(readFinanceClients().map((client) => (
    client.id === id ? { ...client, ...normalizedUpdated } : client
  )));
}

export function removeFinanceClient(id: string) {
  writeFinanceClients(readFinanceClients().filter((client) => client.id !== id));
}

export function replaceFinanceData(input: {
  revenues: RevenueEntry[];
  expenses: ExpenseEntry[];
  clients: Client[];
}, source: DatasetSource = 'backup-import') {
  const nextRevenues = financeRevenuesStore.replace(input.revenues, source);
  const nextExpenses = financeExpensesStore.replace(input.expenses, source);
  financeClientsStore.replace(input.clients, source);
  void replaceFinanceReferencesInCalendar({
    expenses: nextExpenses,
    revenues: nextRevenues,
  });
}

export function subscribeFinanceStore(onSync: () => void) {
  const unsubscribeRevenues = financeRevenuesStore.subscribe(onSync);
  const unsubscribeExpenses = financeExpensesStore.subscribe(onSync);

  return () => {
    unsubscribeRevenues();
    unsubscribeExpenses();
  };
}
