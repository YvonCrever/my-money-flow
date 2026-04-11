import { APP_DATASET_SCHEMA_VERSION, APP_BACKUP_VERSION, defaultMigrationState, type AppBackupEnvelopeV1, type AppBackupStats, type JournalBackupEntry, type JournalBackupMediaItem, type StorageHealth } from '@/types/storage';
import { appBackupEnvelopeSchema } from '@/lib/storageSchemas';
import { readFinanceClients, readFinanceExpenses, readFinanceRevenues, replaceFinanceData, ensureFinanceStoreReady } from '@/lib/financeStore';
import { readReadingBooks, replaceReadingBooks, ensureReadingStoreReady } from '@/lib/readingStore';
import { ensureCalendarStoreReady, readCalendarState, replaceCalendarData } from '@/lib/calendarStore';
import { ensurePersonalDataStoreReady, readPersonalData, replacePersonalData } from '@/lib/personalDataStore';
import {
  chooseAndStoreInvoiceDirectory,
  ensureInvoiceStoreReady,
  getSavedInvoiceDirectory,
  readInvoiceSettings,
  replaceInvoiceSettings,
  supportsDirectoryPicker as supportsInvoiceDirectoryPicker,
} from '@/lib/invoiceStore';
import {
  getBackupMetadata,
  setBackupMetadata,
} from '@/lib/appStorageDb';
import {
  getJournalEntries,
  migrateLegacyJournalEntries,
  replaceJournalEntries,
} from '@/lib/journalDb';
import { readAssetBlob } from '@/lib/journalAssetStorage';
import {
  ensureHandleReadPermission,
  isJournalUsableInlineMediaItem,
} from '@/lib/journalMedia';
import type { JournalEntry, JournalMediaItem } from '@/types/journal';
import { registerAutoBackupHandler } from '@/lib/backupScheduler';

type BackupDirectoryHandle = Awaited<ReturnType<typeof getSavedInvoiceDirectory>>;
type RestoreDataset = keyof AppBackupEnvelopeV1['datasets'];
type BackupIntent = 'manual' | 'auto';

interface BackupSerializationOptions {
  includeJournalMediaPayloads: boolean;
}

interface BackupEnvelopeOptions extends BackupSerializationOptions {
  intent: BackupIntent;
}

interface SerializeAppBackupOptions extends BackupSerializationOptions {
  pretty?: boolean;
}

const AUTO_BACKUP_FILE_NAME = 'ycaro-backup-latest.json';
const AUTO_BACKUP_DEBOUNCE_MS = 1600;
const AUTO_BACKUP_ERROR_LOG_PREFIX = '[app-backup:auto]';
const AUTO_BACKUP_ENABLED = false;

let autoBackupTimeout: number | null = null;
let autoBackupInitialized = false;

export function isAutoBackupEnabled() {
  return AUTO_BACKUP_ENABLED;
}

function isAutoBackupRuntimeEnabled() {
  return AUTO_BACKUP_ENABLED && !import.meta.env.DEV;
}

function createStoredDataset<T>(value: T) {
  return {
    key: 'backup',
    schemaVersion: APP_DATASET_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    source: 'app' as const,
    value,
  };
}

function getAppVersion() {
  return import.meta.env.VITE_APP_VERSION ?? import.meta.env.MODE ?? 'local-dev';
}

function isChromiumDesktop() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return /(Chrome|Chromium|Edg)\//.test(userAgent) && !/Android|iPhone|iPad/i.test(userAgent);
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Impossible de convertir le blob en data URL.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function resolveMediaBlob(mediaItem: JournalMediaItem) {
  const mediaItemName = mediaItem.name;

  if (mediaItem.storage === 'asset') {
    return readAssetBlob(mediaItem.assetId);
  }

  if (mediaItem.storage === 'handle') {
    const hasPermission = await ensureHandleReadPermission(mediaItem.handle);
    if (!hasPermission) {
      throw new Error(`Permission de lecture manquante pour ${mediaItem.name}.`);
    }
    return mediaItem.handle.getFile();
  }

  if (isJournalUsableInlineMediaItem(mediaItem)) {
    return mediaItem.blob;
  }

  throw new Error(`Media journal introuvable ou corrompu: ${mediaItemName}.`);
}

async function serializeJournalMediaItem(mediaItem: JournalMediaItem): Promise<JournalBackupMediaItem> {
  const blob = await resolveMediaBlob(mediaItem);
  return {
    id: mediaItem.id,
    name: mediaItem.name,
    type: mediaItem.type,
    mimeType: mediaItem.mimeType,
    lastModified: mediaItem.lastModified,
    source: mediaItem.source,
    dataUrl: await blobToDataUrl(blob),
  };
}

