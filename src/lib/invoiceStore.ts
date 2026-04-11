import { APP_STORE_NAMES, getBackupMetadata, setBackupMetadata } from '@/lib/appStorageDb';
import { createIndexedDatasetStore } from '@/lib/indexedDatasetStore';
import { storedInvoiceSettingsSchema } from '@/lib/storageSchemas';
import {
  defaultInvoiceSettings,
  type DatasetSource,
  type InvoiceNumbering,
  type InvoicePeriodTracking,
  type InvoiceSettings,
} from '@/types/storage';

export type InvoiceDirectoryHandle = FileSystemDirectoryHandle;

export const INVOICE_NUMBERING_KEY = 'invoice_numbering';
export const INVOICE_NUMBERING_REPAIR_2026_KEY = 'invoice_numbering_repair_2026_applied';
export const INVOICE_SETTINGS_STORE_EVENT = 'ycaro:invoice-settings-updated';

const LEGACY_INVOICE_DIRECTORY_DB = 'invoice-directory-db';
const LEGACY_INVOICE_DIRECTORY_STORE = 'handles';
const LEGACY_INVOICE_DIRECTORY_KEY = 'default-directory';
const EMPTY_INVOICE_PERIOD_TRACKING: InvoicePeriodTracking = {
  invoiceSent: false,
  paymentReceived: false,
  updatedAt: '',
};
const LEGACY_TRACKING_UPDATED_AT = '1970-01-01T00:00:00.000Z';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readLegacyInvoiceSettingsSnapshot(currentYear = new Date().getFullYear()) {
  if (!canUseStorage()) {
    return {
      value: normalizeInvoiceSettings(defaultInvoiceSettings(currentYear)),
      hasStoredValue: false,
    };
  }

  try {
    const raw = localStorage.getItem(INVOICE_NUMBERING_KEY);
    const repairApplied = localStorage.getItem(INVOICE_NUMBERING_REPAIR_2026_KEY) === 'true';
    if (!raw) {
      return {
        value: normalizeInvoiceSettings({
          ...defaultInvoiceSettings(currentYear),
          repair2026Applied: repairApplied,
        }),
        hasStoredValue: false,
      };
    }

    const parsed = JSON.parse(raw) as Partial<InvoiceNumbering>;
    if (typeof parsed.lastYear === 'number' && typeof parsed.lastNumber === 'number') {
      return {
        value: normalizeInvoiceSettings({
          numbering: {
            lastYear: parsed.lastYear,
            lastNumber: parsed.lastNumber,
          },
          repair2026Applied: repairApplied,
          invoiceTracking: {},
        }),
        hasStoredValue: true,
      };
    }
  } catch {
    return {
      value: normalizeInvoiceSettings(defaultInvoiceSettings(currentYear)),
      hasStoredValue: false,
    };
  }

  return {
    value: normalizeInvoiceSettings(defaultInvoiceSettings(currentYear)),
    hasStoredValue: false,
  };
}

function normalizeInvoiceSettings(settings: InvoiceSettings): InvoiceSettings {
  const invoiceTracking = Object.fromEntries(
    Object.entries(settings.invoiceTracking ?? {}).flatMap(([key, value]) => {
      if (!key.trim() || !value || typeof value !== 'object') {
        return [];
      }

      const trackingValue = value as Partial<InvoicePeriodTracking>;
      return [[key, {
        invoiceSent: Boolean(trackingValue.invoiceSent),
        paymentReceived: Boolean(trackingValue.paymentReceived),
        updatedAt: typeof trackingValue.updatedAt === 'string' && trackingValue.updatedAt
          ? trackingValue.updatedAt
          : LEGACY_TRACKING_UPDATED_AT,
      } satisfies InvoicePeriodTracking]];
    }),
  );

  if (!settings.repair2026Applied && settings.numbering.lastYear === 2026 && settings.numbering.lastNumber > 1) {
    return {
      numbering: {
        lastYear: 2026,
        lastNumber: 1,
      },
      repair2026Applied: true,
      invoiceTracking,
    };
  }

  return {
    numbering: {
      lastYear: settings.numbering.lastYear,
      lastNumber: Math.max(0, settings.numbering.lastNumber),
    },
    repair2026Applied: true,
    invoiceTracking,
  };
}

const initialInvoiceSettingsSnapshot = readLegacyInvoiceSettingsSnapshot();
const invoiceSettingsStore = createIndexedDatasetStore<InvoiceSettings>({
  eventName: INVOICE_SETTINGS_STORE_EVENT,
  getInitialValue: () => initialInvoiceSettingsSnapshot.value,
  loadLegacy: () => ({
    ...readLegacyInvoiceSettingsSnapshot(),
    source: 'legacy-local-storage' as const,
  }),
  migrationModule: 'invoice',
  normalize: (settings) => normalizeInvoiceSettings(settings),
  persistenceErrorLabel: 'Invoice settings persistence failed.',
  schema: storedInvoiceSettingsSchema,
  storeName: APP_STORE_NAMES.invoiceSettings,
});

function openLegacyInvoiceDirectoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = window.indexedDB.open(LEGACY_INVOICE_DIRECTORY_DB, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Impossible d’ouvrir la base legacy de dossier facture.'));
  });
}

