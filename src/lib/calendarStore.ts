import type { CalendarExternalReference, CalendarState } from '@/types/calendar';
import {
  CALENDAR_STORAGE_KEY,
  CALENDAR_STORE_EVENT,
  createDefaultCalendarState,
  normalizeCalendarState,
  sortCalendarExternalReferences,
  sortCalendarItems,
  toCalendarDateKey,
} from '@/lib/calendar';
import { APP_STORE_NAMES, getStoreRecord, putStoreRecord, getBackupMetadata, setBackupMetadata } from '@/lib/appStorageDb';
import { storedCalendarStateSchema } from '@/lib/storageSchemas';
import {
  APP_DATASET_SCHEMA_VERSION,
  defaultMigrationState,
  type DatasetSource,
  type MigrationState,
  type StoredDataset,
} from '@/types/storage';
import { notifyAppStorageMutation } from '@/lib/backupScheduler';

const SINGLETON_KEY = 'singleton';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function emitCalendarStoreUpdate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CALENDAR_STORE_EVENT));
}

function readLegacyCalendarState() {
  return readLegacyCalendarStateRecord() ?? normalizeCalendarState(null, toCalendarDateKey(new Date()));
}

function looksLikeCalendarStateRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    'items' in candidate
    || 'categories' in candidate
    || 'weekPlans' in candidate
    || 'conversions' in candidate
    || 'externalReferences' in candidate
    || 'preferences' in candidate
    || 'lastUpdatedAt' in candidate
  );
}

function readLegacyCalendarStateRecord(today = toCalendarDateKey(new Date())) {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!looksLikeCalendarStateRecord(parsed)) {
      return null;
    }

    return normalizeCalendarState(parsed, today);
  } catch {
    return null;
  }
}

function createDatasetRecord<T>(value: T, source: DatasetSource): StoredDataset<T> {
  return {
    key: SINGLETON_KEY,
    schemaVersion: APP_DATASET_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    source,
    value,
  };
}

let calendarStateCache = readLegacyCalendarState();
let calendarReadyPromise: Promise<void> | null = null;
let calendarPersistQueue: Promise<void> = Promise.resolve();
let calendarStoreReady = false;

function normalizeExternalReferenceMetricsForComparison(metrics: CalendarExternalReference['metrics']) {
  return {
    amount: metrics?.amount ?? null,
    plannedMinutes: metrics?.plannedMinutes ?? null,
    actualMinutes: metrics?.actualMinutes ?? null,
    rating: metrics?.rating ?? null,
  };
}

function normalizeExternalReferenceForComparison(reference: CalendarExternalReference) {
  return {
    id: reference.id,
    source: reference.source,
    sourceRecordId: reference.sourceRecordId,
    date: reference.date,
    title: reference.title,
    summary: reference.summary ?? null,
    categoryLabel: reference.categoryLabel ?? null,
    linkedCalendarItemId: reference.linkedCalendarItemId ?? null,
    metrics: normalizeExternalReferenceMetricsForComparison(reference.metrics),
    createdAt: reference.createdAt,
  };
}

export function areCalendarExternalReferenceSetsEquivalent(
  left: CalendarExternalReference[],
  right: CalendarExternalReference[],
) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSignature = JSON.stringify(
    sortCalendarExternalReferences(left).map((reference) => normalizeExternalReferenceForComparison(reference)),
  );
  const rightSignature = JSON.stringify(
    sortCalendarExternalReferences(right).map((reference) => normalizeExternalReferenceForComparison(reference)),
  );

  return leftSignature === rightSignature;
}

