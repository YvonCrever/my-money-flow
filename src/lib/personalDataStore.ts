import { APP_STORE_NAMES } from '@/lib/appStorageDb';
import { createIndexedDatasetStore } from '@/lib/indexedDatasetStore';
import { storedPersonalDataSchema } from '@/lib/storageSchemas';
import {
  defaultPersonalData,
  type DatasetSource,
  type PersonalData,
} from '@/types/storage';

export const PERSONAL_DATA_STORAGE_KEY = 'personal_data';
export const PERSONAL_DATA_STORE_EVENT = 'ycaro:personal-data-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readLegacyPersonalDataSnapshot() {
  if (!canUseStorage()) {
    return {
      value: defaultPersonalData,
      hasStoredValue: false,
    };
  }

  try {
    const raw = localStorage.getItem(PERSONAL_DATA_STORAGE_KEY);
    if (!raw) {
      return {
        value: defaultPersonalData,
        hasStoredValue: false,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      value: {
        ...defaultPersonalData,
        ...(typeof parsed === 'object' && parsed ? parsed : {}),
      },
      hasStoredValue: true,
    };
  } catch {
    return {
      value: defaultPersonalData,
      hasStoredValue: false,
    };
  }
}
const initialPersonalDataSnapshot = readLegacyPersonalDataSnapshot();
const personalDataStore = createIndexedDatasetStore<PersonalData>({
  eventName: PERSONAL_DATA_STORE_EVENT,
  getInitialValue: () => initialPersonalDataSnapshot.value,
  loadLegacy: () => ({
    ...readLegacyPersonalDataSnapshot(),
    source: 'legacy-local-storage' as const,
  }),
  migrationModule: 'personalData',
  normalize: (data) => ({
    ...defaultPersonalData,
    ...data,
  }),
  persistenceErrorLabel: 'Personal data persistence failed.',
  schema: storedPersonalDataSchema,
  storeName: APP_STORE_NAMES.personalData,
});

export async function ensurePersonalDataStoreReady() {
  await personalDataStore.ensureReady();
}

export function readPersonalData() {
  return personalDataStore.getSnapshot();
}

export function writePersonalData(data: PersonalData, source: DatasetSource = 'app') {
  personalDataStore.write(data, source);
}

export function replacePersonalData(data: PersonalData, source: DatasetSource = 'backup-import') {
  personalDataStore.replace(data, source);
}

export function subscribePersonalDataStore(onSync: () => void) {
  return personalDataStore.subscribe(onSync);
}
