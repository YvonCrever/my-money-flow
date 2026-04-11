import { describe, expect, it, vi, beforeEach } from 'vitest';

const datasetStoreTestState = vi.hoisted(() => ({
  backupMetadata: new Map<string, unknown>(),
  notifyAppStorageMutation: vi.fn(),
  storeRecords: new Map<string, unknown>(),
}));

vi.mock('@/lib/appStorageDb', () => ({
  getStoreRecord: vi.fn(async (storeName: string) => datasetStoreTestState.storeRecords.get(storeName) ?? null),
  putStoreRecord: vi.fn(async (storeName: string, value: unknown) => {
    datasetStoreTestState.storeRecords.set(storeName, value);
  }),
  getBackupMetadata: vi.fn(async (key: string) => datasetStoreTestState.backupMetadata.get(key) ?? null),
  setBackupMetadata: vi.fn(async (key: string, value: unknown) => {
    datasetStoreTestState.backupMetadata.set(key, value);
  }),
}));

vi.mock('@/lib/backupScheduler', () => ({
  notifyAppStorageMutation: datasetStoreTestState.notifyAppStorageMutation,
}));

import { createIndexedDatasetStore } from '@/lib/indexedDatasetStore';

function createArraySchema() {
  return {
    safeParse(value: unknown) {
      if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        return {
          success: true,
          data: value as {
            key: string;
            schemaVersion: number;
            updatedAt: string;
            source: 'app' | 'legacy-local-storage' | 'backup-import';
            value: string[];
          },
        };
      }

      return { success: false };
    },
  };
}

describe('createIndexedDatasetStore', () => {
  beforeEach(() => {
    datasetStoreTestState.storeRecords.clear();
    datasetStoreTestState.backupMetadata.clear();
    datasetStoreTestState.notifyAppStorageMutation.mockReset();
  });

  it('hydrates from legacy data when the indexed record is missing', async () => {
    const store = createIndexedDatasetStore<string[]>({
      eventName: 'test-store-updated',
      getInitialValue: () => [],
      loadLegacy: () => ({
        hasStoredValue: true,
        source: 'legacy-local-storage',
        value: ['legacy-entry'],
      }),
      migrationModule: 'reading',
      normalize: (value) => value.map((entry) => entry.toUpperCase()),
      persistenceErrorLabel: 'test persistence failed',
      schema: createArraySchema(),
      storeName: 'reading_books' as never,
    });

    await store.ensureReady();

    expect(store.getSnapshot()).toEqual(['LEGACY-ENTRY']);
    expect(datasetStoreTestState.storeRecords.get('reading_books')).toMatchObject({
      source: 'legacy-local-storage',
      value: ['LEGACY-ENTRY'],
    });
    expect(datasetStoreTestState.backupMetadata.get('migration_state')).toMatchObject({
      reading: true,
    });
  });

  it('writes snapshots and notifies listeners', async () => {
    const store = createIndexedDatasetStore<string[]>({
      eventName: 'test-store-updated',
      getInitialValue: () => ['initial'],
      migrationModule: 'reading',
      normalize: (value) => value,
      persistenceErrorLabel: 'test persistence failed',
      schema: createArraySchema(),
      storeName: 'reading_books' as never,
    });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.write(['next-entry']);
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getSnapshot()).toEqual(['next-entry']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(datasetStoreTestState.notifyAppStorageMutation).toHaveBeenCalled();

    unsubscribe();
  });
});