function getCalendarLastUpdatedAtValue(state: CalendarState | null) {
  if (!state?.lastUpdatedAt) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(state.lastUpdatedAt);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function resolvePreferredCalendarState(
  indexedState: CalendarState | null,
  legacyState: CalendarState | null,
  fallbackState = createDefaultCalendarState(),
): {
  state: CalendarState;
  source: DatasetSource;
  shouldPersist: boolean;
} {
  if (indexedState && legacyState) {
    if (getCalendarLastUpdatedAtValue(legacyState) > getCalendarLastUpdatedAtValue(indexedState)) {
      return {
        state: legacyState,
        source: 'legacy-local-storage',
        shouldPersist: true,
      };
    }

    return {
      state: indexedState,
      source: 'app',
      shouldPersist: false,
    };
  }

  if (indexedState) {
    return {
      state: indexedState,
      source: 'app',
      shouldPersist: false,
    };
  }

  if (legacyState) {
    return {
      state: legacyState,
      source: 'legacy-local-storage',
      shouldPersist: true,
    };
  }

  return {
    state: fallbackState,
    source: 'app',
    shouldPersist: true,
  };
}

async function markCalendarMigrationComplete() {
  const migrationState = (await getBackupMetadata<MigrationState>('migration_state')) ?? defaultMigrationState;
  if (migrationState.calendar) return;

  await setBackupMetadata('migration_state', {
    ...migrationState,
    calendar: true,
    lastMigratedAt: new Date().toISOString(),
  } satisfies MigrationState);
}

function queueCalendarPersist(source: DatasetSource = 'app') {
  const snapshot = {
    ...calendarStateCache,
    items: sortCalendarItems(calendarStateCache.items),
    externalReferences: sortCalendarExternalReferences(calendarStateCache.externalReferences),
    lastUpdatedAt: new Date().toISOString(),
  } satisfies CalendarState;

  calendarPersistQueue = calendarPersistQueue
    .catch((): void => undefined)
    .then(async () => {
      try {
        await putStoreRecord(APP_STORE_NAMES.calendarState, createDatasetRecord(snapshot, source));
        notifyAppStorageMutation();
      } catch (error) {
        console.error('Calendar persistence failed.', error);
      }
    });
}

export async function ensureCalendarStoreReady() {
  if (calendarReadyPromise) {
    return calendarReadyPromise;
  }

  calendarReadyPromise = (async () => {
    const today = toCalendarDateKey(new Date());
    const record = await getStoreRecord<unknown>(APP_STORE_NAMES.calendarState, SINGLETON_KEY);
    const parsed = storedCalendarStateSchema.safeParse(record);
    const indexedState = parsed.success
      ? normalizeCalendarState(parsed.data.value, today)
      : null;
    const legacyState = readLegacyCalendarStateRecord(today);
    const preferredState = resolvePreferredCalendarState(
      indexedState,
      legacyState,
      createDefaultCalendarState(today),
    );

    calendarStateCache = preferredState.state;

    if (preferredState.shouldPersist) {
      await putStoreRecord(
        APP_STORE_NAMES.calendarState,
        createDatasetRecord(calendarStateCache, preferredState.source),
      );
    }

    await markCalendarMigrationComplete();
    calendarStoreReady = true;
    emitCalendarStoreUpdate();
  })().catch((error) => {
    calendarReadyPromise = null;
    throw error;
  });

  return calendarReadyPromise;
}

export function readCalendarState() {
  return normalizeCalendarState(calendarStateCache, toCalendarDateKey(new Date()));
}

export function isCalendarStoreReady() {
  return calendarStoreReady;
}

export function writeCalendarState(state: CalendarState, source: DatasetSource = 'app') {
  if (!calendarStoreReady && source !== 'backup-import') {
    return readCalendarState();
  }

  calendarStateCache = {
    ...state,
    items: sortCalendarItems(state.items),
    externalReferences: sortCalendarExternalReferences(state.externalReferences),
    lastUpdatedAt: new Date().toISOString(),
  };

  queueCalendarPersist(source);
  emitCalendarStoreUpdate();

  return calendarStateCache;
}

export function updateCalendarState(updater: (state: CalendarState) => CalendarState) {
  if (!calendarStoreReady) {
    return readCalendarState();
  }

  const currentState = readCalendarState();
  const nextState = updater(currentState);

  if (nextState === currentState) {
    return currentState;
  }

  return writeCalendarState(nextState);
}

export function subscribeCalendarStore(onSync: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = () => onSync();

  window.addEventListener(CALENDAR_STORE_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(CALENDAR_STORE_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

export async function replaceCalendarExternalReferences(
  source: CalendarExternalReference['source'],
  references: CalendarExternalReference[],
) {
  try {
    await ensureCalendarStoreReady();
  } catch {
    return readCalendarState();
  }

  const nextReferences = sortCalendarExternalReferences(references);

  return updateCalendarState((state) => {
    const currentSourceReferences = sortCalendarExternalReferences(
      state.externalReferences.filter((reference) => reference.source === source),
    );

    if (areCalendarExternalReferenceSetsEquivalent(currentSourceReferences, nextReferences)) {
      return state;
    }

    return {
      ...state,
      externalReferences: [
        ...state.externalReferences.filter((reference) => reference.source !== source),
        ...nextReferences,
      ],
    };
  });
}

export function replaceCalendarData(state: CalendarState, source: DatasetSource = 'backup-import') {
  return writeCalendarState(state, source);
}
