import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeTestState = vi.hoisted(() => ({
  backupMetadata: new Map<string, unknown>(),
  ensureCalendarStoreReady: vi.fn(async () => undefined),
  ensureFinanceStoreReady: vi.fn(async () => undefined),
  ensureReadingStoreReady: vi.fn(async () => undefined),
  financeSubscriber: null as (() => void) | null,
  journalSubscriber: null as (() => void) | null,
  migrateLegacyJournalEntries: vi.fn(async () => undefined),
  readingSubscriber: null as (() => void) | null,
  syncAllExternalReferencesToCalendar: vi.fn(async () => undefined),
  syncFinanceReferencesToCalendar: vi.fn(async () => undefined),
  syncJournalReferencesToCalendar: vi.fn(async () => undefined),
  syncReadingReferencesToCalendar: vi.fn(async () => undefined),
  timeDevAsync: vi.fn(async (_label: string, runner: () => Promise<void>) => runner()),
}));

vi.mock('@/lib/calendarExternalSync', () => ({
  syncAllExternalReferencesToCalendar: runtimeTestState.syncAllExternalReferencesToCalendar,
  syncFinanceReferencesToCalendar: runtimeTestState.syncFinanceReferencesToCalendar,
  syncJournalReferencesToCalendar: runtimeTestState.syncJournalReferencesToCalendar,
  syncReadingReferencesToCalendar: runtimeTestState.syncReadingReferencesToCalendar,
}));

vi.mock('@/lib/appStorageDb', () => ({
  getBackupMetadata: vi.fn(async (key: string) => runtimeTestState.backupMetadata.get(key) ?? null),
  setBackupMetadata: vi.fn(async (key: string, value: unknown) => {
    runtimeTestState.backupMetadata.set(key, value);
  }),
}));

vi.mock('@/lib/calendarStore', () => ({
  ensureCalendarStoreReady: runtimeTestState.ensureCalendarStoreReady,
}));

vi.mock('@/lib/devTimings', () => ({
  startDevTiming: vi.fn(() => () => undefined),
  timeDevAsync: runtimeTestState.timeDevAsync,
}));

vi.mock('@/lib/financeStore', () => ({
  ensureFinanceStoreReady: runtimeTestState.ensureFinanceStoreReady,
  subscribeFinanceStore: vi.fn((listener: () => void) => {
    runtimeTestState.financeSubscriber = listener;
    return () => {
      runtimeTestState.financeSubscriber = null;
    };
  }),
}));

vi.mock('@/lib/readingStore', () => ({
  ensureReadingStoreReady: runtimeTestState.ensureReadingStoreReady,
  subscribeReadingStore: vi.fn((listener: () => void) => {
    runtimeTestState.readingSubscriber = listener;
    return () => {
      runtimeTestState.readingSubscriber = null;
    };
  }),
}));

vi.mock('@/lib/journalDb', () => ({
  migrateLegacyJournalEntries: runtimeTestState.migrateLegacyJournalEntries,
  subscribeJournalStore: vi.fn((listener: () => void) => {
    runtimeTestState.journalSubscriber = listener;
    return () => {
      runtimeTestState.journalSubscriber = null;
    };
  }),
}));

import { ensureCalendarExternalSyncRuntime, stopCalendarExternalSyncRuntime } from '@/lib/calendarExternalSyncRuntime';

describe('ensureCalendarExternalSyncRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    runtimeTestState.backupMetadata.clear();
    runtimeTestState.financeSubscriber = null;
    runtimeTestState.readingSubscriber = null;
    runtimeTestState.journalSubscriber = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopCalendarExternalSyncRuntime();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('boots once, schedules a one-time backfill, and reacts to store updates', async () => {
    await Promise.all([
      ensureCalendarExternalSyncRuntime(),
      ensureCalendarExternalSyncRuntime(),
    ]);

    expect(runtimeTestState.ensureCalendarStoreReady).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.ensureFinanceStoreReady).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.ensureReadingStoreReady).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.migrateLegacyJournalEntries).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.syncAllExternalReferencesToCalendar).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(runtimeTestState.syncAllExternalReferencesToCalendar).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.backupMetadata.get('calendar_external_refs_seeded_v1')).toBe(true);

    runtimeTestState.financeSubscriber?.();
    runtimeTestState.readingSubscriber?.();
    runtimeTestState.journalSubscriber?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(runtimeTestState.syncFinanceReferencesToCalendar).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.syncReadingReferencesToCalendar).toHaveBeenCalledTimes(1);
    expect(runtimeTestState.syncJournalReferencesToCalendar).toHaveBeenCalledTimes(1);
  });

  it('skips the backfill when the seed flag already exists', async () => {
    runtimeTestState.backupMetadata.set('calendar_external_refs_seeded_v1', true);

    await ensureCalendarExternalSyncRuntime();
    await vi.runAllTimersAsync();

    expect(runtimeTestState.syncAllExternalReferencesToCalendar).not.toHaveBeenCalled();
  });
});
