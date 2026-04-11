import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';

function BrokenScreen(): JSX.Element {
  throw new Error('render crash');
}

describe('AppErrorBoundary', () => {
  it('shows the fallback screen when a child crashes during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <BrokenScreen />
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Ycaro n'a pas pu afficher cet ecran")).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
