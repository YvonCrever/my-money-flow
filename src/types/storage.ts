import type { CalendarState } from '@/types/calendar';
import type { Client, ExpenseEntry, RevenueEntry } from '@/types/finance';
import type { ReadingEntry } from '@/types/reading';

export const APP_DATASET_SCHEMA_VERSION = 1;
export const APP_BACKUP_VERSION = 'app-backup-v1';

export type DatasetSource = 'app' | 'legacy-local-storage' | 'backup-import';

export interface StoredDataset<T> {
  key: string;
  schemaVersion: number;
  updatedAt: string;
  source: DatasetSource;
  value: T;
}

export interface PersonalData {
  companyName: string;
  address: string;
  city: string;
  siret: string;
  email: string;
  phone: string;
  bic: string;
  iban: string;
}

export const defaultPersonalData: PersonalData = {
  companyName: '',
  address: '',
  city: '',
  siret: '',
  email: '',
  phone: '',
  bic: '',
  iban: '',
};

export interface InvoiceNumbering {
  lastYear: number;
  lastNumber: number;
}

export interface InvoicePeriodTracking {
  invoiceSent: boolean;
  paymentReceived: boolean;
  updatedAt: string;
}

export interface InvoiceSettings {
  numbering: InvoiceNumbering;
  repair2026Applied: boolean;
  invoiceTracking: Record<string, InvoicePeriodTracking>;
}

export const defaultInvoiceSettings = (currentYear = new Date().getFullYear()): InvoiceSettings => ({
  numbering: {
    lastYear: currentYear,
    lastNumber: 0,
  },
  repair2026Applied: false,
  invoiceTracking: {},
});

export interface FinanceBackupValue {
  revenues: RevenueEntry[];
  expenses: ExpenseEntry[];
  clients: Client[];
}

export interface JournalBackupMediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  mimeType: string;
  lastModified?: number;
  source?: 'manual' | 'import';
  dataUrl: string;
}

export interface JournalBackupEntry {
  date: string;
  somethingNew: string;
  somethingLearnt: string;
  couldDoneBetter: string;
  didWell: string;
  moodId: string | null;
  updatedAt: string;
  mediaItems: JournalBackupMediaItem[];
  calendarMeta?: {
    date: string;
    linkedCalendarItemId?: string | null;
    plannedMinutes?: number;
    actualMinutes?: number;
    syncTarget?: 'finance-revenue' | 'finance-expense' | 'reading' | 'journal' | null;
  };
}

export interface AppBackupStats {
  revenuesCount: number;
  expensesCount: number;
  clientsCount: number;
  readingBooksCount: number;
  calendarItemsCount: number;
  journalEntriesCount: number;
  journalMediaCount: number;
}

export interface AppBackupDatasets {
  finance: StoredDataset<FinanceBackupValue>;
  reading: StoredDataset<ReadingEntry[]>;
  calendar: StoredDataset<CalendarState>;
  journal: StoredDataset<JournalBackupEntry[]>;
  personalData: StoredDataset<PersonalData>;
  invoiceSettings: StoredDataset<InvoiceSettings>;
}

export interface AppBackupEnvelopeV1 {
  version: typeof APP_BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  datasets: AppBackupDatasets;
  stats: AppBackupStats;
}

export type MigrationModule =
  | 'finance'
  | 'reading'
  | 'calendar'
  | 'personalData'
  | 'invoice'
  | 'journal';

export interface MigrationState {
  finance: boolean;
  reading: boolean;
  calendar: boolean;
  personalData: boolean;
  invoice: boolean;
  journal: boolean;
  lastMigratedAt: string | null;
}

export const defaultMigrationState: MigrationState = {
  finance: false,
  reading: false,
  calendar: false,
  personalData: false,
  invoice: false,
  journal: false,
  lastMigratedAt: null,
};

export interface StorageHealth {
  migrationStatus: 'pending' | 'partial' | 'ready';
  autoBackupAvailable: boolean;
  lastBackupAt: string | null;
  persistenceGranted: boolean | null;
  browserSupport: 'full' | 'partial' | 'unsupported';
}
