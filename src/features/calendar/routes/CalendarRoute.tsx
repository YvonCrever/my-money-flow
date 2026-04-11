import { useEffect } from 'react';
import '@/features/calendar/styles/calendar.css';
import { CalendarDataProvider } from '@/components/CalendarDataProvider';
import CalendarPage from '@/features/calendar/page/CalendarPage';
import { markFirstVisibleRender } from '@/lib/devTimings';
import {
  ensureCalendarExternalSyncRuntime,
  stopCalendarExternalSyncRuntime,
} from '@/lib/calendarExternalSyncRuntime';

export default function CalendarRoute() {
  useEffect(() => {
    let isUnmounted = false;

    markFirstVisibleRender();

    void ensureCalendarExternalSyncRuntime()
      .then(() => {
        if (isUnmounted) {
          stopCalendarExternalSyncRuntime();
        }
      })
      .catch((error) => {
        console.error('[calendar-sync] runtime bootstrap failed', error);
      });

    return () => {
      isUnmounted = true;
      stopCalendarExternalSyncRuntime();
    };
  }, []);

  return (
    <CalendarDataProvider>
      <CalendarPage />
    </CalendarDataProvider>
  );
}
