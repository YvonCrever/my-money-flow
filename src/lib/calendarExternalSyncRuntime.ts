import { syncAllExternalReferencesToCalendar, syncFinanceReferencesToCalendar, syncJournalReferencesToCalendar, syncReadingReferencesToCalendar } from '@/lib/calendarExternalSync';
import { ensureCalendarStoreReady } from '@/lib/calendarStore';
import { ensureFinanceStoreReady, subscribeFinanceStore } from '@/lib/financeStore';
import { ensureReadingStoreReady, subscribeReadingStore } from '@/lib/readingStore';
import { migrateLegacyJournalEntries, subscribeJournalStore } from '@/lib/journalDb';
import { getBackupMetadata, setBackupMetadata } from '@/lib/appStorageDb';
import { startDevTiming, timeDevAsync } from '@/lib/devTimings';

let runtimeStartPromise: Promise<void> | null = null;
let stopRuntime: (() => void) | null = null;
let backfillPromise: Promise<void> | null = null;
const pendingSyncTasks: Array<() => Promise<void>> = [];
let activeSyncQueue: Promise<void> | null = null;
const CALENDAR_EXTERNAL_REFS_SEEDED_KEY = 'calendar_external_refs_seeded_v1' as const;

function startSyncQueue() {
  if (activeSyncQueue) {
    return activeSyncQueue;
  }

  activeSyncQueue = (async () => {
    while (pendingSyncTasks.length > 0) {
      const nextTask = pendingSyncTasks.shift();
      if (!nextTask) continue;

      try {
        await nextTask();
      } catch (error) {
        console.error('[calendar-sync] runtime sync failed', error);
      }
    }
  })().finally(() => {
    activeSyncQueue = null;

    if (pendingSyncTasks.length > 0) {
      void startSyncQueue();
    }
  });

  return activeSyncQueue;
}

function queueSync(task: () => Promise<void>) {
  pendingSyncTasks.push(task);

  return startSyncQueue();
}

async function ensureCalendarExternalReferenceBackfill() {
  if (backfillPromise) {
    return backfillPromise;
  }

  const isSeeded = await getBackupMetadata<boolean>(CALENDAR_EXTERNAL_REFS_SEEDED_KEY);
  if (isSeeded) {
    return;
  }

  backfillPromise = queueSync(async () => {
    await timeDevAsync('calendar-external-ref-backfill', async () => {
      await syncAllExternalReferencesToCalendar();
      await setBackupMetadata(CALENDAR_EXTERNAL_REFS_SEEDED_KEY, true);
    });
  }).catch((error) => {
    backfillPromise = null;
    throw error;
  });

  try {
    await backfillPromise;
  } finally {
    backfillPromise = null;
  }
}

export async function ensureCalendarExternalSyncRuntime() {
  if (stopRuntime) {
    return;
  }

  if (runtimeStartPromise) {
    return runtimeStartPromise;
  }

  runtimeStartPromise = (async () => {
    const stopTiming = startDevTiming('calendar-runtime-start');

    try {
      await Promise.all([
        timeDevAsync('calendar-store-ready', ensureCalendarStoreReady),
        timeDevAsync('finance-store-ready', ensureFinanceStoreReady),
        timeDevAsync('reading-store-ready', ensureReadingStoreReady),
        timeDevAsync('journal-legacy-migration', migrateLegacyJournalEntries),
      ]);
    } finally {
      stopTiming();
    }

    const unsubscribeFinance = subscribeFinanceStore(() => {
      void queueSync(syncFinanceReferencesToCalendar);
    });
    const unsubscribeReading = subscribeReadingStore(() => {
      void queueSync(syncReadingReferencesToCalendar);
    });
    const unsubscribeJournal = subscribeJournalStore(() => {
      void queueSync(syncJournalReferencesToCalendar);
    });

    stopRuntime = () => {
      unsubscribeFinance();
      unsubscribeReading();
      unsubscribeJournal();
      stopRuntime = null;
    };

    if (typeof window === 'undefined') {
      void ensureCalendarExternalReferenceBackfill().catch((error) => {
        console.error('[calendar-sync] calendar external reference backfill failed', error);
      });
      return;
    }

    window.setTimeout(() => {
      void ensureCalendarExternalReferenceBackfill().catch((error) => {
        console.error('[calendar-sync] calendar external reference backfill failed', error);
      });
    }, 0);
  })().catch((error) => {
    runtimeStartPromise = null;
    throw error;
  });

  try {
    await runtimeStartPromise;
  } finally {
    runtimeStartPromise = null;
  }
}

export function stopCalendarExternalSyncRuntime() {
  stopRuntime?.();
}
