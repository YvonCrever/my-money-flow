const DB_NAME = 'ycaro-db';
const DB_VERSION = 5;

export const APP_STORE_NAMES = {
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
} as const;

export type AppStoreName = (typeof APP_STORE_NAMES)[keyof typeof APP_STORE_NAMES];

export type BackupMetadataKey =
  | 'migration_state'
  | 'last_backup_at'
  | 'backup_directory_handle'
  | 'invoice_directory_handle'
  | 'calendar_external_refs_seeded_v1';

function ensureStore(database: IDBDatabase, storeName: AppStoreName, options?: IDBObjectStoreParameters) {
  if (!database.objectStoreNames.contains(storeName)) {
    database.createObjectStore(storeName, options);
  }
}

export function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

export function openAppStorageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      ensureStore(database, APP_STORE_NAMES.journalEntries, { keyPath: 'date' });
      ensureStore(database, APP_STORE_NAMES.appSettings, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.financeRevenues, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.financeExpenses, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.financeClients, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.readingBooks, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.calendarState, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.personalData, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.invoiceSettings, { keyPath: 'key' });
      ensureStore(database, APP_STORE_NAMES.backupMetadata, { keyPath: 'key' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export function withAppStore<T>(
  storeName: AppStoreName,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return openAppStorageDb().then(async (database) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const done = waitForTransaction(transaction);

    try {
      const result = await runner(store);
      await done;
      return result;
    } finally {
      database.close();
    }
  });
}

export async function getStoreRecord<T>(
  storeName: AppStoreName,
  key: string,
): Promise<T | null> {
  return withAppStore(storeName, 'readonly', async (store) => {
    const result = await requestToPromise<T | undefined>(store.get(key));
    return result ?? null;
  });
}

export async function putStoreRecord<T>(
  storeName: AppStoreName,
  value: T,
): Promise<void> {
  await withAppStore(storeName, 'readwrite', async (store) => {
    await requestToPromise(store.put(value));
  });
}

export async function getAllStoreRecords<T>(storeName: AppStoreName): Promise<T[]> {
  return withAppStore(storeName, 'readonly', async (store) => {
    const result = await requestToPromise<T[]>(store.getAll());
    return result ?? [];
  });
}

export async function clearStore(storeName: AppStoreName): Promise<void> {
  await withAppStore(storeName, 'readwrite', async (store) => {
    await requestToPromise(store.clear());
  });
}

export async function getBackupMetadata<T>(key: BackupMetadataKey): Promise<T | null> {
  const record = await getStoreRecord<{ key: string; value: T }>(APP_STORE_NAMES.backupMetadata, key);
  return record?.value ?? null;
}

export async function setBackupMetadata<T>(key: BackupMetadataKey, value: T): Promise<void> {
  await putStoreRecord(APP_STORE_NAMES.backupMetadata, { key, value });
}
