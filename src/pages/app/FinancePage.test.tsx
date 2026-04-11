import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import FinancePage from '@/pages/app/FinancePage';
import type useFinanceData from '@/hooks/useFinanceData';

vi.mock('@/components/AppChromeProvider', () => ({
  useAppPageChrome: () => ({
    actionsTarget: null as HTMLDivElement | null,
    inlineToolsTarget: null as HTMLDivElement | null,
    leadingTarget: null as HTMLDivElement | null,
  }),
}));

vi.mock('@/components/ui/toolbar-portal', () => ({
  ToolbarPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/MonthYearFilter', () => ({
  MonthYearFilter: () => <div>month-filter</div>,
}));

vi.mock('@/components/RevenueTab', () => ({
  RevenueTab: () => <div>revenue-tab</div>,
}));

vi.mock('@/components/ExpenseTab', () => ({
  ExpenseTab: () => <div>expense-tab</div>,
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: () => <div>dashboard-tab</div>,
}));

vi.mock('@/components/ClientTab', () => ({
  ClientTab: () => <div>client-tab</div>,
}));

vi.mock('@/components/DataTab', () => ({
  DataTab: () => <div>data-tab</div>,
}));

function createFinanceData(): ReturnType<typeof useFinanceData> {
  return {
    isLoaded: true,
    loadError: null,
    revenues: [],
    expenses: [],
    filteredRevenues: [],
    filteredExpenses: [],
    selectedMonth: 0,
    selectedYear: 2026,
    setSelectedMonth: vi.fn(),
    setSelectedYear: vi.fn(),
    addRevenue: vi.fn(),
    deleteRevenue: vi.fn(),
    editRevenue: vi.fn(),
    addExpense: vi.fn(),
    deleteExpense: vi.fn(),
    editExpense: vi.fn(),
    applyRecurring: vi.fn(),
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
    revenueByClient: {},
    expensesByCategory: {},
    monthlySummary: [],
    clients: [],
    addClient: vi.fn(),
    removeClient: vi.fn(),
    editClient: vi.fn(),
  };
}

describe('FinancePage', () => {
  it('keeps the data view out of the visible finance tab rail', () => {
    render(
      <FinancePage
        data={createFinanceData()}
        activeTab="dashboard"
        onTabChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Données & sauvegardes/i })).not.toBeInTheDocument();
    expect(screen.getByText('month-filter')).toBeInTheDocument();
  });

  it('renders the data center on /finance/donnees with a clear way back', () => {
    const onTabChange = vi.fn();

    render(
      <FinancePage
        data={createFinanceData()}
        activeTab="donnees"
        onTabChange={onTabChange}
      />,
    );

    expect(screen.getByText('Données & sauvegardes')).toBeInTheDocument();
    expect(screen.getByText('data-tab')).toBeInTheDocument();
    expect(screen.queryByText('month-filter')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retour au dashboard/i }));

    expect(onTabChange).toHaveBeenCalledWith('dashboard');
  });

  it('shows a compact warning when finance storage failed to load', () => {
    render(
      <FinancePage
        data={{ ...createFinanceData(), loadError: 'boot failed' }}
        activeTab="dashboard"
        onTabChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Probleme de stockage des Finances')).toBeInTheDocument();
    expect(screen.getByText('boot failed')).toBeInTheDocument();
  });
});
