import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const appOptionsTestState = vi.hoisted(() => ({
  onOpenFinanceData: vi.fn(),
  onOpenJournalDatePicker: vi.fn(),
}));

vi.mock('@/components/AppChromeProvider', () => ({
  useAppChrome: () => ({
    drawerState: {
      ownerId: 'journal',
      isOpen: true,
    },
    pageOptionsSection: {
      ownerId: 'journal',
      title: 'Page active',
      items: [
        {
          id: 'journal-open-date-picker',
          label: 'Choisir une date',
          description: 'Ouvre le calendrier du journal.',
          onSelect: appOptionsTestState.onOpenJournalDatePicker,
        },
      ],
    },
  }),
}));

vi.mock('@/components/AppThemeProvider', () => ({
  useAppTheme: () => ({
    activeTheme: {
      id: 'theme-1',
      order: 1,
      name: 'Lumiere',
    },
    changeTheme: vi.fn(),
    themes: [
      {
        id: 'theme-1',
        order: 1,
        name: 'Lumiere',
        shortLabel: 'Clair',
        description: 'Theme clair',
        preview: 'linear-gradient(135deg, #fff, #eee)',
      },
    ],
  }),
}));

vi.mock('@/components/AppMastheadMotionProvider', () => ({
  useAppMastheadMotion: () => ({
    activeMotion: {
      id: 'motion-1',
      name: 'Motion',
    },
    activeMotionId: 'motion-1',
    motions: [
      {
        id: 'motion-1',
        name: 'Motion',
        shortLabel: 'Douce',
        description: 'Animation douce',
        preview: 'linear-gradient(135deg, #111, #333)',
        recommended: true,
      },
    ],
    setActiveMotionId: vi.fn(),
  }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}));

import { AppOptionsMenu } from '@/components/AppOptionsMenu';

describe('AppOptionsMenu', () => {
  it('shows contextual page actions before global customization and data entries', () => {
    render(<AppOptionsMenu onOpenFinanceData={appOptionsTestState.onOpenFinanceData} />);

    expect(screen.getByText('Page active')).toBeInTheDocument();
    expect(screen.getByText('Choisir une date')).toBeInTheDocument();
    expect(screen.getByText('Personnalisation')).toBeInTheDocument();
    expect(screen.getByText('Données')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Choisir une date'));
    expect(appOptionsTestState.onOpenJournalDatePicker).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Finances · Données & sauvegardes'));
    expect(appOptionsTestState.onOpenFinanceData).toHaveBeenCalledTimes(1);
  });
});
