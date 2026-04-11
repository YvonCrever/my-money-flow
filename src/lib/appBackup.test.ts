import { describe, expect, it, vi } from 'vitest';
import {
  buildBackupStats,
  isAutoBackupEnabled,
  parseAppBackupText,
  runAutoBackupNowSafely,
  serializeJournalEntryForBackup,
} from '@/lib/appBackup';
import { APP_BACKUP_VERSION, type AppBackupEnvelopeV1 } from '@/types/storage';
import type { JournalEntry } from '@/types/journal';

function createBackupFixture(): AppBackupEnvelopeV1 & { stats: ReturnType<typeof buildBackupStats> } {
  return {
    version: APP_BACKUP_VERSION,
    createdAt: '2026-03-30T10:00:00.000Z',
    appVersion: 'test',
    datasets: {
      finance: {
        key: 'backup',
        schemaVersion: 1,
        updatedAt: '2026-03-30T10:00:00.000Z',
        source: 'app',
        value: {
          revenues: [{
            id: 'rev-1',
            date: '2026-03-10',
            client: 'Client A',
            service: 'Mission',
            unit: 'heure',
            hourlyRate: 100,
            hours: 2,
            amount: 200,
            month: 2,
            year: 2026,
            calendarMeta: {
              date: '2026-03-10',
              syncTarget: 'finance-revenue',
            },
          }],
          expenses: [{
            id: 'exp-1',
            date: '2026-03-11',
            category: 'Autres',
            description: 'Achat',
            amount: 20,
            isRecurring: false,
            month: 2,
            year: 2026,
            calendarMeta: {
              date: '2026-03-11',
              syncTarget: 'finance-expense',
            },
          }],
          clients: [{
            id: 'client-1',
            name: 'Client A',
            pseudo: 'Alias A',
            address: 'Paris',
            siren: '123456789',
            email: 'client@example.com',
          }],
        },
      },
      reading: {
        key: 'backup',
        schemaVersion: 1,
        updatedAt: '2026-03-30T10:00:00.000Z',
        source: 'app',
        value: [{
          id: 'book-1',
          title: 'Livre',
          author: 'Auteur',
          category: 'Essai',
          rating: 4,
          addedAt: '2026-03-05T12:00:00.000Z',
          calendarMeta: {
            date: '2026-03-05',
            syncTarget: 'reading',
          },
        }],
      },
      calendar: {
        key: 'backup',
        schemaVersion: 1,
        updatedAt: '2026-03-30T10:00:00.000Z',
        source: 'app',
        value: {
          schemaVersion: 3,
          categories: [{
            id: 'admin',
            name: 'Admin',
            description: 'Organisation',
            color: '#64748B',
            icon: 'FolderCog',
            targetHoursPerWeek: 0,
            defaultSyncTarget: null,
            isRevenueCategory: false,
            financeClientId: null,
            hourlyRate: null,
          }],
          items: [{
            id: 'item-1',
            title: 'Tâche',
            description: '',
            date: '2026-03-10',
            startTime: null,
            endTime: null,
            plannedMinutes: 60,
            actualMinutes: 0,
            categoryId: 'admin',
            status: 'todo',
            priority: 'medium',
            scope: 'week',
            syncTarget: null,
            linkedRecordId: null,
            checklist: [],
            tags: [],
            position: 0,
            createdAt: '2026-03-10T10:00:00.000Z',
            updatedAt: '2026-03-10T10:00:00.000Z',
            completedAt: null,
          }],
          weekPlans: [],
          conversions: [],
          externalReferences: [],
          preferences: {
            activeView: 'week',
            selectedDate: '2026-03-10',
            showCompleted: true,
            density: 'comfortable',
          },
          lastUpdatedAt: '2026-03-30T10:00:00.000Z',
        },
      },
      journal: {
        key: 'backup',
        schemaVersion: 1,
        updatedAt: '2026-03-30T10:00:00.000Z',
        source: 'app',
        value: [{
          date: '2026-03-09',
          somethingNew: 'Nouveau',
          somethingLearnt: 'Leçon',
          couldDoneBetter: 'Mieux',
          didWell: 'Bien',
          moodId: null,
          updatedAt: '2026-03-09T22:00:00.000Z',
          mediaItems: [{
            id: 'media-1',
            name: 'image.jpg',
            type: 'image',
            mimeType: 'image/jpeg',
            dataUrl: 'data:image/jpeg;base64,ZmFrZQ==',
          }],
          calendarMeta: {
            date: '2026-03-09',
            syncTarget: 'journal',
          },
        }],
      },
      personalData: {
        key: 'backup',
        schemaVersion: 1,
        updatedAt: '2026-03-30T10:00:00.000Z',
        source: 'app',
        value: {
          companyName: 'Ycaro',
          address: 'Rue',
          city: 'Paris',
          siret: '123',
          email: 'hello@example.com',
          phone: '0102030405',
          bic: 'ABC',
          iban: 'FR00',
        },
      },
      invoiceSettings: {
        key: 'backup',
        schemaVersion: 1,
        updatedAt: '2026-03-30T10:00:00.000Z',
        source: 'app',
        value: {
          numbering: {
            lastYear: 2026,
            lastNumber: 4,
          },
          repair2026Applied: true,
          invoiceTracking: {
            'client-1:2026-03': {
              invoiceSent: true,
              paymentReceived: false,
              updatedAt: '2026-03-30T10:00:00.000Z',
            },
          },
        },
      },
    },
    stats: {
      revenuesCount: 1,
      expensesCount: 1,
      clientsCount: 1,
      readingBooksCount: 1,
      calendarItemsCount: 1,
      journalEntriesCount: 1,
      journalMediaCount: 1,
    },
  };
}

