import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lecturePageState = vi.hoisted(() => ({
  useReadingData: vi.fn(() => ({
    isLoaded: true,
    loadError: null,
    books: [],
    addBook: vi.fn(),
    editBook: vi.fn(),
    deleteBook: vi.fn(),
    averageRating: 0,
  })),
}));

vi.mock('@/components/AppChromeProvider', () => ({
  useAppPageChrome: () => ({
    inlineToolsTarget: null as HTMLDivElement | null,
  }),
}));

vi.mock('@/components/ReadingTab', () => ({
  ReadingTab: ({ toolbarPortalTarget }: { toolbarPortalTarget: ReactNode }) => (
    <div>{toolbarPortalTarget ? 'reading-tab-with-toolbar' : 'reading-tab'}</div>
  ),
}));

vi.mock('@/hooks/useReadingData', () => ({
  default: lecturePageState.useReadingData,
}));

import LecturePage from '@/pages/app/LecturePage';

describe('LecturePage', () => {
  it('stays stable and shows a warning when reading storage is unavailable', () => {
    lecturePageState.useReadingData.mockReturnValueOnce({
      isLoaded: true,
      loadError: 'lecture boot failed',
      books: [],
      addBook: vi.fn(),
      editBook: vi.fn(),
      deleteBook: vi.fn(),
      averageRating: 0,
    });

    render(<LecturePage />);

    expect(screen.getByText('Probleme de stockage de la Lecture')).toBeInTheDocument();
    expect(screen.getByText('lecture boot failed')).toBeInTheDocument();
    expect(screen.getByText('reading-tab')).toBeInTheDocument();
  });
});
