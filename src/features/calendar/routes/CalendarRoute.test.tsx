import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calendarRouteTestState = vi.hoisted(() => ({
  ensureCalendarExternalSyncRuntime: vi.fn(async () => undefined),
  markFirstVisibleRender: vi.fn(),
  stopCalendarExternalSyncRuntime: vi.fn(),
}));

vi.mock('@/lib/calendarStore', async () => {
  const { createDefaultCalendarState } = await import('@/lib/calendar');
  const state = createDefaultCalendarState();

  return {
    ensureCalendarStoreReady: vi.fn().mockResolvedValue(undefined),
    isCalendarStoreReady: vi.fn(() => true),
    readCalendarState: vi.fn(() => state),
    subscribeCalendarStore: vi.fn(() => () => undefined),
    updateCalendarState: vi.fn((updater) => updater(state)),
  };
});

vi.mock('@/lib/financeStore', () => ({
  readFinanceClients: vi.fn(() => []),
}));

vi.mock('@/lib/calendarExternalSyncRuntime', () => ({
  ensureCalendarExternalSyncRuntime: calendarRouteTestState.ensureCalendarExternalSyncRuntime,
  stopCalendarExternalSyncRuntime: calendarRouteTestState.stopCalendarExternalSyncRuntime,
}));

vi.mock('@/lib/devTimings', () => ({
  markFirstVisibleRender: calendarRouteTestState.markFirstVisibleRender,
}));

vi.mock('@/features/calendar/page/CalendarPage', async () => {
  const { useCalendarData } = await import('@/components/CalendarDataContext');

  return {
    default: function MockCalendarPage() {
      const { selectedDate } = useCalendarData();
      return <div>{`calendar-route-selected-date:${selectedDate}`}</div>;
    },
  };
});

import CalendarRoute from '@/features/calendar/routes/CalendarRoute';

describe('calendar route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CalendarPage inside CalendarDataProvider before the runtime resolves', async () => {
    const { unmount } = render(<CalendarRoute />);

    expect(screen.getByText(/^calendar-route-selected-date:/)).toBeInTheDocument();
    await waitFor(() => {
      expect(calendarRouteTestState.ensureCalendarExternalSyncRuntime).toHaveBeenCalledTimes(1);
    });
    expect(calendarRouteTestState.markFirstVisibleRender).toHaveBeenCalledTimes(1);

    unmount();
    expect(calendarRouteTestState.stopCalendarExternalSyncRuntime).toHaveBeenCalledTimes(1);
  });
});
