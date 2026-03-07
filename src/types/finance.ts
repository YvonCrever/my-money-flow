export interface RevenueEntry {
  id: string;
  date: string; // YYYY-MM-DD
  client: string;
  service: string;
  hourlyRate: number;
  hours: number;
  amount: number;
  month: number; // 0-11
  year: number;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  isRecurring: boolean;
  month: number;
  year: number;
}

export type ExpenseCategory =
  | 'Logement'
  | 'Transport'
  | 'Alimentation maison'
  | 'Alimentation extérieur'
  | 'Loisirs'
  | 'Abonnements'
  | 'Santé'
  | 'Autres';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Logement',
  'Transport',
  'Alimentation maison',
  'Alimentation extérieur',
  'Loisirs',
  'Abonnements',
  'Santé',
  'Autres',
];

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
