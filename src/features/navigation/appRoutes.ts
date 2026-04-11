export interface AppNavItem {
  id: 'home' | 'calendar' | 'habits' | 'finance' | 'reading' | 'journal';
  label: string;
  to: string;
  end?: boolean;
}

export type AppPageAnimationOwnerId = 'finance' | 'lecture' | 'journal';

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: 'home', label: 'Accueil', to: '/', end: true },
  { id: 'calendar', label: 'Calendrier', to: '/calendar' },
  { id: 'habits', label: 'Habit Tracker', to: '/habits' },
  { id: 'finance', label: 'Finances', to: '/finance/dashboard' },
  { id: 'reading', label: 'Lecture', to: '/reading' },
  { id: 'journal', label: 'Journal', to: '/journal' },
];

export function getAppMainClassName(pathname: string) {
  return pathname.startsWith('/calendar')
    ? 'app-main app-main--calendar'
    : 'app-main app-main--standard';
}

export function getPageAnimationOwnerId(pathname: string): AppPageAnimationOwnerId | null {
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/reading')) return 'lecture';
  if (pathname.startsWith('/journal')) return 'journal';
  return null;
}

export function shouldAdvancePageAnimationToken(
  previousOwnerId: AppPageAnimationOwnerId | null,
  nextOwnerId: AppPageAnimationOwnerId | null,
) {
  return nextOwnerId !== null && previousOwnerId !== nextOwnerId;
}
