import { JournalEntry, JournalMediaItem } from '@/types/journal';
import { wrapJournalStorageError } from '@/lib/journalStorageErrors';
import {
  APP_STORE_NAMES,
  clearStore,
  getBackupMetadata,
  openAppStorageDb,
  requestToPromise,
  setBackupMetadata,
  waitForTransaction,
} from '@/lib/appStorageDb';
import { defaultMigrationState, type MigrationState } from '@/types/storage';
import { notifyAppStorageMutation } from '@/lib/backupScheduler';
import {
  removeJournalReferenceFromCalendar,
  replaceJournalReferencesInCalendar,
  upsertJournalReferenceInCalendar,
  upsertJournalReferencesInCalendar,
} from '@/lib/calendarExternalReferences';

const LEGACY_STORAGE_KEY = 'today_everyday_entries';
export const JOURNAL_STORE_EVENT = 'ycaro:journal-store-updated';

interface LegacyMediaShape {
  name?: string;
  type?: 'image' | 'video';
  dataUrl?: string;
}

interface LegacyEntryShape {
  date: string;
  somethingNew?: string;
  somethingLearnt?: string;
  couldDoneBetter?: string;
  didWell?: string;
  moodId?: JournalEntry['moodId'];
  media?: LegacyMediaShape | null;
  mediaItems?: unknown[];
  updatedAt?: string;
}

function sortEntries(entries: JournalEntry[]) {
  return entries.slice().sort((a, b) => b.date.localeCompare(a.date));
}

function emitJournalStoreUpdate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(JOURNAL_STORE_EVENT));
}

function createMediaId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function guessMimeType(type: LegacyMediaShape['type']) {
  return type === 'video' ? 'video/mp4' : 'image/jpeg';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeStoredMediaItem(date: string, mediaItem: unknown, index: number): JournalMediaItem | null {
  if (!isRecord(mediaItem)) return null;

  const id = typeof mediaItem.id === 'string' ? mediaItem.id : createMediaId(`${date}-${index}`);
  const name = typeof mediaItem.name === 'string' && mediaItem.name.trim()
    ? mediaItem.name
    : `${date}-${index + 1}`;
  const type = mediaItem.type === 'video' ? 'video' : 'image';
  const mimeType = typeof mediaItem.mimeType === 'string' && mediaItem.mimeType
    ? mediaItem.mimeType
    : guessMimeType(type);
  const lastModified = typeof mediaItem.lastModified === 'number' ? mediaItem.lastModified : undefined;
  const source = mediaItem.source === 'import' ? 'import' : mediaItem.source === 'manual' ? 'manual' : undefined;

  if (mediaItem.storage === 'asset' && typeof mediaItem.assetId === 'string') {
    return {
      id,
      name,
      type,
      mimeType,
      storage: 'asset',
      assetId: mediaItem.assetId,
      source,
      lastModified,
      width: typeof mediaItem.width === 'number' ? mediaItem.width : undefined,
      height: typeof mediaItem.height === 'number' ? mediaItem.height : undefined,
      byteSize: typeof mediaItem.byteSize === 'number' ? mediaItem.byteSize : undefined,
    };
  }

  if (mediaItem.storage === 'handle' && 'handle' in mediaItem && mediaItem.handle) {
    return {
      id,
      name,
      type,
      mimeType,
      storage: 'handle',
      handle: mediaItem.handle as FileSystemFileHandle,
      source,
      lastModified,
    };
  }

  return {
    id,
    name,
    type,
    mimeType,
    storage: 'inline',
    blob: (mediaItem.blob ?? new Blob()) as Blob,
    source,
    lastModified,
  };
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function normalizeMediaItemsFromLegacy(media: LegacyMediaShape | null | undefined, date: string): Promise<JournalMediaItem[]> {
  if (!media?.dataUrl) return [];

  const blob = await dataUrlToBlob(media.dataUrl);

  return [{
    id: createMediaId(`legacy-${date}`),
    name: media.name ?? `${date}.${media.type === 'video' ? 'mp4' : 'jpg'}`,
    type: media.type === 'video' ? 'video' : 'image',
    mimeType: blob.type || guessMimeType(media.type),
    storage: 'inline',
    blob,
    source: 'manual',
  }];
}

async function normalizeEntry(entry: LegacyEntryShape): Promise<JournalEntry> {
  const mediaItems = Array.isArray(entry.mediaItems)
    ? entry.mediaItems
      .map((mediaItem, index) => normalizeStoredMediaItem(entry.date, mediaItem, index))
      .filter((mediaItem): mediaItem is JournalMediaItem => Boolean(mediaItem))
    : await normalizeMediaItemsFromLegacy(entry.media, entry.date);

  return {
    date: entry.date,
    somethingNew: entry.somethingNew ?? '',
    somethingLearnt: entry.somethingLearnt ?? '',
    couldDoneBetter: entry.couldDoneBetter ?? '',
    didWell: entry.didWell ?? '',
    moodId: entry.moodId ?? null,
    mediaItems,
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return openAppStorageDb().catch((error) => {
    throw wrapJournalStorageError(
      error,
      typeof indexedDB === 'undefined' ? 'unsupported' : 'unavailable',
      typeof indexedDB === 'undefined'
        ? 'Ce navigateur ne peut pas enregistrer le Journal localement.'
        : "Impossible d'ouvrir la base locale du Journal.",
    );
  });
}

function withStore<T>(mode: IDBTransactionMode, runner: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  return openDatabase().then(async (database) => {
    const transaction = database.transaction(APP_STORE_NAMES.journalEntries, mode);
    const store = transaction.objectStore(APP_STORE_NAMES.journalEntries);
    const transactionDone = waitForTransaction(transaction).catch((error) => {
      throw wrapJournalStorageError(
        error,
        'transaction',
        'Une transaction du Journal a echoue.',
      );
    });

    try {
      const result = await runner(store);
      await transactionDone;
      return result;
    } catch (error) {
      await transactionDone.catch((): void => undefined);
      throw error;
    } finally {
      database.close();
    }
  });
}

function withSettingsStore<T>(mode: IDBTransactionMode, runner: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  return openDatabase().then(async (database) => {
    const transaction = database.transaction(APP_STORE_NAMES.appSettings, mode);
    const store = transaction.objectStore(APP_STORE_NAMES.appSettings);
    const transactionDone = waitForTransaction(transaction);

    try {
      const result = await runner(store);
      await transactionDone;
      return result;
    } catch (error) {
      await transactionDone.catch((): void => undefined);
      throw error;
    } finally {
      database.close();
    }
  });
}

async function normalizeEntries(entries: LegacyEntryShape[]): Promise<JournalEntry[]> {
  const normalized = await Promise.all(entries.map((entry) => normalizeEntry(entry)));
  return sortEntries(normalized);
}

async function markJournalMigrationComplete() {
  const migrationState = (await getBackupMetadata<MigrationState>('migration_state')) ?? defaultMigrationState;
  if (migrationState.journal) return;

  await setBackupMetadata('migration_state', {
    ...migrationState,
    journal: true,
    lastMigratedAt: new Date().toISOString(),
  } satisfies MigrationState);
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  return withStore('readonly', async (store) => {
    const result = await requestToPromise<LegacyEntryShape[]>(store.getAll());
    return normalizeEntries(result ?? []);
  }).catch((error) => {
    throw wrapJournalStorageError(
      error,
      'read',
      'Impossible de relire les entrees du Journal.',
    );
  });
}

export async function putJournalEntry(entry: JournalEntry): Promise<void> {
  const normalizedEntry = await normalizeEntry(entry);

  await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(normalizedEntry));
  }).catch((error) => {
    throw wrapJournalStorageError(
      error,
      'write',
      "Impossible d'enregistrer cette entree du Journal.",
    );
  });

  await upsertJournalReferenceInCalendar(normalizedEntry);
  emitJournalStoreUpdate();
  notifyAppStorageMutation();
}

