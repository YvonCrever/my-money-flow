import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@/features/calendar/page/CalendarPage', async () => {
  const { useCalendarData } = await import('@/components/CalendarDataContext');

  return {
    default: function MockCalendarPage() {
      const { selectedDate } = useCalendarData();
      return <div>{`calendar-selected-date:${selectedDate}`}</div>;
    },
  };
});

import CalendarPage from '@/pages/app/CalendarPage';

describe('legacy calendar page entrypoint', () => {
  it('renders the calendar page inside the shared data provider', () => {
    render(<CalendarPage />);

    expect(screen.getByText(/^calendar-selected-date:/)).toBeInTheDocument();
  });
});
