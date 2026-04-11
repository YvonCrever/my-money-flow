import { useCallback, useEffect, useState } from 'react';
import { Client, ExpenseEntry, RevenueEntry } from '@/types/finance';
import {
  addExpenseRecord,
  addFinanceClient,
  addRevenueRecord,
  deleteExpenseRecord,
  deleteRevenueRecord,
  ensureFinanceStoreReady,
  editExpenseRecord,
  editFinanceClient,
  editRevenueRecord,
  readFinanceClients,
  readFinanceExpenses,
  readFinanceRevenues,
  removeFinanceClient,
  subscribeFinanceStore,
  writeFinanceExpenses,
} from '@/lib/financeStore';
import { getFeatureStorageLoadErrorMessage } from '@/lib/storageLoadErrors';

function syncFinanceState(
  setRevenues: (entries: RevenueEntry[]) => void,
  setExpenses: (entries: ExpenseEntry[]) => void,
  setClients: (entries: Client[]) => void,
) {
  setRevenues(readFinanceRevenues());
  setExpenses(readFinanceExpenses());
  setClients(readFinanceClients());
}

function useFinanceData() {
  const [revenues, setRevenues] = useState<RevenueEntry[]>(() => readFinanceRevenues());
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() => readFinanceExpenses());
  const [clients, setClients] = useState<Client[]>(() => readFinanceClients());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    void ensureFinanceStoreReady()
      .then(() => {
        syncFinanceState(setRevenues, setExpenses, setClients);
        setLoadError(null);
      })
      .catch((error) => {
        setLoadError(getFeatureStorageLoadErrorMessage('Finances', error));
      })
      .finally(() => {
        setIsLoaded(true);
      });

    return subscribeFinanceStore(() => {
      syncFinanceState(setRevenues, setExpenses, setClients);
      setLoadError(null);
    });
  }, []);

  const addClient = useCallback((client: Omit<Client, 'id'>) => {
    addFinanceClient(client);
  }, []);

  const editClient = useCallback((id: string, updated: Partial<Omit<Client, 'id'>>) => {
    editFinanceClient(id, updated);
  }, []);

  const removeClient = useCallback((id: string) => {
    removeFinanceClient(id);
  }, []);

  const addRevenue = useCallback((entry: Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>) => {
    addRevenueRecord(entry);
  }, []);

  const editRevenue = useCallback((id: string, updated: Partial<Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>>) => {
    editRevenueRecord(id, updated);
  }, []);

  const deleteRevenue = useCallback((id: string) => {
    deleteRevenueRecord(id);
  }, []);

  const addExpense = useCallback((entry: Omit<ExpenseEntry, 'id' | 'month' | 'year'>) => {
    addExpenseRecord(entry);
  }, []);

  const editExpense = useCallback((id: string, updated: Partial<Omit<ExpenseEntry, 'id' | 'month' | 'year'>>) => {
    editExpenseRecord(id, updated);
  }, []);

  const deleteExpense = useCallback((id: string) => {
    deleteExpenseRecord(id);
  }, []);

  const applyRecurring = useCallback((month: number, year: number) => {
    const currentExpenses = readFinanceExpenses();
    const recurringTemplates = currentExpenses.filter((expense) => expense.isRecurring);
    const uniqueRecurring = new Map<string, ExpenseEntry>();

    recurringTemplates.forEach((expense) => {
      const key = `${expense.category}-${expense.description}-${expense.amount}`;
      if (!uniqueRecurring.has(key)) uniqueRecurring.set(key, expense);
    });

    const nextEntries: ExpenseEntry[] = [];
    uniqueRecurring.forEach((template) => {
      const exists = currentExpenses.some((expense) => (
        expense.month === month
          && expense.year === year
          && expense.isRecurring
          && expense.category === template.category
          && expense.description === template.description
          && expense.amount === template.amount
      ));

      if (exists) return;

      nextEntries.push({
        ...template,
        id: crypto.randomUUID(),
        date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        month,
        year,
        calendarMeta: {
          ...(template.calendarMeta ?? {}),
          date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
          syncTarget: 'finance-expense',
        },
      });
    });

    if (nextEntries.length === 0) return;
    writeFinanceExpenses([...nextEntries, ...currentExpenses]);
  }, []);

  const filteredRevenues = revenues.filter((revenue) => revenue.month === selectedMonth && revenue.year === selectedYear);
  const filteredExpenses = expenses.filter((expense) => expense.month === selectedMonth && expense.year === selectedYear);

  const totalRevenue = filteredRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = totalRevenue - totalExpenses;

  const revenueByClient = filteredRevenues.reduce((accumulator, revenue) => {
    accumulator[revenue.client] = (accumulator[revenue.client] || 0) + revenue.amount;
    return accumulator;
  }, {} as Record<string, number>);

  const expensesByCategory = filteredExpenses.reduce((accumulator, expense) => {
    accumulator[expense.category] = (accumulator[expense.category] || 0) + expense.amount;
    return accumulator;
  }, {} as Record<string, number>);

  const monthlySummary = Array.from({ length: 12 }, (_, month) => {
    const monthRevenues = revenues.filter((revenue) => revenue.month === month && revenue.year === selectedYear);
    const monthExpenses = expenses.filter((expense) => expense.month === month && expense.year === selectedYear);
    const revenue = monthRevenues.reduce((sum, entry) => sum + entry.amount, 0);
    const expense = monthExpenses.reduce((sum, entry) => sum + entry.amount, 0);
    return { month, revenue, expenses: expense, profit: revenue - expense };
  });

  return {
    isLoaded,
    loadError,
    revenues,
    expenses,
    filteredRevenues,
    filteredExpenses,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    addRevenue,
    deleteRevenue,
    editRevenue,
    addExpense,
    deleteExpense,
    editExpense,
    applyRecurring,
    totalRevenue,
    totalExpenses,
    profit,
    revenueByClient,
    expensesByCategory,
    monthlySummary,
    clients,
    addClient,
    removeClient,
    editClient,
  };
}

export default useFinanceData;