export async function bulkPutJournalEntries(entries: JournalEntry[]): Promise<void> {
  const normalizedEntries = await Promise.all(entries.map((entry) => normalizeEntry(entry)));

  await withStore('readwrite', async (store) => {
    for (const entry of normalizedEntries) {
      await requestToPromise(store.put(entry));
    }
  }).catch((error) => {
    throw wrapJournalStorageError(
      error,
      'write',
      "Impossible d'enregistrer l'import du Journal.",
    );
  });

  await upsertJournalReferencesInCalendar(normalizedEntries);
  emitJournalStoreUpdate();
  notifyAppStorageMutation();
}

export async function deleteJournalEntry(date: string): Promise<void> {
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.delete(date));
  }).catch((error) => {
    throw wrapJournalStorageError(
      error,
      'write',
      'Impossible de supprimer cette entree du Journal.',
    );
  });

  await removeJournalReferenceFromCalendar(date);
  emitJournalStoreUpdate();
  notifyAppStorageMutation();
}

export async function migrateLegacyJournalEntries(): Promise<void> {
  const migrationState = await getBackupMetadata<MigrationState>('migration_state');
  if (migrationState?.journal) {
    return;
  }

  if (typeof localStorage === 'undefined') {
    await markJournalMigrationComplete();
    return;
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) {
    await markJournalMigrationComplete();
    return;
  }

  try {
    const parsed = JSON.parse(legacy) as LegacyEntryShape[];
    if (!Array.isArray(parsed)) {
      return;
    }

    if (!parsed.length) {
      await markJournalMigrationComplete();
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    const normalizedEntries = await Promise.all(parsed.map((entry) => normalizeEntry(entry)));
    await bulkPutJournalEntries(normalizedEntries);
    await markJournalMigrationComplete();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore corrupted legacy storage and keep the current source of truth.
  }
}

export async function replaceJournalEntries(entries: JournalEntry[]): Promise<void> {
  await clearStore(APP_STORE_NAMES.journalEntries);
  await bulkPutJournalEntries(entries);

  const normalizedEntries = await Promise.all(entries.map((entry) => normalizeEntry(entry)));
  await replaceJournalReferencesInCalendar(normalizedEntries);
}

export async function setJournalSetting<T>(key: string, value: T): Promise<void> {
  await withSettingsStore('readwrite', async (store) => {
    await requestToPromise(store.put({ key, value }));
  });
}

export async function getJournalSetting<T>(key: string): Promise<T | null> {
  try {
    return withSettingsStore('readonly', async (store) => {
      const result = await requestToPromise<{ key: string; value: T } | undefined>(store.get(key));
      return result?.value ?? null;
    });
  } catch {
    return null;
  }
}

export function subscribeJournalStore(onSync: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = () => onSync();
  window.addEventListener(JOURNAL_STORE_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(JOURNAL_STORE_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}
