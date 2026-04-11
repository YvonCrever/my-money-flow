import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/shell/components/AppLayout', async () => {
  const { Outlet } = await import('react-router-dom');

  return {
    default: function MockAppLayout() {
      return (
        <div data-testid="app-layout">
          <Outlet />
        </div>
      );
    },
  };
});

vi.mock('@/features/home/routes/HomeRoute', () => ({
  default: function MockHomeRoute() {
    return <div>home-route</div>;
  },
}));

vi.mock('@/features/calendar/routes/CalendarRoute', () => ({
  default: function MockCalendarRoute() {
    return <div>calendar-route</div>;
  },
}));

vi.mock('@/features/finance/routes/FinanceRoute', async () => {
  const { useParams } = await import('react-router-dom');

  return {
    default: function MockFinanceRoute() {
      const { tab } = useParams();
      return <div>{`finance-route:${tab ?? 'none'}`}</div>;
    },
  };
});

vi.mock('@/features/habits/routes/HabitTrackerRoute', () => ({
  default: function MockHabitTrackerRoute() {
    return <div>habit-tracker-route</div>;
  },
}));

vi.mock('@/features/reading/routes/ReadingRoute', () => ({
  default: function MockReadingRoute() {
    return <div>reading-route</div>;
  },
}));

vi.mock('@/features/journal/routes/JournalRoute', () => ({
  default: function MockJournalRoute() {
    return <div>journal-route</div>;
  },
}));

import App from '@/App';

describe('app routes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it.each([
    ['/', 'home-route'],
    ['/calendar', 'calendar-route'],
    ['/habits', 'habit-tracker-route'],
    ['/finance/donnees', 'finance-route:donnees'],
    ['/reading', 'reading-route'],
    ['/journal', 'journal-route'],
  ])('renders %s through the router', async (pathname, expectedText) => {
    window.history.pushState({}, '', pathname);

    render(<App />);

    expect(await screen.findByText(expectedText)).toBeInTheDocument();
  });

  it('renders the not found screen for unknown routes', async () => {
    window.history.pushState({}, '', '/missing-route');

    render(<App />);

    expect(await screen.findByText('Oops! Page not found')).toBeInTheDocument();
  });
});
