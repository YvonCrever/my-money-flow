import { useCallback, useEffect, useMemo, useState } from 'react';
import { JournalEntry } from '@/types/journal';
import {
  bulkPutJournalEntries,
  deleteJournalEntry,
  getJournalEntries,
  migrateLegacyJournalEntries,
  putJournalEntry,
  subscribeJournalStore,
} from '@/lib/journalDb';
import {
  collectJournalAssetIds,
  hasJournalCorruptedImportedMedia,
  isJournalInlineMediaCorrupted,
  isJournalUsableInlineMediaItem,
  mergeImportedJournalMediaItems,
} from '@/lib/journalMedia';
import { deleteAsset, prepareJournalStorage, saveImageAsset } from '@/lib/journalAssetStorage';
import { JournalStorageError, getJournalStorageErrorMessage } from '@/lib/journalStorageErrors';

function sortEntries(entries: JournalEntry[]) {
  return entries.slice().sort((a, b) => b.date.localeCompare(a.date));
}

function withJournalCalendarMeta(entry: JournalEntry) {
  return {
    ...entry,
    calendarMeta: entry.calendarMeta ?? {
      date: entry.date,
      syncTarget: 'journal' as const,
    },
  };
}

function buildStoredEntry(entry: Omit<JournalEntry, 'updatedAt'>, updatedAt: string, fallbackEntry?: JournalEntry): JournalEntry {
  return withJournalCalendarMeta({
    date: entry.date,
    somethingNew: entry.somethingNew || fallbackEntry?.somethingNew || '',
    somethingLearnt: entry.somethingLearnt || fallbackEntry?.somethingLearnt || '',
    couldDoneBetter: entry.couldDoneBetter || fallbackEntry?.couldDoneBetter || '',
    didWell: entry.didWell || fallbackEntry?.didWell || '',
    moodId: entry.moodId ?? fallbackEntry?.moodId ?? null,
    mediaItems: entry.mediaItems,
    updatedAt,
    calendarMeta: {
      ...(fallbackEntry?.calendarMeta ?? entry.calendarMeta ?? {}),
      date: entry.date,
      syncTarget: 'journal',
    },
  });
}

function collectAssetIdsFromEntries(entries: JournalEntry[]) {
  return new Set(entries.flatMap((entry) => collectJournalAssetIds(entry.mediaItems)));
}

async function cleanupRemovedAssets(previousEntries: JournalEntry[], nextEntries: JournalEntry[]) {
  const previousAssetIds = collectAssetIdsFromEntries(previousEntries);
  const nextAssetIds = collectAssetIdsFromEntries(nextEntries);
  const removedAssetIds = Array.from(previousAssetIds).filter((assetId) => !nextAssetIds.has(assetId));

  await Promise.all(removedAssetIds.map(async (assetId) => {
    try {
      await deleteAsset(assetId);
    } catch {
      // Asset cleanup should not block the Journal state update.
    }
  }));
}

interface MaterializedImportResult {
  entries: Omit<JournalEntry, 'updatedAt'>[];
  createdAssetIds: string[];
  optimizationFallbackCount: number;
  storageWarning: string | null;
}

async function materializeImportedEntries(
  incomingEntries: Omit<JournalEntry, 'updatedAt'>[],
): Promise<MaterializedImportResult> {
  const importedInlineImages = incomingEntries.flatMap((entry) => (
    entry.mediaItems
      .filter(isJournalUsableInlineMediaItem)
      .filter((mediaItem) => mediaItem.source === 'import' && mediaItem.type === 'image')
  ));

  const expectedBytes = importedInlineImages.reduce((total, mediaItem) => total + mediaItem.blob.size, 0);
  const storagePreparation = await prepareJournalStorage(expectedBytes);
  const createdAssetIds: string[] = [];
  let optimizationFallbackCount = 0;

  try {
    const entries = await Promise.all(incomingEntries.map(async (entry) => {
      const mediaItems = await Promise.all(entry.mediaItems.map(async (mediaItem) => {
        if (mediaItem.source !== 'import' || mediaItem.type !== 'image' || mediaItem.storage !== 'inline') {
          return mediaItem;
        }

        if (isJournalInlineMediaCorrupted(mediaItem)) {
          throw new JournalStorageError(
            'write',
            'Une photo importee est invalide. Reimporte le .docx depuis Extraction.',
          );
        }

        const result = await saveImageAsset(mediaItem.blob, {
          name: mediaItem.name,
          lastModified: mediaItem.lastModified,
          source: mediaItem.source,
        });

        createdAssetIds.push(result.mediaItem.assetId);
        if (!result.optimized) optimizationFallbackCount += 1;
        return result.mediaItem;
      }));

      return {
        ...entry,
        mediaItems,
      };
    }));

    return {
      entries,
      createdAssetIds,
      optimizationFallbackCount,
      storageWarning: storagePreparation.warning,
    };
  } catch (error) {
    await Promise.all(createdAssetIds.map(async (assetId) => {
      try {
        await deleteAsset(assetId);
      } catch {
        // Best effort cleanup after a failed import.
      }
    }));

    throw error;
  }
}

