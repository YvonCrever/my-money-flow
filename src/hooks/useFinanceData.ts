import { useState, useCallback, useEffect } from 'react';
import { RevenueEntry, ExpenseEntry } from '@/types/finance';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useFinanceData() {
  const [revenues, setRevenues] = useState<RevenueEntry[]>(() =>
    loadFromStorage('finance_revenues', [])
  );
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() =>
    loadFromStorage('finance_expenses', [])
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => { saveToStorage('finance_revenues', revenues); }, [revenues]);
  useEffect(() => { saveToStorage('finance_expenses', expenses); }, [expenses]);

  const addRevenue = useCallback((entry: Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>) => {
    const d = new Date(entry.date);
    const newEntry: RevenueEntry = {
      ...entry,
      id: crypto.randomUUID(),
      amount: entry.hourlyRate * entry.hours,
      month: d.getMonth(),
      year: d.getFullYear(),
    };
    setRevenues(prev => [newEntry, ...prev]);
  }, []);

  const deleteRevenue = useCallback((id: string) => {
    setRevenues(prev => prev.filter(r => r.id !== id));
  }, []);

  const addExpense = useCallback((entry: Omit<ExpenseEntry, 'id' | 'month' | 'year'>) => {
    const d = new Date(entry.date);
    const newEntry: ExpenseEntry = {
      ...entry,
      id: crypto.randomUUID(),
      month: d.getMonth(),
      year: d.getFullYear(),
    };
    setExpenses(prev => [newEntry, ...prev]);
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Apply recurring expenses for a given month/year if not already applied
  const applyRecurring = useCallback((month: number, year: number) => {
    setExpenses(prev => {
      const recurringTemplates = prev.filter(e => e.isRecurring);
      const uniqueRecurring = new Map<string, ExpenseEntry>();
      recurringTemplates.forEach(e => {
        const key = `${e.category}-${e.description}-${e.amount}`;
        if (!uniqueRecurring.has(key)) uniqueRecurring.set(key, e);
      });

      const newEntries: ExpenseEntry[] = [];
      uniqueRecurring.forEach(template => {
        const exists = prev.some(
          e => e.month === month && e.year === year && e.isRecurring &&
            e.category === template.category && e.description === template.description && e.amount === template.amount
        );
        if (!exists) {
          newEntries.push({
            ...template,
            id: crypto.randomUUID(),
            date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
            month,
            year,
          });
        }
      });
      return newEntries.length > 0 ? [...newEntries, ...prev] : prev;
    });
  }, []);

  const filteredRevenues = revenues.filter(r => r.month === selectedMonth && r.year === selectedYear);
  const filteredExpenses = expenses.filter(e => e.month === selectedMonth && e.year === selectedYear);

  const totalRevenue = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  // Revenue by client for selected month
  const revenueByClient = filteredRevenues.reduce((acc, r) => {
    acc[r.client] = (acc[r.client] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  // Expenses by category for selected month
  const expensesByCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  // Monthly summary for dashboard (all months of selected year)
  const monthlySummary = Array.from({ length: 12 }, (_, i) => {
    const monthRevenues = revenues.filter(r => r.month === i && r.year === selectedYear);
    const monthExpenses = expenses.filter(e => e.month === i && e.year === selectedYear);
    const rev = monthRevenues.reduce((s, r) => s + r.amount, 0);
    const exp = monthExpenses.reduce((s, e) => s + e.amount, 0);
    return { month: i, revenue: rev, expenses: exp, profit: rev - exp };
  });

  return {
    revenues, expenses,
    filteredRevenues, filteredExpenses,
    selectedMonth, selectedYear,
    setSelectedMonth, setSelectedYear,
    addRevenue, deleteRevenue,
    addExpense, deleteExpense,
    applyRecurring,
    totalRevenue, totalExpenses, profit,
    revenueByClient, expensesByCategory,
    monthlySummary,
  };
}
