import type { CalendarLinkedMeta } from '@/types/calendar';

export interface Client {
  id: string;
  name: string;
  pseudo?: string;
  address: string;
  siren: string;
  email?: string;
}
export interface RevenueEntry {
  id: string;
  date: string; // YYYY-MM-DD
  client: string;
  service: string;
  unit: RevenueUnit;
  hourlyRate: number;
  hours: number;
  amount: number;
  month: number; // 0-11
  year: number;
  calendarMeta?: CalendarLinkedMeta;
}

export type RevenueUnit = 'heure' | 'journee' | 'piece';

export const REVENUE_UNITS: { value: RevenueUnit; label: string }[] = [
  { value: 'heure', label: 'Heure(s)' },
  { value: 'journee', label: 'Journée(s)' },
  { value: 'piece', label: 'Pièce(s)' },
];

export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  isRecurring: boolean;
  month: number;
  year: number;
  calendarMeta?: CalendarLinkedMeta;
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
