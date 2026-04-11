import { APP_DATASET_SCHEMA_VERSION, defaultMigrationState, type DatasetSource, type MigrationModule, type MigrationState, type StoredDataset } from '@/types/storage';

import { notifyAppStorageMutation } from '@/lib/backupScheduler';
import { getBackupMetadata, getStoreRecord, putStoreRecord, setBackupMetadata, type AppStoreName } from '@/lib/appStorageDb';

interface LegacyDatasetLoadResult<T> {
  hasStoredValue: boolean;
  source?: DatasetSource;
  value: T;
}

interface IndexedDatasetSchema {
  safeParse: (value: unknown) => { success: boolean; data?: { value: unknown } };
}

interface CreateIndexedDatasetStoreOptions<T> {
  eventName: string;
  getInitialValue: () => T;
  loadLegacy?: () => LegacyDatasetLoadResult<T> | Promise<LegacyDatasetLoadResult<T>>;
  migrationModule?: MigrationModule;
  normalize?: (value: T) => T;
  persistenceErrorLabel: string;
  schema: IndexedDatasetSchema;
  storeName: AppStoreName;
}

export interface IndexedDatasetStore<T> {
  ensureReady: () => Promise<T>;
  getSnapshot: () => T;
  isReady: () => boolean;
  migrateLegacy: () => Promise<T>;
  replace: (value: T, source?: DatasetSource) => T;
  subscribe: (onSync: () => void) => () => void;
  write: (value: T, source?: DatasetSource) => T;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function createDatasetRecord<T>(value: T, source: DatasetSource): StoredDataset<T> {
  return {
    key: 'singleton',
    schemaVersion: APP_DATASET_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    source,
    value,
  };
}

export function createIndexedDatasetStore<T>({
  eventName,
  getInitialValue,
  loadLegacy,
  migrationModule,
  normalize,
  persistenceErrorLabel,
  schema,
  storeName,
}: CreateIndexedDatasetStoreOptions<T>): IndexedDatasetStore<T> {
  const normalizeValue = (value: T) => normalize ? normalize(cloneValue(value)) : cloneValue(value);
  let cache = normalizeValue(getInitialValue());
  const listeners = new Set<() => void>();
  const pendingPersists: Array<{ snapshot: T; source: DatasetSource }> = [];
  let persistQueue: Promise<void> | null = null;
  let ready = false;
  let readyPromise: Promise<T> | null = null;

  const emitStoreUpdate = () => {
    listeners.forEach((listener) => listener());

    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventName));
  };

  const markMigrationComplete = async () => {
    if (!migrationModule) return;

    const migrationState = (await getBackupMetadata<MigrationState>('migration_state')) ?? defaultMigrationState;
    if (migrationState[migrationModule]) return;

    await setBackupMetadata('migration_state', {
      ...migrationState,
      [migrationModule]: true,
      lastMigratedAt: new Date().toISOString(),
    } satisfies MigrationState);
  };

  const flushPersistQueue = async () => {
    while (pendingPersists.length > 0) {
      const nextPersist = pendingPersists.shift();
      if (!nextPersist) continue;

      try {
        await putStoreRecord(storeName, createDatasetRecord(nextPersist.snapshot, nextPersist.source));
        notifyAppStorageMutation();
      } catch (error) {
        console.error(persistenceErrorLabel, error);
      }
    }
  };

  const startPersistQueue = () => {
    if (persistQueue) return;

    persistQueue = flushPersistQueue().finally(() => {
      persistQueue = null;

      if (pendingPersists.length > 0) {
        startPersistQueue();
      }
    });
  };

  const queuePersist = (source: DatasetSource) => {
    pendingPersists.push({
      snapshot: normalizeValue(cache),
      source,
    });

    startPersistQueue();
  };

  const hydrateFromIndexedOrLegacy = async () => {
    const record = await getStoreRecord<unknown>(storeName, 'singleton');
    const parsed = schema.safeParse(record);

    if (parsed.success && parsed.data) {
      cache = normalizeValue(parsed.data.value as T);
    } else if (loadLegacy) {
      const legacy = await loadLegacy();
      cache = normalizeValue(legacy.value);
      await putStoreRecord(
        storeName,
        createDatasetRecord(cache, legacy.hasStoredValue ? legacy.source ?? 'legacy-local-storage' : 'app'),
      );
    } else {
      cache = normalizeValue(cache);
      await putStoreRecord(storeName, createDatasetRecord(cache, 'app'));
    }

    await markMigrationComplete();
    ready = true;
    emitStoreUpdate();

    return normalizeValue(cache);
  };

  return {
    ensureReady: async () => {
      if (readyPromise) {
        return readyPromise;
      }

      readyPromise = hydrateFromIndexedOrLegacy().catch((error) => {
        readyPromise = null;
        throw error;
      });

      return readyPromise;
    },
    getSnapshot: () => normalizeValue(cache),
    isReady: () => ready,
    migrateLegacy: async () => {
      return hydrateFromIndexedOrLegacy();
    },
    replace: (value, source = 'backup-import') => {
      cache = normalizeValue(value);
      queuePersist(source);
      emitStoreUpdate();
      return normalizeValue(cache);
    },
    subscribe: (onSync) => {
      listeners.add(onSync);

      const handleChange = () => onSync();
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', handleChange);
      }

      return () => {
        listeners.delete(onSync);
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleChange);
        }
      };
    },
    write: (value, source = 'app') => {
      cache = normalizeValue(value);
      queuePersist(source);
      emitStoreUpdate();
      return normalizeValue(cache);
    },
  };
}