export async function serializeJournalEntryForBackup(
  entry: JournalEntry,
  options: BackupSerializationOptions,
): Promise<JournalBackupEntry> {
  const mediaItems = options.includeJournalMediaPayloads
    ? await Promise.all(entry.mediaItems.map((mediaItem) => serializeJournalMediaItem(mediaItem)))
    : [];

  return {
    date: entry.date,
    somethingNew: entry.somethingNew,
    somethingLearnt: entry.somethingLearnt,
    couldDoneBetter: entry.couldDoneBetter,
    didWell: entry.didWell,
    moodId: entry.moodId,
    updatedAt: entry.updatedAt,
    mediaItems,
    calendarMeta: entry.calendarMeta,
  };
}

async function deserializeJournalEntry(entry: JournalBackupEntry): Promise<JournalEntry> {
  const mediaItems = await Promise.all(entry.mediaItems.map(async (mediaItem) => ({
    id: mediaItem.id,
    name: mediaItem.name,
    type: mediaItem.type,
    mimeType: mediaItem.mimeType,
    storage: 'inline' as const,
    blob: await dataUrlToBlob(mediaItem.dataUrl),
    lastModified: mediaItem.lastModified,
    source: mediaItem.source,
  })));

  return {
    date: entry.date,
    somethingNew: entry.somethingNew,
    somethingLearnt: entry.somethingLearnt,
    couldDoneBetter: entry.couldDoneBetter,
    didWell: entry.didWell,
    moodId: entry.moodId as JournalEntry['moodId'],
    updatedAt: entry.updatedAt,
    mediaItems,
    calendarMeta: entry.calendarMeta,
  };
}

export function buildBackupStats(backup: Pick<AppBackupEnvelopeV1, 'datasets'>): AppBackupStats {
  const journalMediaCount = backup.datasets.journal.value.reduce((sum, entry) => sum + entry.mediaItems.length, 0);

  return {
    revenuesCount: backup.datasets.finance.value.revenues.length,
    expensesCount: backup.datasets.finance.value.expenses.length,
    clientsCount: backup.datasets.finance.value.clients.length,
    readingBooksCount: backup.datasets.reading.value.length,
    calendarItemsCount: backup.datasets.calendar.value.items.length,
    journalEntriesCount: backup.datasets.journal.value.length,
    journalMediaCount,
  };
}

async function ensureAllPrimaryStoresReady() {
  await Promise.all([
    ensureFinanceStoreReady(),
    ensureReadingStoreReady(),
    ensureCalendarStoreReady(),
    ensurePersonalDataStoreReady(),
    ensureInvoiceStoreReady(),
    migrateLegacyJournalEntries(),
  ]);
}

function getBackupSerializationOptions(intent: BackupIntent): BackupEnvelopeOptions {
  return {
    intent,
    includeJournalMediaPayloads: intent === 'manual',
  };
}

export async function createAppBackupEnvelope(
  options: BackupEnvelopeOptions = getBackupSerializationOptions('manual'),
): Promise<AppBackupEnvelopeV1> {
  await ensureAllPrimaryStoresReady();

  const [journalEntries] = await Promise.all([
    getJournalEntries(),
  ]);

  const datasets = {
    finance: createStoredDataset({
      revenues: readFinanceRevenues(),
      expenses: readFinanceExpenses(),
      clients: readFinanceClients(),
    }),
    reading: createStoredDataset(readReadingBooks()),
    calendar: createStoredDataset(readCalendarState()),
    journal: createStoredDataset(await Promise.all(
      journalEntries.map((entry) => serializeJournalEntryForBackup(entry, options)),
    )),
    personalData: createStoredDataset(readPersonalData()),
    invoiceSettings: createStoredDataset(readInvoiceSettings()),
  } satisfies AppBackupEnvelopeV1['datasets'];

  const envelope: AppBackupEnvelopeV1 = {
    version: APP_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    datasets,
    stats: buildBackupStats({ datasets }),
  };

  return envelope;
}

export async function serializeAppBackup(
  options: SerializeAppBackupOptions = { includeJournalMediaPayloads: true, pretty: true },
) {
  const backup = await createAppBackupEnvelope({
    intent: options.includeJournalMediaPayloads ? 'manual' : 'auto',
    includeJournalMediaPayloads: options.includeJournalMediaPayloads,
  });
  return JSON.stringify(backup, null, options.pretty !== false ? 2 : 0);
}

function triggerDownload(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadManualBackup() {
  const backupText = await serializeAppBackup({
    includeJournalMediaPayloads: true,
    pretty: true,
  });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  triggerDownload(`ycaro-backup-${stamp}.json`, backupText);
  return backupText;
}

async function writeBackupToDirectory(directoryHandle: NonNullable<BackupDirectoryHandle>, fileName: string, text: string) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([text], { type: 'application/json' }));
  await writable.close();
}

export async function chooseAndStoreBackupDirectory() {
  if (!supportsInvoiceDirectoryPicker()) {
    return null;
  }

  const handle = await chooseAndStoreInvoiceDirectory();
  if (handle) {
    await setBackupMetadata('backup_directory_handle', handle);
  }
  return handle;
}

