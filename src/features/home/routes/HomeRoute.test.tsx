import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const homeRouteTestState = vi.hoisted(() => ({
  ensureCalendarExternalSyncRuntime: vi.fn(),
  markFirstVisibleRender: vi.fn(),
  useFinanceData: vi.fn(() => ({
    loadError: null,
    monthlySummary: null,
    selectedYear: 2026,
    totalRevenue: 1200,
  })),
}));

vi.mock('@/hooks/useFinanceData', () => ({
  default: homeRouteTestState.useFinanceData,
}));

vi.mock('@/lib/calendarExternalSyncRuntime', () => ({
  ensureCalendarExternalSyncRuntime: homeRouteTestState.ensureCalendarExternalSyncRuntime,
}));

vi.mock('@/lib/devTimings', () => ({
  markFirstVisibleRender: homeRouteTestState.markFirstVisibleRender,
}));

vi.mock('@/features/home/page/HomePage', () => ({
  default: function MockHomePage({ totalRevenue }: { totalRevenue: number }) {
    return <div>{`home-total-revenue:${totalRevenue}`}</div>;
  },
}));

import HomeRoute from '@/features/home/routes/HomeRoute';

describe('home route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the home page without starting the calendar runtime', () => {
    render(<HomeRoute />);

    expect(screen.getByText('home-total-revenue:1200')).toBeInTheDocument();
    expect(homeRouteTestState.ensureCalendarExternalSyncRuntime).not.toHaveBeenCalled();
    expect(homeRouteTestState.markFirstVisibleRender).toHaveBeenCalledTimes(1);
  });
});
