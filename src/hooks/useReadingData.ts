import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addReadingBook,
  deleteReadingBook,
  ensureReadingStoreReady,
  editReadingBook,
  readReadingBooks,
  subscribeReadingStore,
} from '@/lib/readingStore';
import { getFeatureStorageLoadErrorMessage } from '@/lib/storageLoadErrors';
import { ReadingEntry } from '@/types/reading';

function useReadingData() {
  const [books, setBooks] = useState<ReadingEntry[]>(() => readReadingBooks());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void ensureReadingStoreReady()
      .then(() => {
        setBooks(readReadingBooks());
        setLoadError(null);
      })
      .catch((error) => {
        setLoadError(getFeatureStorageLoadErrorMessage('Lecture', error));
      })
      .finally(() => {
        setIsLoaded(true);
      });

    return subscribeReadingStore(() => {
      setBooks(readReadingBooks());
      setLoadError(null);
    });
  }, []);

  const addBook = useCallback((entry: Omit<ReadingEntry, 'id' | 'addedAt'>) => {
    addReadingBook(entry);
  }, []);

  const editBook = useCallback((id: string, updated: Partial<Omit<ReadingEntry, 'id' | 'addedAt'>>) => {
    editReadingBook(id, updated);
  }, []);

  const deleteBook = useCallback((id: string) => {
    deleteReadingBook(id);
  }, []);

  const averageRating = useMemo(
    () => (books.length ? books.reduce((sum, book) => sum + book.rating, 0) / books.length : 0),
    [books],
  );

  return {
    isLoaded,
    loadError,
    books,
    addBook,
    editBook,
    deleteBook,
    averageRating,
  };
}

export default useReadingData;