interface ImportEntriesResult {
  optimizationFallbackCount: number;
  storageWarning: string | null;
  repairedCorruptedDateCount: number;
}

function useJournalData() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await migrateLegacyJournalEntries();
        const storedEntries = await getJournalEntries();
        setEntries(sortEntries(storedEntries.map(withJournalCalendarMeta)));
        setLoadError(null);
      } catch (error) {
        setLoadError(getJournalStorageErrorMessage(error));
      } finally {
        setIsLoaded(true);
      }
    };

    void load();
    return subscribeJournalStore(() => {
      void load();
    });
  }, []);

  const saveEntry = useCallback(async (entry: Omit<JournalEntry, 'updatedAt'>) => {
    const updatedAt = new Date().toISOString();
    const fallbackEntry = entries.find((existingEntry) => existingEntry.date === entry.date);
    const nextEntry = buildStoredEntry(entry, updatedAt, fallbackEntry);
    const nextEntries = sortEntries([
      nextEntry,
      ...entries.filter((existingEntry) => existingEntry.date !== entry.date),
    ]);

    await putJournalEntry(nextEntry);
    setEntries(nextEntries);
    void cleanupRemovedAssets(entries, nextEntries);
  }, [entries]);

  const deleteEntry = useCallback(async (date: string) => {
    const nextEntries = entries.filter((entry) => entry.date !== date);

    await deleteJournalEntry(date);
    setEntries(nextEntries);
    void cleanupRemovedAssets(entries, nextEntries);
  }, [entries]);

  const importEntries = useCallback(async (incomingEntries: Omit<JournalEntry, 'updatedAt'>[]) => {
    const materializedImport = await materializeImportedEntries(incomingEntries);
    const updatedAt = new Date().toISOString();
    const currentEntriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
    const nextEntriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
    const storedEntries = materializedImport.entries.map((entry) => {
      const existingEntry = currentEntriesByDate.get(entry.date);
      const mergedEntry = buildStoredEntry({
        ...entry,
        mediaItems: mergeImportedJournalMediaItems(existingEntry?.mediaItems ?? [], entry.mediaItems),
      }, updatedAt, existingEntry);
      nextEntriesByDate.set(entry.date, mergedEntry);
      return mergedEntry;
    });
    const nextEntries = sortEntries(Array.from(nextEntriesByDate.values()));
    const repairedCorruptedDateCount = materializedImport.entries.filter((entry) => (
      hasJournalCorruptedImportedMedia(currentEntriesByDate.get(entry.date)?.mediaItems ?? [])
    )).length;

    try {
      await bulkPutJournalEntries(storedEntries);
    } catch (error) {
      await Promise.all(materializedImport.createdAssetIds.map(async (assetId) => {
        try {
          await deleteAsset(assetId);
        } catch {
          // Best effort cleanup after a rejected import write.
        }
      }));

      throw error;
    }

    setEntries(nextEntries);
    void cleanupRemovedAssets(entries, nextEntries);

    return {
      optimizationFallbackCount: materializedImport.optimizationFallbackCount,
      storageWarning: materializedImport.storageWarning,
      repairedCorruptedDateCount,
    } satisfies ImportEntriesResult;
  }, [entries]);

  const entryCount = useMemo(() => entries.length, [entries]);
  const corruptedImportDates = useMemo(
    () => entries.filter((entry) => hasJournalCorruptedImportedMedia(entry.mediaItems)).map((entry) => entry.date),
    [entries],
  );

  return {
    entries,
    isLoaded,
    loadError,
    entryCount,
    corruptedImportDates,
    hasCorruptedImportMedia: corruptedImportDates.length > 0,
    saveEntry,
    deleteEntry,
    importEntries,
  };
}

export default useJournalData;