describe('app backup', () => {
  it('computes consistent stats from datasets', () => {
    const backup = createBackupFixture();

    expect(buildBackupStats({ datasets: backup.datasets })).toEqual(backup.stats);
  });

  it('validates the backup envelope format', () => {
    const backup = createBackupFixture();

    expect(parseAppBackupText(JSON.stringify(backup))).toEqual(backup);
  });

  it('keeps legacy invoice settings backups compatible when tracking is missing', () => {
    const backup = createBackupFixture();
    const legacyBackup = {
      ...backup,
      datasets: {
        ...backup.datasets,
        invoiceSettings: {
          ...backup.datasets.invoiceSettings,
          value: {
            numbering: backup.datasets.invoiceSettings.value.numbering,
            repair2026Applied: backup.datasets.invoiceSettings.value.repair2026Applied,
          },
        },
      },
    };

    const parsed = parseAppBackupText(JSON.stringify(legacyBackup));

    expect(parsed.datasets.invoiceSettings.value.invoiceTracking).toEqual({});
  });

  it('keeps journal media payloads in manual backups', async () => {
    const journalEntry: JournalEntry = {
      date: '2026-03-09',
      somethingNew: 'Nouveau',
      somethingLearnt: 'Leçon',
      couldDoneBetter: 'Mieux',
      didWell: 'Bien',
      moodId: null,
      updatedAt: '2026-03-09T22:00:00.000Z',
      mediaItems: [{
        id: 'media-1',
        name: 'image.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
        storage: 'inline',
        blob: new Blob(['fake-image'], { type: 'image/jpeg' }),
        source: 'manual',
      }],
    };

    const serialized = await serializeJournalEntryForBackup(journalEntry, {
      includeJournalMediaPayloads: true,
    });

    expect(serialized.mediaItems).toHaveLength(1);
    expect(serialized.mediaItems[0]?.dataUrl).toContain('data:image/jpeg;base64,');
  });

  it('strips journal media payloads from auto backups while keeping the entry valid', async () => {
    const journalEntry: JournalEntry = {
      date: '2026-03-09',
      somethingNew: 'Nouveau',
      somethingLearnt: 'Leçon',
      couldDoneBetter: 'Mieux',
      didWell: 'Bien',
      moodId: null,
      updatedAt: '2026-03-09T22:00:00.000Z',
      mediaItems: [{
        id: 'media-1',
        name: 'image.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
        storage: 'inline',
        blob: new Blob(['fake-image'], { type: 'image/jpeg' }),
        source: 'manual',
      }],
    };

    const serialized = await serializeJournalEntryForBackup(journalEntry, {
      includeJournalMediaPayloads: false,
    });

    expect(serialized.mediaItems).toEqual([]);
    expect(parseAppBackupText(JSON.stringify({
      ...createBackupFixture(),
      datasets: {
        ...createBackupFixture().datasets,
        journal: {
          ...createBackupFixture().datasets.journal,
          value: [serialized],
        },
      },
      stats: {
        ...createBackupFixture().stats,
        journalMediaCount: 0,
      },
    })).datasets.journal.value[0]?.mediaItems).toEqual([]);
  });

  it('absorbs auto-backup failures and logs them instead of crashing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runAutoBackupNowSafely(async () => {
      throw new RangeError('Invalid string length');
    })).resolves.toBe(false);

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('keeps background auto-backup disabled during stabilization', () => {
    expect(isAutoBackupEnabled()).toBe(false);
  });
});
