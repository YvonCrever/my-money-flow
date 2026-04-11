export const FINANCE_PAGE_TABS = [
  'dashboard',
  'revenus',
  'depenses',
  'clients',
  'donnees',
] as const;

export type FinancePageTab = (typeof FINANCE_PAGE_TABS)[number];

export function isFinancePageTab(value: string | null | undefined): value is FinancePageTab {
  return FINANCE_PAGE_TABS.includes(value as FinancePageTab);
}

export function normalizeFinancePageTab(value: string | null | undefined): FinancePageTab {
  return isFinancePageTab(value) ? value : 'dashboard';
}