export async function getSavedBackupDirectory() {
  return getBackupMetadata<NonNullable<BackupDirectoryHandle>>('backup_directory_handle');
}

async function getEffectiveBackupDirectory() {
  const explicitBackupHandle = await getSavedBackupDirectory();
  if (explicitBackupHandle) {
    return explicitBackupHandle;
  }

  return getSavedInvoiceDirectory();
}

async function persistBackupTimestamp(isoDate: string) {
  await setBackupMetadata('last_backup_at', isoDate);
}

export async function runAutoBackupNow() {
  const directoryHandle = await getEffectiveBackupDirectory();
  if (!directoryHandle) {
    return false;
  }

  const backupText = await serializeAppBackup({
    includeJournalMediaPayloads: false,
    pretty: true,
  });
  await writeBackupToDirectory(directoryHandle, AUTO_BACKUP_FILE_NAME, backupText);
  await persistBackupTimestamp(new Date().toISOString());
  return true;
}

export async function runAutoBackupNowSafely(runBackup: () => Promise<boolean> = runAutoBackupNow) {
  try {
    return await runBackup();
  } catch (error) {
    console.error(`${AUTO_BACKUP_ERROR_LOG_PREFIX} backup failed`, error);
    return false;
  }
}

function scheduleAutoBackup() {
  if (typeof window === 'undefined') return;
  if (!isAutoBackupRuntimeEnabled()) return;
  if (!supportsInvoiceDirectoryPicker()) return;

  if (autoBackupTimeout !== null) {
    window.clearTimeout(autoBackupTimeout);
  }

  autoBackupTimeout = window.setTimeout(() => {
    autoBackupTimeout = null;
    void runAutoBackupNowSafely();
  }, AUTO_BACKUP_DEBOUNCE_MS);
}

export function initializeAppBackupScheduler() {
  if (autoBackupInitialized) return;
  autoBackupInitialized = true;

  if (!isAutoBackupRuntimeEnabled()) {
    registerAutoBackupHandler(() => undefined);
    if (autoBackupTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(autoBackupTimeout);
      autoBackupTimeout = null;
    }
    return;
  }

  registerAutoBackupHandler(scheduleAutoBackup);
}

export function parseAppBackupText(text: string): AppBackupEnvelopeV1 {
  const raw = JSON.parse(text);
  return appBackupEnvelopeSchema.parse(raw) as AppBackupEnvelopeV1;
}

export async function restoreAppBackup(
  backup: AppBackupEnvelopeV1,
  datasets: RestoreDataset[] = ['finance', 'reading', 'calendar', 'journal', 'personalData', 'invoiceSettings'],
) {
  const requested = new Set(datasets);

  if (requested.has('finance')) {
    replaceFinanceData(backup.datasets.finance.value, 'backup-import');
  }

  if (requested.has('reading')) {
    replaceReadingBooks(backup.datasets.reading.value, 'backup-import');
  }

  if (requested.has('calendar')) {
    replaceCalendarData(backup.datasets.calendar.value, 'backup-import');
  }

  if (requested.has('journal')) {
    const restoredEntries = await Promise.all(backup.datasets.journal.value.map((entry) => deserializeJournalEntry(entry)));
    await replaceJournalEntries(restoredEntries);
  }

  if (requested.has('personalData')) {
    replacePersonalData(backup.datasets.personalData.value, 'backup-import');
  }

  if (requested.has('invoiceSettings')) {
    replaceInvoiceSettings(backup.datasets.invoiceSettings.value, 'backup-import');
  }
}

function resolveMigrationStatus(migrationState: typeof defaultMigrationState): StorageHealth['migrationStatus'] {
  const flags = [
    migrationState.finance,
    migrationState.reading,
    migrationState.calendar,
    migrationState.personalData,
    migrationState.invoice,
    migrationState.journal,
  ];

  if (flags.every(Boolean)) return 'ready';
  if (flags.some(Boolean)) return 'partial';
  return 'pending';
}

async function getPersistenceGranted() {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return null;
  }

  if ('persisted' in navigator.storage && typeof navigator.storage.persisted === 'function') {
    try {
      return await navigator.storage.persisted();
    } catch {
      return null;
    }
  }

  return null;
}

export async function getStorageHealth(): Promise<StorageHealth> {
  await ensureAllPrimaryStoresReady();

  const [migrationState, lastBackupAt, persistenceGranted] = await Promise.all([
    getBackupMetadata<typeof defaultMigrationState>('migration_state'),
    getBackupMetadata<string>('last_backup_at'),
    getPersistenceGranted(),
  ]);

  return {
    migrationStatus: resolveMigrationStatus(migrationState ?? defaultMigrationState),
    autoBackupAvailable: supportsInvoiceDirectoryPicker(),
    lastBackupAt,
    persistenceGranted,
    browserSupport: typeof indexedDB === 'undefined'
      ? 'unsupported'
      : isChromiumDesktop() && supportsInvoiceDirectoryPicker()
        ? 'full'
        : 'partial',
  };
}
