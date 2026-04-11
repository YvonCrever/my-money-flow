import type { CalendarLinkedMeta } from '@/types/calendar';

export const BOOK_CATEGORIES = [
  'Roman',
  'Nouvelle',
  'Essai',
  'Biographie & mémoires',
  'Histoire',
  'Poésie',
  'Théâtre',
  'Policier & thriller',
  'Science-fiction & fantasy',
  'Développement personnel',
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export interface ReadingEntry {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  rating: number;
  addedAt: string;
  calendarMeta?: CalendarLinkedMeta;
}