async function migrateLegacyInvoiceDirectoryHandle() {
  const currentHandle = await getBackupMetadata<InvoiceDirectoryHandle>('invoice_directory_handle');
  if (currentHandle) return;

  try {
    const db = await openLegacyInvoiceDirectoryDb();
    const handle = await new Promise<InvoiceDirectoryHandle | null>((resolve, reject) => {
      const transaction = db.transaction(LEGACY_INVOICE_DIRECTORY_STORE, 'readonly');
      const store = transaction.objectStore(LEGACY_INVOICE_DIRECTORY_STORE);
      const request = store.get(LEGACY_INVOICE_DIRECTORY_KEY);

      request.onsuccess = () => resolve((request.result as InvoiceDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Impossible de lire le dossier legacy facture.'));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
      transaction.onabort = () => db.close();
    });

    if (handle) {
      await setBackupMetadata('invoice_directory_handle', handle);
    }
  } catch {
    // Ignore legacy directory migration failures.
  }
}

export async function ensureInvoiceStoreReady() {
  await invoiceSettingsStore.ensureReady();
  await migrateLegacyInvoiceDirectoryHandle();
}

export function readInvoiceSettings() {
  return invoiceSettingsStore.getSnapshot();
}

export function replaceInvoiceSettings(settings: InvoiceSettings, source: DatasetSource = 'backup-import') {
  invoiceSettingsStore.replace(settings, source);
}

export function getInvoiceNumbering(currentYear: number): InvoiceNumbering {
  const settings = readInvoiceSettings();
  if (!settings.numbering.lastYear) {
    return { lastYear: currentYear, lastNumber: 0 };
  }

  return settings.numbering.lastYear === currentYear
    ? settings.numbering
    : settings.numbering.lastYear > currentYear
      ? { lastYear: currentYear, lastNumber: 0 }
      : settings.numbering;
}

export function saveInvoiceNumbering(lastYear: number, lastNumber: number) {
  replaceInvoiceSettings({
    ...readInvoiceSettings(),
    numbering: {
      lastYear,
      lastNumber,
    },
    repair2026Applied: true,
  });
}

export function getNextInvoiceSequence(currentYear: number, numbering: InvoiceNumbering) {
  if (numbering.lastYear !== currentYear) {
    return 1;
  }

  return numbering.lastNumber + 1;
}

export function buildInvoiceTrackingKey(clientId: string, year: number, month: number) {
  return `${clientId}:${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getInvoiceTrackingStatus(clientId: string, year: number, month: number): InvoicePeriodTracking {
  const settings = readInvoiceSettings();
  return settings.invoiceTracking[buildInvoiceTrackingKey(clientId, year, month)] ?? EMPTY_INVOICE_PERIOD_TRACKING;
}

export function markInvoiceSent(clientId: string, year: number, month: number) {
  const settings = readInvoiceSettings();
  const key = buildInvoiceTrackingKey(clientId, year, month);
  const currentTracking = settings.invoiceTracking[key] ?? EMPTY_INVOICE_PERIOD_TRACKING;

  replaceInvoiceSettings({
    ...settings,
    invoiceTracking: {
      ...settings.invoiceTracking,
      [key]: {
        ...currentTracking,
        invoiceSent: true,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export function toggleInvoiceSent(clientId: string, year: number, month: number) {
  const settings = readInvoiceSettings();
  const key = buildInvoiceTrackingKey(clientId, year, month);
  const currentTracking = settings.invoiceTracking[key] ?? EMPTY_INVOICE_PERIOD_TRACKING;

  replaceInvoiceSettings({
    ...settings,
    invoiceTracking: {
      ...settings.invoiceTracking,
      [key]: {
        ...currentTracking,
        invoiceSent: !currentTracking.invoiceSent,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export function toggleInvoicePaymentReceived(clientId: string, year: number, month: number) {
  const settings = readInvoiceSettings();
  const key = buildInvoiceTrackingKey(clientId, year, month);
  const currentTracking = settings.invoiceTracking[key] ?? EMPTY_INVOICE_PERIOD_TRACKING;

  replaceInvoiceSettings({
    ...settings,
    invoiceTracking: {
      ...settings.invoiceTracking,
      [key]: {
        ...currentTracking,
        paymentReceived: !currentTracking.paymentReceived,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function getSavedInvoiceDirectory() {
  return getBackupMetadata<InvoiceDirectoryHandle>('invoice_directory_handle');
}

export async function saveInvoiceDirectory(handle: InvoiceDirectoryHandle) {
  await setBackupMetadata('invoice_directory_handle', handle);
}

export async function ensureDirectoryPermission(
  handle: InvoiceDirectoryHandle,
  requestIfNeeded: boolean,
) {
  if (!handle.queryPermission || !handle.requestPermission) {
    return false;
  }

  const permission = await handle.queryPermission({ mode: 'readwrite' });
  if (permission === 'granted') {
    return true;
  }

  if (!requestIfNeeded) {
    return false;
  }

  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
}

export async function chooseAndStoreInvoiceDirectory() {
  if (!supportsDirectoryPicker()) {
    return null;
  }

  const handle = await window.showDirectoryPicker!({ mode: 'readwrite' });
  const hasPermission = await ensureDirectoryPermission(handle, true);

  if (!hasPermission) {
    return null;
  }

  await saveInvoiceDirectory(handle);
  return handle;
}

export async function writePdfToInvoiceDirectory(
  pdfBlob: Blob,
  fileName: string,
  requestDirectoryIfMissing: boolean,
) {
  if (!supportsDirectoryPicker()) {
    return false;
  }

  let directoryHandle = await getSavedInvoiceDirectory();

  if (directoryHandle) {
    const hasPermission = await ensureDirectoryPermission(directoryHandle, false);
    if (!hasPermission) {
      directoryHandle = requestDirectoryIfMissing ? await chooseAndStoreInvoiceDirectory() : null;
    }
  } else if (requestDirectoryIfMissing) {
    directoryHandle = await chooseAndStoreInvoiceDirectory();
  }

  if (!directoryHandle) {
    return false;
  }

  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(pdfBlob);
  await writable.close();

  return true;
}

export function subscribeInvoiceSettingsStore(onSync: () => void) {
  return invoiceSettingsStore.subscribe(onSync);
}
