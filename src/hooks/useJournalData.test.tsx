import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createUnsubscribe(): () => void {
  return () => undefined;
}

const journalHookState = vi.hoisted(() => ({
  bulkPutJournalEntries: vi.fn(),
  deleteAsset: vi.fn(),
  deleteJournalEntry: vi.fn(),
  getJournalEntries: vi.fn(async () => []),
  getJournalStorageErrorMessage: vi.fn(() => 'journal boot failed'),
  migrateLegacyJournalEntries: vi.fn(async () => undefined),
  prepareJournalStorage: vi.fn(async () => ({ warning: null })),
  putJournalEntry: vi.fn(),
  saveImageAsset: vi.fn(),
  subscribeJournalStore: vi.fn((): (() => void) => createUnsubscribe()),
}));

vi.mock('@/lib/journalDb', () => ({
  bulkPutJournalEntries: journalHookState.bulkPutJournalEntries,
  deleteJournalEntry: journalHookState.deleteJournalEntry,
  getJournalEntries: journalHookState.getJournalEntries,
  migrateLegacyJournalEntries: journalHookState.migrateLegacyJournalEntries,
  putJournalEntry: journalHookState.putJournalEntry,
  subscribeJournalStore: journalHookState.subscribeJournalStore,
}));

vi.mock('@/lib/journalMedia', () => ({
  collectJournalAssetIds: vi.fn(() => []),
  hasJournalCorruptedImportedMedia: vi.fn(() => false),
  isJournalInlineMediaCorrupted: vi.fn(() => false),
  isJournalUsableInlineMediaItem: vi.fn(() => false),
  mergeImportedJournalMediaItems: vi.fn((current) => current),
}));

vi.mock('@/lib/journalAssetStorage', () => ({
  deleteAsset: journalHookState.deleteAsset,
  prepareJournalStorage: journalHookState.prepareJournalStorage,
  saveImageAsset: journalHookState.saveImageAsset,
}));

vi.mock('@/lib/journalStorageErrors', () => ({
  JournalStorageError: class JournalStorageError extends Error {},
  getJournalStorageErrorMessage: journalHookState.getJournalStorageErrorMessage,
}));

import useJournalData from '@/hooks/useJournalData';

describe('useJournalData', () => {
  beforeEach(() => {
    journalHookState.bulkPutJournalEntries.mockReset();
    journalHookState.deleteAsset.mockReset();
    journalHookState.deleteJournalEntry.mockReset();
    journalHookState.getJournalEntries.mockReset();
    journalHookState.getJournalStorageErrorMessage.mockReset();
    journalHookState.migrateLegacyJournalEntries.mockReset();
    journalHookState.prepareJournalStorage.mockReset();
    journalHookState.putJournalEntry.mockReset();
    journalHookState.saveImageAsset.mockReset();
    journalHookState.subscribeJournalStore.mockReset();

    journalHookState.getJournalEntries.mockResolvedValue([]);
    journalHookState.getJournalStorageErrorMessage.mockReturnValue('journal boot failed');
    journalHookState.migrateLegacyJournalEntries.mockResolvedValue(undefined);
    journalHookState.prepareJournalStorage.mockResolvedValue({ warning: null });
    journalHookState.subscribeJournalStore.mockReturnValue(createUnsubscribe());
  });

  it('keeps the reference loading contract when journal storage boot fails', async () => {
    journalHookState.migrateLegacyJournalEntries.mockRejectedValueOnce(new Error('db offline'));

    const { result } = renderHook(() => useJournalData());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.loadError).toBe('journal boot failed');
    expect(result.current.entries).toEqual([]);
  });
});
