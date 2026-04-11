import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { JSX, ReactNode } from 'react';

vi.mock('recharts', () => ({
  Area: (): null => null,
  AreaChart: (): JSX.Element => <div data-testid="mock-area-chart" />,
  CartesianGrid: (): null => null,
  ResponsiveContainer: ({ children }: { children?: ReactNode }): JSX.Element => <div>{children}</div>,
  Tooltip: (): null => null,
  XAxis: (): null => null,
  YAxis: (): null => null,
}));

import HomePage from '@/pages/app/HomePage';

describe('HomePage', () => {
  it('degrades gracefully when finance data could not be loaded', () => {
    render(
      <HomePage
        financeLoadError="finance boot failed"
        monthlySummary={[]}
        selectedYear={2025}
        totalRevenue={0}
      />,
    );

    expect(screen.getByText('Resume Finance indisponible')).toBeInTheDocument();
    expect(screen.getByText('finance boot failed')).toBeInTheDocument();
    expect(screen.getByText('Aucun mois visible pour cette année.')).toBeInTheDocument();
  });
});
