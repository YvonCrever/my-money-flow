import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useState } from 'react';

import { AppThemeProvider, useAppTheme } from '@/components/AppThemeProvider';
import { APP_THEME_STORAGE_KEY } from '@/lib/appThemes';

function ThemeHarness() {
  const { activeThemeId, changeTheme } = useAppTheme();
  const [counter] = useState(1);

  return (
    <div>
      <span>{activeThemeId}</span>
      <span>{`counter:${counter}`}</span>
      <button type="button" onClick={() => changeTheme('theme-3')}>
        switch-theme
      </button>
    </div>
  );
}

describe('AppThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.body.className = '';
    delete document.documentElement.dataset.themeReloading;
  });

  it('applies a light theme without keeping the dark class on the document', async () => {
    localStorage.setItem(APP_THEME_STORAGE_KEY, 'theme-1');

    render(
      <AppThemeProvider>
        <ThemeHarness />
      </AppThemeProvider>,
    );

    expect(document.documentElement).toHaveClass('dark');
    expect(document.body).toHaveClass('dark');

    fireEvent.click(screen.getByRole('button', { name: 'switch-theme' }));

    await waitFor(() => {
      expect(screen.getByText('theme-3')).toBeInTheDocument();
      expect(document.documentElement).not.toHaveClass('dark');
      expect(document.body).not.toHaveClass('dark');
    });
  });

  it('switches themes in place without marking the document for a full reload', async () => {
    render(
      <AppThemeProvider>
        <ThemeHarness />
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'switch-theme' }));

    await waitFor(() => {
      expect(screen.getByText('theme-3')).toBeInTheDocument();
      expect(screen.getByText('counter:1')).toBeInTheDocument();
      expect(document.documentElement.dataset.themeReloading).toBeUndefined();
    });
  });
});
