import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createUnsubscribe(): () => void {
  return () => undefined;
}

const readingHookState = vi.hoisted(() => ({
  addReadingBook: vi.fn(),
  deleteReadingBook: vi.fn(),
  editReadingBook: vi.fn(),
  ensureReadingStoreReady: vi.fn(),
  readReadingBooks: vi.fn(() => []),
  subscribeReadingStore: vi.fn((): (() => void) => createUnsubscribe()),
}));

vi.mock('@/lib/readingStore', () => ({
  addReadingBook: readingHookState.addReadingBook,
  deleteReadingBook: readingHookState.deleteReadingBook,
  editReadingBook: readingHookState.editReadingBook,
  ensureReadingStoreReady: readingHookState.ensureReadingStoreReady,
  readReadingBooks: readingHookState.readReadingBooks,
  subscribeReadingStore: readingHookState.subscribeReadingStore,
}));

import useReadingData from '@/hooks/useReadingData';

describe('useReadingData', () => {
  beforeEach(() => {
    readingHookState.addReadingBook.mockReset();
    readingHookState.deleteReadingBook.mockReset();
    readingHookState.editReadingBook.mockReset();
    readingHookState.ensureReadingStoreReady.mockReset();
    readingHookState.readReadingBooks.mockReset();
    readingHookState.subscribeReadingStore.mockReset();

    readingHookState.readReadingBooks.mockReturnValue([]);
    readingHookState.subscribeReadingStore.mockReturnValue(createUnsubscribe());
  });

  it('marks the hook as loaded and exposes a readable error when reading storage boot fails', async () => {
    readingHookState.ensureReadingStoreReady.mockRejectedValueOnce(new Error('db offline'));

    const { result } = renderHook(() => useReadingData());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.loadError).toContain('Lecture');
    expect(result.current.books).toEqual([]);
  });
});
