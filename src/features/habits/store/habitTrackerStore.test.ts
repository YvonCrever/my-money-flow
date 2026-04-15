import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const habitTrackerStoreTestState = vi.hoisted(() => ({
  backupMetadata: new Map<string, unknown>(),
  notifyAppStorageMutation: vi.fn(),
  storeRecords: new Map<string, unknown>(),
}));

vi.mock('@/lib/appStorageDb', () => ({
  APP_STORE_NAMES: {
    journalEntries: 'today_everyday_entries',
    appSettings: 'app_settings',
    financeRevenues: 'finance_revenues',
    financeExpenses: 'finance_expenses',
    financeClients: 'finance_clients',
    readingBooks: 'reading_books',
    habitTracker: 'habit_tracker',
    calendarState: 'calendar_state',
    personalData: 'personal_data',
    invoiceSettings: 'invoice_settings',
    backupMetadata: 'backup_metadata',
  },
  getStoreRecord: vi.fn(async (storeName: string) => habitTrackerStoreTestState.storeRecords.get(storeName) ?? null),
  putStoreRecord: vi.fn(async (storeName: string, value: unknown) => {
    habitTrackerStoreTestState.storeRecords.set(storeName, value);
  }),
  getBackupMetadata: vi.fn(async (key: string) => habitTrackerStoreTestState.backupMetadata.get(key) ?? null),
  setBackupMetadata: vi.fn(async (key: string, value: unknown) => {
    habitTrackerStoreTestState.backupMetadata.set(key, value);
  }),
}));

vi.mock('@/lib/backupScheduler', () => ({
  notifyAppStorageMutation: habitTrackerStoreTestState.notifyAppStorageMutation,
}));

async function flushPersistence() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('habit tracker store', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
    habitTrackerStoreTestState.storeRecords.clear();
    habitTrackerStoreTestState.backupMetadata.clear();
    habitTrackerStoreTestState.notifyAppStorageMutation.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates and persists the daily tracker data without storing derived stats', async () => {
    const habitTrackerStore = await import('@/features/habits/store/habitTrackerStore');

    await habitTrackerStore.ensureHabitTrackerStoreReady();

    const createdHabit = habitTrackerStore.addDailyHabit('Hydration');
    expect(createdHabit).not.toBeNull();

    habitTrackerStore.toggleDailyEntry(createdHabit!.id, '2026-04-15');
    habitTrackerStore.toggleDailyEntry(createdHabit!.id, '2026-04-15');
    habitTrackerStore.setMood('2026-04-15', 8);
    habitTrackerStore.setSleep('2026-04-15', 7);
    habitTrackerStore.renameDailyHabit(createdHabit!.id, 'Hydration 2');

    await flushPersistence();

    const snapshot = habitTrackerStore.readHabitTrackerState();
    const storedRecord = habitTrackerStoreTestState.storeRecords.get('habit_tracker') as {
      value: Record<string, unknown>;
    };

    expect(snapshot.habits.some((habit) => habit.name === 'Hydration 2')).toBe(true);
    expect(snapshot.dailyEntries.some((entry) => (
      entry.habitId === createdHabit!.id
      && entry.dateKey === '2026-04-15'
      && entry.state === 'not-done'
    ))).toBe(true);
    expect(snapshot.moodEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ dateKey: '2026-04-15', value: 8 }),
    ]));
    expect(snapshot.sleepEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ dateKey: '2026-04-15', value: 7 }),
    ]));
    expect(storedRecord.value).not.toHaveProperty('statistics');
    expect(habitTrackerStoreTestState.notifyAppStorageMutation).toHaveBeenCalled();
  });

  it('archives a habit without deleting its past history', async () => {
    vi.setSystemTime(new Date('2026-04-14T12:00:00.000Z'));
    const habitTrackerStore = await import('@/features/habits/store/habitTrackerStore');

    await habitTrackerStore.ensureHabitTrackerStoreReady();

    const createdHabit = habitTrackerStore.addDailyHabit('Stretching');
    expect(createdHabit).not.toBeNull();

    habitTrackerStore.toggleDailyEntry(createdHabit!.id, '2026-04-14');
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
    habitTrackerStore.archiveDailyHabit(createdHabit!.id);

    await flushPersistence();

    const snapshot = habitTrackerStore.readHabitTrackerState();
    const archivedHabit = snapshot.habits.find((habit) => habit.id === createdHabit!.id);

    expect(archivedHabit).toMatchObject({
      status: 'archived',
    });
    expect(snapshot.dailyEntries.some((entry) => (
      entry.habitId === createdHabit!.id && entry.dateKey === '2026-04-14'
    ))).toBe(true);
    expect(snapshot.dailyEntries.some((entry) => (
      entry.habitId === createdHabit!.id && entry.dateKey >= '2026-04-15'
    ))).toBe(false);
  });
});
